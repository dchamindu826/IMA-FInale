const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getLeadType = (leadType) => {
    switch(parseInt(leadType)) {
        case 1: return 'FB Boost';
        case 2: return 'Opening Seminar Student';
        case 3: return 'New Student (After Seminar)';
        case 4: return 'Internal Inquiry';
        default: return 'Unknown';
    }
};

const addNewLead = async (req, res) => {
    try {
        const { leadType, business, batch, fName, lName, phone, secondaryPhone } = req.body;

        // Check if phone or secondary phone already exists
        const isExistingSecondaryPhone = await prisma.leads.findFirst({ where: { phone: secondaryPhone } });
        const isExistingPhonePhone = await prisma.leads.findFirst({ where: { secondaryPhone: phone } });

        if (isExistingSecondaryPhone) {
            return res.status(400).json({ message: 'The secondary phone has already been taken.' });
        }
        if (isExistingPhonePhone) {
            return res.status(400).json({ message: 'The phone has already been taken.' });
        }

        // Create new lead
        await prisma.leads.create({
            data: {
                leadType: getLeadType(leadType),
                business_id: business ? BigInt(business) : null,
                batch_id: batch ? BigInt(batch) : null,
                fName,
                lName,
                phone,
                secondaryPhone,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Lead added successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { addNewLead };
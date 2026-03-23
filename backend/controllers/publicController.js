const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

const getLandingPageData = async (req, res) => {
    try {
        // 1. මුලින්ම Active Businesses ටික ගන්නවා
        const businesses = await prisma.businesses.findMany({
            where: { status: 1 },
            orderBy: { created_at: 'asc' }
        });

        if (businesses.length === 0) return res.status(200).json({ businesses: [], topCourses: [] });

        const businessIds = businesses.map(b => b.id);

        // 2. ඒ Business වලට අදාළ Batches ටික ගන්නවා
        const batches = await prisma.batches.findMany({
            where: { status: 1, business_id: { in: businessIds } },
            orderBy: { created_at: 'desc' }
        });

        const batchIds = batches.map(ba => ba.id);

        // 3. Batches වලට අදාළ Groups ටික ගන්නවා
        const groups = await prisma.groups.findMany({
            where: { status: 1, batch_id: { in: batchIds } }
        });

        const groupIds = groups.map(g => g.id);

        // 4. ඒ Groups වල තියෙන Courses ගාණ Group_ID එකෙන් ගන්නවා
        const coursesCountByGroup = await prisma.courses.groupBy({
            by: ['group_id'],
            _count: { id: true },
            where: { group_id: { in: groupIds }, status: 1 }
        });

        // 5. Data Mapping (Businesses & Batches)
        const formattedBusinesses = businesses.map(b => {
            const businessBatches = batches.filter(ba => ba.business_id.toString() === b.id.toString());
            
            return {
                id: b.id.toString(),
                name: b.name,
                logo: b.logo,
                batches: businessBatches.map(ba => {
                    const batchGroups = groups.filter(g => g.batch_id.toString() === ba.id.toString());
                    let totalCourses = 0;
                    batchGroups.forEach(bg => {
                        const countObj = coursesCountByGroup.find(c => c.group_id.toString() === bg.id.toString());
                        if (countObj) totalCourses += countObj._count.id;
                    });

                    return {
                        id: ba.id.toString(),
                        name: ba.name,
                        description: ba.description,
                        logo: ba.logo,
                        courseCount: totalCourses 
                    };
                })
            };
        });

        // 6. 🔴 අලුත් කෑල්ල: Top Courses 6ක් ගන්නවා Home Page එකට 🔴
        const coursesList = await prisma.courses.findMany({
            where: { status: 1 },
            take: 6, // මුල් කෝස් 6 විතරයි
            orderBy: { created_at: 'desc' }
        });

        const formattedTopCourses = coursesList.map(c => ({
            id: c.id.toString(),
            name: c.name,
            description: c.description,
            price: c.price,
            discountedPrice: c.discountedPrice,
            stream: c.stream,
        }));

        // 7. Businesses සහ TopCourses දෙකම එකට යවනවා
        return res.status(200).json(safeJson({
            businesses: formattedBusinesses,
            topCourses: formattedTopCourses
        }));

    } catch (error) {
        console.error("Landing Page Data Error:", error);
        return res.status(500).json({ message: "Server Error: " + error.message });
    }
};

module.exports = { getLandingPageData };
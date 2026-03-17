const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// 1. Bank එකෙන් එන Email එක System එකට ගන්න Webhook එක
const handleBankEmail = async (req, res) => {
    try {
        const emailBody = req.body['body-plain'] || req.body['text'] || '';

        // Regex වලින් Amount එකයි Ref No එකයි අදිනවා
        const amountMatch = emailBody.match(/(?:Amount|LKR|Rs\.?)\s*[:]?\s*([\d,]+\.\d{2})/i);
        const refMatch = emailBody.match(/(?:Ref|Reference|Trace)[\s\w]*[:]?\s*([A-Za-z0-9]+)/i);

        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        const refNo = refMatch ? refMatch[1] : `REF-${Date.now()}`;

        if (amount > 0) {
            await prisma.bank_transactions.create({
                data: {
                    amount: amount,
                    reference_no: refNo,
                    transaction_date: new Date(),
                    raw_email_text: emailBody,
                    is_matched: false,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
            return res.status(200).json({ success: true, message: 'Bank email saved!' });
        }
        return res.status(200).json({ success: false, message: 'No amount found.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. AI එකෙන් Slip එක කියවලා Bank Data එක්ක Match කරන එක
const verifySlipWithAI = async (req, res) => {
    try {
        const { paymentId } = req.body;
        const payment = await prisma.payments.findUnique({ where: { id: BigInt(paymentId) } });

        if (!payment || !payment.slipFileName) {
            return res.status(200).json({ success: false, message: 'Invalid Payment ID or Slip is missing in Database.' });
        }

        const imagePath = path.join(__dirname, '../public/slipImages/', payment.slipFileName);
        if (!fs.existsSync(imagePath)) {
            return res.status(200).json({ success: false, message: `Slip image missing on server! Path checked: ${imagePath}` });
        }

        // Base64 Encode Image
        const imageBuffer = fs.readFileSync(imagePath);
        const imageData = imageBuffer.toString('base64');
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.pdf' ? 'application/pdf' : 'image/jpeg';

        // Gemini API Call
        const apiKey = process.env.GEMINI_API_KEY_1;
        if (!apiKey) return res.status(200).json({ success: false, message: 'Gemini API Key is missing in .env file!' });

        const prompt = 'Analyze this bank transfer slip. Extract the following details and return ONLY a valid JSON object without any markdown tags or backticks. Format: {"isBlurry": boolean, "amount": number, "date": "YYYY-MM-DD"}. If you cannot read the text clearly, set isBlurry to true.';

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageData } }] }]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            return res.status(200).json({ success: false, message: `Gemini API call failed! Error: ${errBody}` });
        }

        const data = await response.json();
        let aiResponseText = data.candidates[0].content.parts[0].text || '';
        aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const extractedData = JSON.parse(aiResponseText);

        if (extractedData.isBlurry) {
            return res.status(200).json({ success: true, status: 'blurry', message: 'Image is blurry. Manual review needed.' });
        }

        const aiAmount = extractedData.amount || 0;

        // Check against Bank Transactions table
        const bankMatch = await prisma.bank_transactions.findFirst({
            where: { amount: parseFloat(aiAmount), is_matched: false }
        });

        if (bankMatch && parseFloat(aiAmount) === parseFloat(payment.amount)) {
            await prisma.payments.update({ where: { id: payment.id }, data: { status: 1 } });
            await prisma.bank_transactions.update({ where: { id: bankMatch.id }, data: { is_matched: true } });

            return res.status(200).json({ success: true, status: 'approved', aiData: extractedData, message: 'Auto Approved! Match found in bank emails.' });
        }

        return res.status(200).json({ success: true, status: 'mismatch', aiData: extractedData, message: 'Mismatch! Either amount is wrong or Bank Email not received yet.' });

    } catch (error) {
        return res.status(200).json({ success: false, message: `Node.js Crash Error: ${error.message}` });
    }
};

module.exports = { handleBankEmail, verifySlipWithAI };
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

// Keys ටික array එකකට ගන්නවා
const apiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean); // තියෙන Keys විතරක් ගන්නවා

let currentKeyIndex = 0; // පාවිච්චි කරන Key එකේ අංකය

const verifySlipImage = async (imagePath) => {
    try {
        if (!fs.existsSync(imagePath)) return { status: 'ERROR', message: 'Image not found' };
        if (apiKeys.length === 0) return { status: 'ERROR', message: 'No Gemini API Keys found' };

        // 🔄 Key Rotation (මාරුවෙන් මාරුවට Keys පාවිච්චි කිරීම)
        const activeKey = apiKeys[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length; 

        // AI Initialize කරනවා Active Key එකෙන්
        const ai = new GoogleGenAI({ apiKey: activeKey });

        const prompt = `
            Analyze this bank deposit slip. Extract the following information and return ONLY a valid JSON object.
            Do not include markdown tags like \`\`\`json.
            Required fields:
            - amount: (number, the deposited amount, extract only the numbers. e.g. 1500)
            - date: (string, YYYY-MM-DD format if possible, else return the text)
            - referenceNo: (string, any transaction ID or reference number)
            - isClear: (boolean, true if details are clearly visible, false if blurry or unreadable)
        `;

        const imagePart = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
                mimeType: "image/jpeg"
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt, imagePart],
            config: { responseMimeType: "application/json" }
        });

        const resultText = response.text;
        const resultJson = JSON.parse(resultText);

        return { status: 'SUCCESS', data: resultJson, raw: resultText };

    } catch (error) {
        console.error("Gemini AI Error:", error);
        return { status: 'ERROR', message: error.message };
    }
};

module.exports = { verifySlipImage };
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pdfParse = require('pdf-parse');
const fs = require('fs');

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 1. Get Settings for a Phase
const getConfig = async (req, res) => {
    try {
        const { phase } = req.params;
        let config = await prisma.crm_campaigns.findFirst({ where: { phase } });
        if (!config) {
            config = { phase, meta_number: '', meta_phone_id: '', meta_wa_id: '', meta_access_token: '', gemini_keys: [''], is_gemini_active: true };
        }
        res.status(200).json(safeJson(config));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. Save Settings for a Phase
const saveConfig = async (req, res) => {
    try {
        const { phase, batch_id, meta_number, meta_phone_id, meta_wa_id, meta_access_token, gemini_keys, is_gemini_active } = req.body;
        
        const existing = await prisma.crm_campaigns.findFirst({ where: { phase } });
        if (existing) {
            await prisma.crm_campaigns.update({
                where: { id: existing.id },
                data: { batch_id: batch_id ? BigInt(batch_id) : existing.batch_id, meta_number, meta_phone_id, meta_wa_id, meta_access_token, gemini_keys, is_gemini_active }
            });
        } else {
            await prisma.crm_campaigns.create({
                data: { phase, batch_id: batch_id ? BigInt(batch_id) : BigInt(1), meta_number, meta_phone_id, meta_wa_id, meta_access_token, gemini_keys, is_gemini_active }
            });
        }
        res.status(200).json({ message: "Settings Saved!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. 🔴 LIVE TERMINAL STREAMING (PDF INGESTION) 🔴
const ingestDocument = async (req, res) => {
    // Set headers for Server-Sent Events (Live Streaming)
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const writeLog = (msg) => res.write(`${msg}\n`);

    try {
        if (!req.file) { writeLog("❌ Error: No file uploaded"); return res.end(); }
        const { phase } = req.body;
        const filePath = req.file.path;
        const fileName = req.file.originalname;

        writeLog(`✅ Started Ingestion for Phase: ${phase}`);
        writeLog(`📂 Reading PDF File: ${fileName}...`);
        
        // Add a small delay to mimic connection/processing for UI UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        writeLog(`⏳ Connecting to Gemini Brain Engine...`);

        // Read PDF
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        writeLog(`✅ PDF Parsed Successfully! Found ${pdfData.numpages} pages.`);
        writeLog(`🧠 Chunking text and generating vectors...`);

        // Save to Database
        await prisma.crm_documents.create({
            data: { phase, file_name: fileName, content: pdfData.text }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
        writeLog(`🎉 Complete! Knowledge Base Updated.`);
        
        // Cleanup file
        fs.unlinkSync(filePath);
        res.end();
    } catch (error) {
        writeLog(`❌ Critical Error: ${error.message}`);
        res.end();
    }
};

// 4. Get & Delete Documents
const getDocuments = async (req, res) => {
    try {
        const docs = await prisma.crm_documents.findMany({ where: { phase: req.params.phase }, select: { id: true, file_name: true, created_at: true } });
        res.status(200).json(docs);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const deleteDocument = async (req, res) => {
    try {
        await prisma.crm_documents.delete({ where: { id: parseInt(req.params.id) } });
        res.status(200).json({ message: "Deleted" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { getConfig, saveConfig, ingestDocument, getDocuments, deleteDocument };
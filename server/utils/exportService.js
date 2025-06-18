// server/utils/exportService.js

const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, TextRun } = require("docx");
const logger = require("../utils/logger");

const textToParagraphs = (text) => {
    return text
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            new Paragraph({
                children: [
                    new TextRun({ text: line, font: "Arial", size: 16 }),
                ],
                spacing: { after: 120 },
            });
        });
};

const exportTranscriptionToFile = async (transcription, format) => {
    const allowedFormats = ["txt", "pdf", "docx"];
    const paragraphs = textToParagraphs(transcription.transcription);

    if (!allowedFormats.includes(format)) {
        throw { status: 400, message: "Unsupported Format!" };
    }

    let buffer, mime, fileExt;

    if (format === "txt") {
        buffer = Buffer.from(transcription.transcription, "utf8");
        mime = "text/plain";
        fileExt = "txt";
    } else if (format === "pdf") {
        buffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            doc.text(transcription.transcription);
            doc.end();
        });

        mime = "application/pdf";
        fileExt = "pdf";
    } else if (format === "docx") {
        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children:
                        paragraphs.length > 0
                            ? paragraphs
                            : [new Paragraph("No Contetnt.")],
                },
            ],
        });
        buffer = await Packer.toBuffer(doc);
        mime =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        fileExt = "docx";
    }

    const MAX_FILENAME_LEN = 50;
    const rawName = transcription.file_name
        ? transcription.file_name
        : "transcript";
    const rawId = transcription.transcript_id
        ? transcription.transcript_id
        : Date.now();

    const safeFileName = rawName
        .replace(/\.[^/.]+$/, "")
        .replace(/[^\w\-]+/g, "_")
        .substring(0, MAX_FILENAME_LEN);

    const fileName = `${safeFileName}-${rawId}.${fileExt}`;

    return { buffer, mime, fileName };
};

module.exports = {
    exportTranscriptionToFile,
};

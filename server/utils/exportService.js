// server/utils/exportService.js

const PDFDocument = require("pdfkit");
const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    LineRuleType,
    Packer,
    PageNumber,
    Paragraph,
    TextRun,
} = require("docx");
const logger = require("../utils/logger");

const DOCX_BODY_LINE_SPACING = 360;
const DOCX_PARAGRAPH_AFTER = 220;
const DOCX_SPEAKER_LABEL_AFTER = 120;
const DOCX_SPEAKER_BLOCK_AFTER = 320;

const getRawExportName = (transcription) => {
    return (
        transcription.original_file_name ||
        transcription.display_name ||
        transcription.file_name ||
        transcription.title ||
        "transcript"
    );
};

const stripFileExtension = (value) =>
    String(value || "").replace(/\.[A-Za-z0-9]{1,8}$/, "");

const cleanPdfTitle = (value) => {
    const cleaned = stripFileExtension(value)
        .replace(/_Recorded\(/g, " Recorded (")
        .replace(/_Transcribed\(/g, " Transcribed (")
        .replace(/_/g, " ")
        .replace(/[\x00-\x1f\x7f]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

    return cleaned || "Transcription Export";
};

const cleanExportName = (value) => {
    const cleaned = stripFileExtension(value)
        .replace(/[<>:"/\\|?*\x00-\x1f\x7f]+/g, "-")
        .replace(/\s+/g, "_")
        .replace(/-+/g, "-")
        .replace(/_+/g, "_")
        .replace(/^[ ._-]+|[ ._-]+$/g, "")
        .trim();

    return cleaned || "transcript";
};

const getExportBaseName = (transcription) => {
    return cleanExportName(getRawExportName(transcription)).substring(0, 120);
};

const getPdfTitle = (transcription) => {
    return cleanPdfTitle(getRawExportName(transcription));
};

const parseTranscriptLine = (line) => {
    const match = line.match(/^([^:\n]{1,40}):\s*(.*)$/);
    if (!match) return null;

    return {
        speaker: match[1].trim(),
        text: match[2].trim(),
    };
};

const ensurePdfSpace = (doc, requiredHeight = 72) => {
    const bottomLimit = doc.page.height - doc.page.margins.bottom;

    if (doc.y + requiredHeight > bottomLimit) {
        doc.addPage();
    }
};

const renderPdfHeader = (doc, title) => {
    doc.font("Helvetica")
        .fontSize(12)
        .text(title, {
            width:
                doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });

    doc.moveDown(0.4);
    doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor("#cccccc")
        .stroke();

    doc.fillColor("#000000");
    doc.moveDown(1);
};

const renderTranscriptPdf = (doc, transcription) => {
    const title = getPdfTitle(transcription);

    doc.on("pageAdded", () => {
        renderPdfHeader(doc, title);
    });

    renderPdfHeader(doc, title);

    const lines = String(transcription.transcription || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        doc.font("Helvetica").fontSize(11).text("No content.");
        return;
    }

    const speakerX = doc.page.margins.left;
    const textX = doc.page.margins.left + 110;
    const textWidth = doc.page.width - doc.page.margins.right - textX;

    lines.forEach((line) => {
        const parsed = parseTranscriptLine(line);

        ensurePdfSpace(doc);

        if (parsed) {
            const startY = doc.y;

            doc.font("Helvetica-Bold")
                .fontSize(11)
                .text(`${parsed.speaker}:`, speakerX, startY, {
                    width: 110,
                    continued: false,
                });

            doc.font("Helvetica")
                .fontSize(11)
                .text(parsed.text, textX, startY, {
                    width: textWidth,
                    align: "justify",
                    lineGap: 3,
                    paragraphGap: 0,
                });

            doc.moveDown(1);
            return;
        }

        doc.font("Helvetica").fontSize(11).text(line, textX, doc.y, {
            width: textWidth,
            align: "justify",
            lineGap: 3,
        });

        doc.moveDown(1);
    });
};

const renderPdfPageNumbers = (doc) => {
    const range = doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);

        const pageNumber = i - range.start + 1;
        const label = `${pageNumber}`;
        const x = doc.page.margins.left;
        const y = doc.page.height - 48;
        const width =
            doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const originalBottomMargin = doc.page.margins.bottom;

        doc.page.margins.bottom = 30;
        doc.font("Helvetica")
            .fontSize(9)
            .fillColor("#666666")
            .text(label, x, y, {
                width,
                align: "right",
                lineBreak: false,
            });
        doc.page.margins.bottom = originalBottomMargin;
    }

    doc.fillColor("#000000");
};

const createDocxHeader = (title) => {
    return new Header({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: title,
                        font: "Arial",
                        size: 24,
                    }),
                ],
                spacing: { after: 360 },
                border: {
                    bottom: {
                        color: "CCCCCC",
                        size: 6,
                        style: BorderStyle.SINGLE,
                    },
                },
            }),
        ],
    });
};

const createDocxFooter = () => {
    return new Footer({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        children: [PageNumber.CURRENT],
                        font: "Arial",
                        size: 18,
                        color: "666666",
                    }),
                ],
                alignment: AlignmentType.RIGHT,
            }),
        ],
    });
};

const createDocxTextParagraph = ({
    text,
    bold = false,
    alignment = AlignmentType.LEFT,
    spacingAfter = DOCX_PARAGRAPH_AFTER,
}) => {
    return new Paragraph({
        children: [
            new TextRun({
                text,
                bold,
                font: "Arial",
                size: 22,
            }),
        ],
        alignment,
        spacing: {
            after: spacingAfter,
            line: DOCX_BODY_LINE_SPACING,
            lineRule: LineRuleType.AUTO,
        },
    });
};

const buildDocxChildren = (transcription) => {
    const lines = String(transcription.transcription || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return [
            createDocxTextParagraph({
                text: "No content.",
                spacingAfter: 0,
            }),
        ];
    }

    return lines.flatMap((line) => {
        const parsed = parseTranscriptLine(line);

        if (parsed) {
            return [
                createDocxTextParagraph({
                    text: `${parsed.speaker}:`,
                    bold: true,
                    spacingAfter: DOCX_SPEAKER_LABEL_AFTER,
                }),
                createDocxTextParagraph({
                    text: parsed.text,
                    alignment: AlignmentType.JUSTIFIED,
                    spacingAfter: DOCX_SPEAKER_BLOCK_AFTER,
                }),
            ];
        }

        return [
            createDocxTextParagraph({
                text: line,
                alignment: AlignmentType.JUSTIFIED,
            }),
        ];
    });
};

const createTranscriptDocx = (transcription) => {
    const title = getPdfTitle(transcription);

    return new Document({
        sections: [
            {
                headers: {
                    default: createDocxHeader(title),
                },
                footers: {
                    default: createDocxFooter(),
                },
                properties: {
                    page: {
                        margin: {
                            top: 900,
                            right: 720,
                            bottom: 1180,
                            left: 720,
                            header: 360,
                            footer: 360,
                        },
                    },
                },
                children: buildDocxChildren(transcription),
            },
        ],
    });
};

const renderTranscriptTxt = (transcription) => {
    const title = getPdfTitle(transcription);
    const lines = String(transcription.transcription || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const output = [title, "=".repeat(title.length), ""];

    if (lines.length === 0) {
        output.push("No content.");
        return output.join("\n");
    }

    lines.forEach((line, index) => {
        const parsed = parseTranscriptLine(line);

        if (parsed) {
            output.push(`** ${parsed.speaker}: **`);
            output.push("");
            output.push(`    ${parsed.text}`);
        } else {
            output.push(line);
        }

        if (index < lines.length - 1) {
            output.push("");
        }
    });

    return output.join("\n");
};

const exportTranscriptionToFile = async (transcription, format) => {
    const allowedFormats = ["txt", "pdf", "docx"];

    if (!allowedFormats.includes(format)) {
        throw { status: 400, message: "Unsupported Format!" };
    }

    let buffer, mime, fileExt;

    if (format === "txt") {
        buffer = Buffer.from(renderTranscriptTxt(transcription), "utf8");
        mime = "text/plain";
        fileExt = "txt";
    } else if (format === "pdf") {
        buffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: "A4",
                bufferPages: true,
                margins: {
                    top: 50,
                    bottom: 82,
                    left: 50,
                    right: 50,
                },
            });

            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            renderTranscriptPdf(doc, transcription);
            renderPdfPageNumbers(doc);

            doc.end();
        });

        mime = "application/pdf";
        fileExt = "pdf";
    } else if (format === "docx") {
        const doc = createTranscriptDocx(transcription);
        buffer = await Packer.toBuffer(doc);
        mime =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        fileExt = "docx";
    }

    const fileName = `${getExportBaseName(transcription)}.${fileExt}`;

    return { buffer, mime, fileName };
};

module.exports = {
    exportTranscriptionToFile,
};

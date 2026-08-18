import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { saveFile, readFileStream, fileExists } from "../services/storage.js";
import { createDownloadToken, verifyDownloadToken } from "../services/downloadTokens.js";
import { suggestDocuments } from "../rules.js";

export const attachmentsRouter = Router();

// Phase 1 upload scope (design doc §4.6): medical-record-style documents only.
// Phase 2 (images/photos as a distinct workflow) is a future, separately
// activated scope — expanding this allow-list is the extent of that change.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

attachmentsRouter.post("/reports/:reportId/attachments", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      const message =
        err.message === "UNSUPPORTED_FILE_TYPE"
          ? "That file type isn't supported. Please upload a PDF, JPEG, PNG, or Word document."
          : "Upload failed. The file may be too large (15 MB max).";
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const report = await prisma.report.findUnique({ where: { id: req.params.reportId } });
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (report.status === "submitted") {
      return res.status(409).json({ error: "Report has already been submitted" });
    }

    const storedFilename = await saveFile(req.file.buffer, req.file.originalname);
    const attachment = await prisma.attachment.create({
      data: {
        reportId: report.id,
        originalFilename: req.file.originalname,
        storedFilename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });

    res.status(201).json({
      id: attachment.id,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedAt: attachment.uploadedAt,
    });
  });
});

attachmentsRouter.get("/reports/:reportId/attachments", async (req, res) => {
  const attachments = await prisma.attachment.findMany({
    where: { reportId: req.params.reportId },
    orderBy: { uploadedAt: "asc" },
  });
  res.json(
    attachments.map((a) => ({
      id: a.id,
      originalFilename: a.originalFilename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedAt: a.uploadedAt,
    }))
  );
});

attachmentsRouter.delete("/attachments/:attachmentId", async (req, res) => {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.attachmentId } });
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });
  await prisma.attachment.delete({ where: { id: attachment.id } });
  res.status(204).end();
});

// Short-lived download token, mirroring the doc's SAS-token concept (§6.5).
attachmentsRouter.get("/attachments/:attachmentId/download-token", async (req, res) => {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.attachmentId } });
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });
  res.json({ token: createDownloadToken(attachment.id) });
});

attachmentsRouter.get("/attachments/:attachmentId/download", async (req, res) => {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.attachmentId } });
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });

  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!verifyDownloadToken(token, attachment.id)) {
    return res.status(403).json({ error: "Invalid or expired download link" });
  }
  if (!(await fileExists(attachment.storedFilename))) {
    return res.status(404).json({ error: "File is no longer available" });
  }

  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFilename}"`);
  readFileStream(attachment.storedFilename).pipe(res);
});

attachmentsRouter.get("/reports/:reportId/document-suggestions", async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.reportId },
    include: { errorDetail: true, adverseEvent: true },
  });
  if (!report) return res.status(404).json({ error: "Report not found" });

  const suggestions = suggestDocuments({
    submitterType: (report.submitterType as "public" | "hcp" | null) ?? "public",
    reportCharacteristic: report.reportCharacteristic as "adverse_event" | "error_no_ae" | null,
    errorType: report.errorDetail?.errorType ?? undefined,
    outcomes: report.adverseEvent?.outcomes ? JSON.parse(report.adverseEvent.outcomes) : [],
  });
  res.json(suggestions);
});

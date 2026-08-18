/**
 * File storage abstraction (design doc §3.3: Blob Storage w/ SAS tokens).
 * Local dev writes to disk under UPLOAD_DIR. This is the single swap point
 * for a real deployment: replace the implementations below with an
 * S3-compatible/Render Disk client and nothing outside this file needs to
 * change. See README "Deploying to Render" for why this matters there.
 */
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads");

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveFile(buffer: Buffer, originalFilename: string): Promise<string> {
  await ensureUploadDir();
  const ext = path.extname(originalFilename);
  const storedFilename = `${randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, storedFilename);
  await writeFile(fullPath, buffer);
  return storedFilename;
}

export function pathForStoredFile(storedFilename: string): string {
  return path.join(UPLOAD_DIR, storedFilename);
}

export async function fileExists(storedFilename: string): Promise<boolean> {
  try {
    await stat(pathForStoredFile(storedFilename));
    return true;
  } catch {
    return false;
  }
}

export function readFileStream(storedFilename: string) {
  return createReadStream(pathForStoredFile(storedFilename));
}

export async function deleteFile(storedFilename: string): Promise<void> {
  try {
    await unlink(pathForStoredFile(storedFilename));
  } catch {
    // best-effort cleanup; missing file is not an error for our purposes
  }
}

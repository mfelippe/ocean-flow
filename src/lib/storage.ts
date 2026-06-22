import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

/** Limite de tamanho por arquivo (bytes). Casa com o bodySizeLimit do Next. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

function uploadDir(): string {
  return resolve(process.env.UPLOAD_DIR || "uploads");
}

/** Impede path traversal: usa apenas o basename do nome armazenado. */
function safePath(storedName: string): string {
  return join(uploadDir(), basename(storedName));
}

/** Grava o arquivo em disco e devolve o nome de armazenamento (uuid + ext). */
export async function saveUpload(
  file: File,
): Promise<{ storedName: string; size: number }> {
  await mkdir(uploadDir(), { recursive: true });
  const ext = extname(file.name).slice(0, 12).replace(/[^.\w]/g, "");
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(safePath(storedName), buffer);
  return { storedName, size: buffer.length };
}

export async function readUpload(storedName: string): Promise<Buffer> {
  return readFile(safePath(storedName));
}

export async function deleteUpload(storedName: string): Promise<void> {
  await unlink(safePath(storedName)).catch(() => {
    // arquivo já ausente — ignora
  });
}

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const getStoreFilePath = (fileName: string) => {
  return resolve(process.cwd(), ".data", fileName);
};

export const readStoreFile = <T>(fileName: string, fallback: T): T => {
  try {
    const path = getStoreFilePath(fileName);
    if (!existsSync(path)) {
      return fallback;
    }

    const text = readFileSync(path, "utf8");
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

// Async write — does NOT block the event loop.
// Debounced: if multiple writes fire within 100ms, only the last one persists.
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

export const writeStoreFile = (fileName: string, value: unknown) => {
  const existing = pendingWrites.get(fileName);
  if (existing) clearTimeout(existing);

  pendingWrites.set(
    fileName,
    setTimeout(() => {
      pendingWrites.delete(fileName);
      const path = getStoreFilePath(fileName);
      mkdirSync(dirname(path), { recursive: true });
      void writeFile(path, JSON.stringify(value, null, 2), "utf8").catch(() => {});
    }, 100),
  );
};

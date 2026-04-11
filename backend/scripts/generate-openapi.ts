import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenApiDocument } from "../src/modules/docs/openapi";

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, "..");
const outputPath = resolve(backendRoot, "openapi.json");

const document = createOpenApiDocument("/");

writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

console.log(`Generated ${outputPath}`);

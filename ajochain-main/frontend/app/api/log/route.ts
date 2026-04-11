import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Reads the agent's reasoning.log.json — adjust path to match your monorepo layout
const LOG_PATH = path.join(process.cwd(), "../agent/reasoning.log.json");

export async function GET() {
  try {
    const raw  = fs.readFileSync(LOG_PATH, "utf8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}

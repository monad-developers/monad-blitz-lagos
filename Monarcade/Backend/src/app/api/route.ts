import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Welcome to the API, you are not supposed to be here btw :)" });
}

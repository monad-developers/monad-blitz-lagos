import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { addCorsHeaders, jsonCreated } from "@/lib/http";
import { withRoute } from "@/lib/route-handler";
import { uploadToPinata } from "@/services/pinata";

export const runtime = "nodejs";

export const POST = withRoute(
  async (request) => {
    const form = await request.formData();
    const fileValue = form.get("file");

    if (!(fileValue instanceof File)) {
      throw new ValidationError("file is required");
    }

    const file = fileValue;

    if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
      throw new ValidationError("Unsupported file type");
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError("File too large. Max size is 2MB");
    }

    const logoPath = await uploadToPinata(file);

    return jsonCreated({ logoPath });
  },
  {
    auth: true,
    namespace: "upload",
    rateLimit: 20,
  },
);

export const OPTIONS = async (request: NextRequest) => {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
};

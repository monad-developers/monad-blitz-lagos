import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

const pinataUploadUrl = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export const uploadToPinata = async (file: File) => {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(pinataUploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PINATA_JWT}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, "PINATA_UPLOAD_FAILED", "Pinata upload failed", {
      status: response.status,
      body: text,
    });
  }

  const json = (await response.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) {
    throw new AppError(502, "PINATA_RESPONSE_INVALID", "Pinata response missing hash");
  }

  return `${env.NEXT_PUBLIC_PINATA_GATEWAY_URL.replace(/\/$/, "")}/ipfs/${json.IpfsHash}`;
};

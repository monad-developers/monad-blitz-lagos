import { ValidationError } from "@/lib/errors";

const SCRIPT_TAG_RE = /<\s*script/gi;

export const sanitizeText = (value: string, field: string, maxLength: number) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${field} is required`);
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be <= ${maxLength} characters`);
  }

  if (SCRIPT_TAG_RE.test(trimmed)) {
    throw new ValidationError(`${field} contains unsafe content`);
  }

  return trimmed;
};

export const sanitizeHexHash = (value: string, field: string) => {
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new ValidationError(`${field} must be a bytes32 hex string`);
  }

  return trimmed as `0x${string}`;
};

export const sanitizeAddress = (value: string, field: string) => {
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new ValidationError(`${field} must be a valid EVM address`);
  }

  return trimmed as `0x${string}`;
};

export const sanitizeUrl = (value: string, field: string) => {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (!/^https?:$/.test(url.protocol)) {
      throw new ValidationError(`${field} must use http/https`);
    }

    return trimmed;
  } catch {
    throw new ValidationError(`${field} must be a valid URL`);
  }
};

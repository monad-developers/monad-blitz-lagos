import { BaseError, decodeErrorResult } from "viem";
import { monarchadeAbi } from "@/lib/contract/abi";

/**
 * Parses viem/contract errors into user-friendly messages.
 * Handles contract reverts, insufficient funds, nonce errors, and rejections.
 */
export function parseContractError(err: unknown): string {
  if (err instanceof BaseError) {
    // Try to decode a contract revert reason from the ABI
    const revertData = (err as BaseError & { data?: `0x${string}` }).data;
    if (revertData && revertData !== "0x") {
      try {
        const decoded = decodeErrorResult({ abi: monarchadeAbi, data: revertData });
        return `Contract error: ${decoded.errorName}`;
      } catch {
        // ABI decoding failed, fall through
      }
    }

    const msg = err.shortMessage || err.message;
    const lower = msg.toLowerCase();

    if (lower.includes("user rejected") || lower.includes("user denied")) {
      return "Transaction rejected by user";
    }

    if (lower.includes("insufficient funds") || lower.includes("exceeds the balance")) {
      return "Insufficient MON balance for this transaction";
    }

    if (lower.includes("nonce")) {
      return "Transaction nonce error. Please try again.";
    }

    if (lower.includes("reverted")) {
      return msg;
    }

    return err.shortMessage || err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "An unknown error occurred";
}

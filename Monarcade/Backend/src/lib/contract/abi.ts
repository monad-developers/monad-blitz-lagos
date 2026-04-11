import type { Abi } from "viem";
import rawAbi from "./monarchade.abi.json";

if (!Array.isArray(rawAbi)) {
  throw new Error("Invalid monarchade.abi.json format. Expected ABI array");
}

export const monarchadeAbi = rawAbi as Abi;

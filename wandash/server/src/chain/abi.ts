export const GIVEAWAY_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "id", type: "bytes32" }],
    name: "giveaways",
    outputs: [
      { internalType: "address", name: "host", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "prize", type: "uint256" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
      { internalType: "uint8", name: "winners", type: "uint8" },
      { internalType: "uint8", name: "status", type: "uint8" },
      { internalType: "bytes32", name: "metadata", type: "bytes32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "id", type: "bytes32" },
      { internalType: "address[]", name: "winners", type: "address[]" },
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "finalizeWinners",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "id", type: "bytes32" },
      { indexed: false, internalType: "bytes32", name: "resultHash", type: "bytes32" },
    ],
    name: "ResultCommitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "id", type: "bytes32" },
    ],
    name: "WinnersFinalized",
    type: "event",
  },
] as const

import {
  MONAD_TESTNET,
  SUPPORTED_TOKENS,
  ZERO_ADDRESS,
  type PaymentRule,
  type PreparedTransaction,
} from "@paypilot/shared";
import { encodeFunctionData, formatUnits, isAddress, parseUnits } from "viem";
import { erc20Abi, publicClient } from "../../lib/monad";

type PreparedExecution = {
  request: {
    to: `0x${string}`;
    value: bigint;
    data?: `0x${string}`;
  };
  summary: PreparedTransaction;
};

function getKnownTokenDecimals(rule: PaymentRule) {
  const defaultToken = SUPPORTED_TOKENS[rule.tokenSymbol.toUpperCase() as keyof typeof SUPPORTED_TOKENS];
  return defaultToken?.decimals ?? 18;
}

async function getTokenDecimals(rule: PaymentRule) {
  if (rule.tokenSymbol.toUpperCase() === "MON" || rule.tokenAddress === ZERO_ADDRESS) {
    return MONAD_TESTNET.nativeCurrency.decimals;
  }

  if (!rule.tokenAddress || !isAddress(rule.tokenAddress)) {
    throw new Error(`A valid ${rule.tokenSymbol} token address is required before this rule can run.`);
  }

  const rawDecimals =
    (await publicClient
      .readContract({
        address: rule.tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
      })
      .catch(() => getKnownTokenDecimals(rule))) ?? getKnownTokenDecimals(rule);

  return Number(rawDecimals);
}

export async function getRuleBalance(userAddress: string, rule: PaymentRule) {
  if (!isAddress(userAddress)) {
    throw new Error("A valid sender wallet address is required to evaluate this rule.");
  }

  if (rule.tokenSymbol.toUpperCase() === "MON" || rule.tokenAddress === ZERO_ADDRESS) {
    const balance = await publicClient.getBalance({
      address: userAddress,
    });

    return {
      raw: balance,
      decimals: MONAD_TESTNET.nativeCurrency.decimals,
      formatted: formatUnits(balance, MONAD_TESTNET.nativeCurrency.decimals),
    };
  }

  if (!rule.tokenAddress || !isAddress(rule.tokenAddress)) {
    throw new Error(`A valid ${rule.tokenSymbol} token address is required before this rule can run.`);
  }

  const decimals = await getTokenDecimals(rule);

  const balance = await publicClient.readContract({
    address: rule.tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress as `0x${string}`],
  });

  return {
    raw: balance,
    decimals,
    formatted: formatUnits(balance, decimals),
  };
}

export async function prepareRuleTransaction(rule: PaymentRule): Promise<PreparedExecution> {
  if (!rule.recipientAddress || !isAddress(rule.recipientAddress)) {
    throw new Error("Add a valid recipient address before running this rule.");
  }

  const decimals = await getTokenDecimals(rule);
  const parsedAmount = parseUnits(rule.amount, decimals);

  if (rule.tokenSymbol.toUpperCase() === "MON" || rule.tokenAddress === ZERO_ADDRESS) {
    return {
      request: {
        to: rule.recipientAddress as `0x${string}`,
        value: parsedAmount,
      },
      summary: {
        to: rule.recipientAddress as `0x${string}`,
        value: parsedAmount.toString(),
        chainId: MONAD_TESTNET.id,
        description: `Send ${rule.amount} MON to ${rule.recipientAddress}`,
      },
    };
  }

  if (!rule.tokenAddress || !isAddress(rule.tokenAddress)) {
    throw new Error(`A valid ${rule.tokenSymbol} contract address is required before this rule can run.`);
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [rule.recipientAddress as `0x${string}`, parsedAmount],
  });

  return {
    request: {
      to: rule.tokenAddress as `0x${string}`,
      value: 0n,
      data,
    },
    summary: {
      to: rule.tokenAddress as `0x${string}`,
      value: "0",
      data,
      chainId: MONAD_TESTNET.id,
      description: `Transfer ${rule.amount} ${rule.tokenSymbol} to ${rule.recipientAddress}`,
    },
  };
}

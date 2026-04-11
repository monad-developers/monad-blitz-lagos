import {
  MONAD_TESTNET,
  SUPPORTED_TOKENS,
  ZERO_ADDRESS,
  type PaymentRule,
  type PreparedTransaction,
} from "../../shared";
import { encodeFunctionData, formatUnits, isAddress, parseUnits, toBytes, keccak256 } from "viem";
import { autoPayAgentAbi, erc20Abi, publicClient } from "../../lib/monad";
import { env } from "../../config/env";

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

  if (!rule.amount || rule.amount === "0" || parseFloat(rule.amount) === 0) {
    throw new Error("Rule amount must be greater than 0. Check that the amount was correctly parsed from your prompt.");
  }

  const autoPayAgentAddress = env.AUTO_PAY_AGENT_ADDRESS;
  if (!autoPayAgentAddress || !isAddress(autoPayAgentAddress)) {
    throw new Error("AutoPayAgent contract address is not configured. Set AUTO_PAY_AGENT_ADDRESS in .env");
  }

  const decimals = await getTokenDecimals(rule);
  const parsedAmount = parseUnits(rule.amount, decimals);
  
  console.log("Transaction Preparation Debug:", {
    ruleName: rule.name,
    tokenSymbol: rule.tokenSymbol,
    tokenAddress: rule.tokenAddress,
    amount: rule.amount,
    decimals,
    parsedAmountBigInt: parsedAmount.toString(),
    recipientAddress: rule.recipientAddress,
  });
  
  // Convert rule UUID to bytes32 by hashing it
  const ruleIdBytes32 = keccak256(toBytes(rule.id));

  // Native MON payment - call executeNativePayment
  if (rule.tokenSymbol.toUpperCase() === "MON" || rule.tokenAddress === ZERO_ADDRESS) {
    const data = encodeFunctionData({
      abi: autoPayAgentAbi,
      functionName: "executeNativePayment",
      args: [ruleIdBytes32, rule.recipientAddress as `0x${string}`],
    });

    return {
      request: {
        to: autoPayAgentAddress as `0x${string}`,
        value: parsedAmount,
        data,
      },
      summary: {
        to: autoPayAgentAddress as `0x${string}`,
        value: parsedAmount.toString(),
        data,
        chainId: MONAD_TESTNET.id,
        description: `Send ${rule.amount} MON to ${rule.recipientAddress} via AutoPayAgent`,
      },
    };
  }

  // ERC20 token payment - call executeTokenPayment
  if (!rule.tokenAddress || !isAddress(rule.tokenAddress)) {
    throw new Error(`A valid ${rule.tokenSymbol} contract address is required before this rule can run.`);
  }

  const data = encodeFunctionData({
    abi: autoPayAgentAbi,
    functionName: "executeTokenPayment",
    args: [
      ruleIdBytes32,
      rule.tokenAddress as `0x${string}`,
      rule.recipientAddress as `0x${string}`,
      parsedAmount,
    ],
  });

  return {
    request: {
      to: autoPayAgentAddress as `0x${string}`,
      value: 0n,
      data,
    },
    summary: {
      to: autoPayAgentAddress as `0x${string}`,
      value: "0",
      data,
      chainId: MONAD_TESTNET.id,
      description: `Transfer ${rule.amount} ${rule.tokenSymbol} to ${rule.recipientAddress} via AutoPayAgent`,
    },
  };
}

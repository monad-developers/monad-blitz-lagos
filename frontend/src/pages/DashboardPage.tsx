import type { PaymentRule, ParsedRuleDraft } from "@paypilot/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { AppShell } from "../components/common/AppShell";
import { CreateRuleForm } from "../components/forms/CreateRuleForm";
import { RuleList } from "../components/rules/RuleList";
import { RulePreviewCard } from "../components/rules/RulePreviewCard";
import { useRules } from "../hooks/useRules";
import { monadTestnet } from "../lib/wagmi";
import { api } from "../services/api";
import type { RuleRunState } from "../types/ui";

export function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { rulesQuery, saveRuleMutation, activateRuleMutation } = useRules();
  const [previewRule, setPreviewRule] = useState<ParsedRuleDraft | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [runStates, setRunStates] = useState<Record<string, RuleRunState>>({});

  const parseRuleMutation = useMutation({
    mutationFn: (prompt: string) => {
      const payload = {
        prompt,
        userAddress: address,
      };
      console.log("Parse Rule Payload:", payload);
      return api.parseRule(payload);
    },
    onSuccess: (response) => {
      setPreviewRule(response.rule);
      setParseError(null);
    },
    onError: (error) => {
      setParseError(error instanceof Error ? error.message : "Failed to parse rule");
    },
  });

  async function handleParse(prompt: string) {
    setParseError(null);
    await parseRuleMutation.mutateAsync(prompt);
  }

  async function handleSaveRule() {
    if (!previewRule) {
      return;
    }

    const ruleToSave = {
      ...previewRule,
      userAddress: address || previewRule.userAddress,
    };

    await saveRuleMutation.mutateAsync(ruleToSave);
    setPreviewRule(null);
    setParseError(null);
  }

  async function handleActivate(ruleId: string) {
    await activateRuleMutation.mutateAsync(ruleId);
  }

  async function handleSimulate(rule: PaymentRule) {
    setRunStates((current) => ({
      ...current,
      [rule.id]: {
        status: "running",
        message: "Checking rule conditions on Monad testnet...",
      },
    }));

    try {
      const result = await api.runRule(rule.id, {
        mode: "simulate",
        userAddress: address,
      });

      setRunStates((current) => ({
        ...current,
        [rule.id]: {
          status: result.canExecute ? "simulated" : "error",
          message: result.reason || "Simulation finished.",
          result,
        },
      }));
    } catch (error) {
      setRunStates((current) => ({
        ...current,
        [rule.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "Simulation failed.",
        },
      }));
    }
  }

  async function handleRun(rule: PaymentRule) {
    setRunStates((current) => ({
      ...current,
      [rule.id]: {
        status: "running",
        message: "Preparing transaction from the backend...",
      },
    }));

    try {
      const prepared = await api.runRule(rule.id, {
        mode: "prepare",
        userAddress: address,
      });

      if (!prepared.canExecute || !prepared.transaction) {
        setRunStates((current) => ({
          ...current,
          [rule.id]: {
            status: "error",
            message: prepared.reason || "Rule is not ready to run.",
            result: prepared,
          },
        }));
        return;
      }

      if (!walletClient || !address || !isAddress(address)) {
        setRunStates((current) => ({
          ...current,
          [rule.id]: {
            status: "error",
            message: "Connect a Monad-compatible browser wallet to submit the prepared transaction.",
            result: prepared,
          },
        }));
        return;
      }

      setRunStates((current) => ({
        ...current,
        [rule.id]: {
          status: "running",
          message: "Waiting for wallet signature...",
        },
      }));

      const txHash = await walletClient.sendTransaction({
        to: prepared.transaction.to as `0x${string}`,
        value: prepared.transaction.value ? BigInt(prepared.transaction.value) : 0n,
        data: prepared.transaction.data as `0x${string}` | undefined,
      });

      console.log("Transaction submitted:", txHash);

      setRunStates((current) => ({
        ...current,
        [rule.id]: {
          status: "success",
          message: `Transaction submitted! Hash: ${txHash}`,
          txHash,
          result: prepared,
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Transaction submission failed.";
      console.error("Transaction error:", error);
      
      setRunStates((current) => ({
        ...current,
        [rule.id]: {
          status: "error",
          message: errorMessage,
        },
      }));
    }
  }

  return (
    <AppShell
      title="Build, review, and run payment rules"
      subtitle="The backend parses the prompt, the dashboard stores the rule, and the wallet signs the final transaction when you choose to run it."
    >
      <CreateRuleForm
        isParsing={parseRuleMutation.isPending}
        isConnected={isConnected}
        onParse={handleParse}
      />

      {parseError ? (
        <article className="panel" style={{ background: "rgba(255, 125, 112, 0.12)", borderColor: "rgba(255, 125, 112, 0.2)" }}>
          <p style={{ color: "var(--danger)", marginTop: 0 }}>
            <strong>Error parsing rule:</strong> {parseError}
          </p>
        </article>
      ) : null}

      {previewRule ? (
        <RulePreviewCard
          rule={previewRule}
          isSaving={saveRuleMutation.isPending}
          onSave={handleSaveRule}
        />
      ) : null}

      <RuleList
        rules={rulesQuery.data?.rules ?? []}
        userAddress={address}
        isConnected={isConnected}
        pendingRuleId={
          activateRuleMutation.isPending && activateRuleMutation.variables
            ? activateRuleMutation.variables
            : undefined
        }
        runStates={runStates}
        onActivate={handleActivate}
        onSimulate={handleSimulate}
        onRun={handleRun}
      />
    </AppShell>
  );
}

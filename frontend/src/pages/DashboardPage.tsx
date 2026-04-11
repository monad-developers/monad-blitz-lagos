import type { PaymentRule, ParsedRuleDraft } from "@paypilot/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { AppShell } from "../components/common/AppShell";
import { CreateRuleForm } from "../components/forms/CreateRuleForm";
import { RuleList } from "../components/rules/RuleList";
import { RulePreviewCard } from "../components/rules/RulePreviewCard";
import { WalletPanel } from "../components/wallet/WalletPanel";
import { useRules } from "../hooks/useRules";
import { monadTestnet } from "../lib/wagmi";
import { api } from "../services/api";
import type { RuleRunState } from "../types/ui";

export function DashboardPage() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { rulesQuery, saveRuleMutation, activateRuleMutation } = useRules();
  const [previewRule, setPreviewRule] = useState<ParsedRuleDraft | null>(null);
  const [runStates, setRunStates] = useState<Record<string, RuleRunState>>({});

  const parseRuleMutation = useMutation({
    mutationFn: (prompt: string) =>
      api.parseRule({
        prompt,
        userAddress: address,
      }),
    onSuccess: (response) => {
      setPreviewRule(response.rule);
    },
  });

  async function handleParse(prompt: string) {
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

      const txHash = await walletClient.sendTransaction({
        account: address,
        chain: monadTestnet,
        to: prepared.transaction.to,
        value: BigInt(prepared.transaction.value),
        data: prepared.transaction.data,
      });

      setRunStates((current) => ({
        ...current,
        [rule.id]: {
          status: "success",
          message: prepared.reason || "Transaction submitted from your wallet.",
          txHash,
          result: prepared,
        },
      }));
    } catch (error) {
      setRunStates((current) => ({
        ...current,
        [rule.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "Transaction submission failed.",
        },
      }));
    }
  }

  return (
    <AppShell
      title="Build, review, and run payment rules"
      subtitle="The backend parses the prompt, the dashboard stores the rule, and the wallet signs the final transaction when you choose to run it."
    >
      <WalletPanel />
      <CreateRuleForm
        walletAddress={address}
        isParsing={parseRuleMutation.isPending}
        onParse={handleParse}
      />

      {previewRule ? (
        <RulePreviewCard
          rule={previewRule}
          isSaving={saveRuleMutation.isPending}
          onSave={handleSaveRule}
        />
      ) : null}

      <RuleList
        rules={rulesQuery.data?.rules ?? []}
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

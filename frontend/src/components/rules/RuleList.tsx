import type { PaymentRule } from "../../shared";
import type { RuleRunState } from "../../types/ui";

type RuleListProps = {
  rules: PaymentRule[];
  userAddress?: string;
  isConnected: boolean;
  pendingRuleId?: string;
  runStates: Record<string, RuleRunState>;
  onActivate: (ruleId: string) => Promise<void>;
  onSimulate: (rule: PaymentRule) => Promise<void>;
  onRun: (rule: PaymentRule) => Promise<void>;
};

function statusLabel(rule: PaymentRule) {
  return rule.status.replace("_", " ");
}

export function RuleList({
  rules,
  userAddress,
  isConnected,
  pendingRuleId,
  runStates,
  onActivate,
  onSimulate,
  onRun,
}: RuleListProps) {
  // Filter rules by connected wallet address
  const filteredRules = userAddress ? rules.filter((rule) => rule.userAddress === userAddress) : rules;

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Rule List</p>
          <h2>Saved payment automations</h2>
        </div>
        <span className="badge badge-muted">{filteredRules.length} total</span>
      </div>

      {!isConnected ? (
        <div className="empty-state">
          <h3>Connect your wallet</h3>
          <p>Connect a Monad-compatible wallet to view and manage your payment rules.</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="empty-state">
          <h3>No rules yet</h3>
          <p>Parse and save your first prompt to start testing flows on Monad testnet.</p>
        </div>
      ) : null}

      <div className="rule-list">
        {filteredRules.map((rule) => {
          const runState = runStates[rule.id];

          return (
            <div className="rule-card" key={rule.id}>
              <div className="rule-card-header">
                <div>
                  <h3>{rule.name}</h3>
                  <p>{rule.rawPrompt}</p>
                </div>
                <span className={`badge ${rule.status === "active" ? "badge-success" : "badge-muted"}`}>
                  {statusLabel(rule)}
                </span>
              </div>

              <div className="detail-grid">
                <div>
                  <span>Recipient</span>
                  <strong>{rule.recipientAddress || "Missing"}</strong>
                </div>
                <div>
                  <span>Asset</span>
                  <strong>
                    {rule.amount} {rule.tokenSymbol}
                  </strong>
                </div>
                <div>
                  <span>Schedule</span>
                  <strong>
                    {rule.scheduleType}
                    {rule.scheduleValue ? ` • ${rule.scheduleValue}` : ""}
                  </strong>
                </div>
                <div>
                  <span>Condition</span>
                  <strong>
                    {rule.conditionType}
                    {rule.conditionValue ? ` • ${rule.conditionValue}` : ""}
                  </strong>
                </div>
              </div>

              <div className="rule-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={pendingRuleId === rule.id || rule.status === "active"}
                  onClick={() => onActivate(rule.id)}
                >
                  {pendingRuleId === rule.id ? "Updating..." : rule.status === "active" ? "Active" : "Activate"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={runState?.status === "running"}
                  onClick={() => onSimulate(rule)}
                >
                  Simulate
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={runState?.status === "running"}
                  onClick={() => onRun(rule)}
                >
                  {runState?.status === "running" ? "Running..." : "Run now"}
                </button>
              </div>

              {runState && runState.status !== "idle" ? (
                <div
                  className={`execution-state ${
                    runState.status === "error" ? "execution-state-error" : "execution-state-success"
                  }`}
                >
                  <strong>
                    {runState.status === "simulated"
                      ? "Simulation ready"
                      : runState.status === "success"
                        ? "Transaction submitted"
                        : runState.status === "running"
                          ? "Preparing"
                          : "Run failed"}
                  </strong>
                  <p>{runState.message}</p>
                  {runState.txHash ? <code>{runState.txHash}</code> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

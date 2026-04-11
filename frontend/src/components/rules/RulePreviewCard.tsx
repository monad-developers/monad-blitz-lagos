import type { ParsedRuleDraft } from "@paypilot/shared";

type RulePreviewCardProps = {
  rule: ParsedRuleDraft;
  isSaving: boolean;
  onSave: () => Promise<void>;
};

export function RulePreviewCard({ rule, isSaving, onSave }: RulePreviewCardProps) {
  return (
    <article className="panel preview-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Parsed Preview</p>
          <h2>{rule.name}</h2>
        </div>
        <span className={`badge ${rule.needsCompletion ? "badge-warning" : "badge-success"}`}>
          {rule.needsCompletion ? "Needs completion" : "Ready to save"}
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <span>Recipient</span>
          <strong>{rule.recipientAddress || "Missing wallet address"}</strong>
        </div>
        <div>
          <span>Token</span>
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

      {rule.notes.length > 0 ? (
        <div className="inline-note">
          <strong>Parser notes</strong>
          <ul>
            {rule.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rule.missingFields.length > 0 ? (
        <p className="warning-text">Missing fields: {rule.missingFields.join(", ")}</p>
      ) : null}

      <div className="form-footer">
        <p className="form-hint">Saving keeps the rule in draft mode until you activate it from the dashboard.</p>
        <button type="button" className="primary-button" disabled={isSaving} onClick={onSave}>
          {isSaving ? "Saving..." : "Save rule"}
        </button>
      </div>
    </article>
  );
}

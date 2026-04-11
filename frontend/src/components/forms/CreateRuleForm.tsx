import { useState } from "react";

type CreateRuleFormProps = {
  walletAddress?: string;
  isParsing: boolean;
  onParse: (prompt: string) => Promise<void>;
};

const SAMPLE_PROMPTS = [
  "Send 1 USDC to 0x1111111111111111111111111111111111111111 every Friday if my balance is above 20 USDC",
  "Send 10 MON to savings every month",
  "Pay 2 USDC to this wallet when my balance exceeds 50 USDC",
];

export function CreateRuleForm({ walletAddress, isParsing, onParse }: CreateRuleFormProps) {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Create Rule</p>
          <h2>Describe the payment in plain English</h2>
        </div>
        <span className="badge badge-muted">{walletAddress ? "Wallet ready" : "Wallet optional"}</span>
      </div>

      <label className="field">
        <span>Natural-language instruction</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          placeholder="Send 1 USDC to David every Friday if my balance is above 20 USDC"
        />
      </label>

      <div className="chip-row">
        {SAMPLE_PROMPTS.map((sample) => (
          <button
            key={sample}
            type="button"
            className="chip-button"
            onClick={() => setPrompt(sample)}
          >
            {sample}
          </button>
        ))}
      </div>

      <div className="form-footer">
        <p className="form-hint">
          PayPilot parses the rule into structured JSON first, so you can preview it before saving or running anything.
        </p>
        <button
          type="button"
          className="primary-button"
          disabled={isParsing || !prompt.trim()}
          onClick={() => onParse(prompt)}
        >
          {isParsing ? "Parsing..." : "Parse rule"}
        </button>
      </div>
    </article>
  );
}

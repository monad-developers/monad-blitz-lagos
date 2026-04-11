import { useState } from "react";

type CreateRuleFormProps = {
  isParsing: boolean;
  isConnected: boolean;
  onParse: (prompt: string) => Promise<void>;
};

export function CreateRuleForm({ isParsing, isConnected, onParse }: CreateRuleFormProps) {
  const [prompt, setPrompt] = useState("");

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <h2>Create Payment Rule</h2>
          <p>Describe the payment in plain English</p>
        </div>
      </div>

      <label className="field">
        <span>Payment instruction</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          placeholder="e.g., Send 10 USDC to 0x... every Friday if balance > 20 USDC"
        />
      </label>

      <div className="form-footer">
        <button
          type="button"
          className="primary-button"
          disabled={isParsing || !prompt.trim() || !isConnected}
          title={!isConnected ? "Connect your wallet to parse rules" : ""}
          onClick={() => onParse(prompt)}
        >
          {isParsing ? "Parsing..." : "Parse Rule"}
        </button>
      </div>
    </article>
  );
}

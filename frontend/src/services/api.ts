import type {
  ActivateRuleResponse,
  GetRuleResponse,
  ListRulesResponse,
  ParseRuleRequest,
  ParseRuleResponse,
  PaymentRule,
  RunRuleRequest,
  RunRuleResponse,
  SaveRuleResponse,
} from "@paypilot/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  parseRule(input: ParseRuleRequest) {
    return request<ParseRuleResponse>("/ai/parse-rule", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  listRules() {
    return request<ListRulesResponse>("/rules");
  },
  getRule(id: string) {
    return request<GetRuleResponse>(`/rules/${id}`);
  },
  saveRule(rule: PaymentRule) {
    return request<SaveRuleResponse>("/rules", {
      method: "POST",
      body: JSON.stringify({ rule }),
    });
  },
  activateRule(id: string) {
    return request<ActivateRuleResponse>(`/rules/${id}/activate`, {
      method: "POST",
    });
  },
  runRule(id: string, payload: RunRuleRequest) {
    return request<RunRuleResponse>(`/rules/${id}/run`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

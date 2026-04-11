import type { PaymentRule } from "../shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export function useRules() {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["rules"],
    queryFn: () => api.listRules(),
  });

  const saveRuleMutation = useMutation({
    mutationFn: (rule: PaymentRule) => api.saveRule(rule),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });

  const activateRuleMutation = useMutation({
    mutationFn: (ruleId: string) => api.activateRule(ruleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });

  return {
    rulesQuery,
    saveRuleMutation,
    activateRuleMutation,
  };
}

export const RULE_STATUSES = [
  "draft",
  "active",
  "paused",
  "executed",
  "failed",
] as const;

export const EXECUTION_STATUSES = [
  "pending",
  "simulated",
  "prepared",
  "success",
  "failed",
] as const;

export const SCHEDULE_TYPES = [
  "one_time",
  "daily",
  "weekly",
  "monthly",
] as const;

export const CONDITION_TYPES = ["balance_gt", "always"] as const;

export const RUN_MODES = ["simulate", "prepare", "execute"] as const;

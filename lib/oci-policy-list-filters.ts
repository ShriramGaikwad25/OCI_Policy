import type { PolicyListFilters, PolicyListItem } from "@/types/oci-policy";

export const EMPTY_POLICY_LIST_FILTERS: PolicyListFilters = {
  risk: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

function parseFilterDate(value: string): number | null {
  if (!value.trim()) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? null : time;
}

function policyFilterDate(policy: PolicyListItem): number | null {
  const raw = policy.createdOn || policy.lastModified;
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
}

export function collectPolicyStatusOptions(policies: PolicyListItem[]): string[] {
  const statuses = new Set<string>();
  for (const policy of policies) {
    if (policy.status) statuses.add(policy.status);
  }
  return Array.from(statuses).sort((a, b) => a.localeCompare(b));
}

export function applyPolicyListFilters(
  policies: PolicyListItem[],
  filters: PolicyListFilters
): PolicyListItem[] {
  const fromTime = parseFilterDate(filters.dateFrom);
  const toTime = parseFilterDate(filters.dateTo);

  return policies.filter((policy) => {
    if (filters.risk && policy.risk !== filters.risk) return false;
    if (filters.status && policy.status !== filters.status) return false;

    if (fromTime != null || toTime != null) {
      const policyTime = policyFilterDate(policy);
      if (policyTime == null) return false;
      if (fromTime != null && policyTime < fromTime) return false;
      if (toTime != null && policyTime > toTime + 86_399_999) return false;
    }

    return true;
  });
}

export function hasActivePolicyListFilters(filters: PolicyListFilters): boolean {
  return Boolean(filters.risk || filters.status || filters.dateFrom || filters.dateTo);
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  buildPolicyListUrl,
  fetchPolicyList,
  isPolicyListApiConfigured,
} from "@/lib/policy-list-api";
import type { PolicyListAnalytics, PolicyListItem, OciTenancy } from "@/types/oci-policy";

export type PolicyListResponse = {
  configured: boolean;
  policies: PolicyListItem[];
  tenancyId: string | null;
  tenancyName: string | null;
  tenancies: OciTenancy[];
  analytics: PolicyListAnalytics | null;
};

async function fetchPolicies(tenancyId?: string | null): Promise<PolicyListResponse> {
  const result = await fetchPolicyList(undefined, tenancyId);
  return {
    configured: isPolicyListApiConfigured(),
    policies: result.policies.map((policy) => ({
      ...policy,
      statements: policy.statements ?? [],
    })),
    tenancyId: result.tenancyId,
    tenancyName: result.tenancyName,
    tenancies: result.tenancies,
    analytics: result.analytics,
  };
}

export function useOciPolicyList(tenancyId?: string | null) {
  const normalizedTenancyId = tenancyId?.trim() || null;

  return useQuery({
    queryKey: ["oci-policies", buildPolicyListUrl(normalizedTenancyId), "v6"],
    queryFn: () => fetchPolicies(normalizedTenancyId),
    staleTime: 30_000,
  });
}

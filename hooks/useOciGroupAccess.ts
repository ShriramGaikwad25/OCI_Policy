"use client";

import { useQuery } from "@tanstack/react-query";
import {
  buildGroupAccessUrl,
  fetchOciGroupAccessDetail,
  fetchOciGroupAccessList,
  isGroupsApiConfigured,
} from "@/lib/group-access-api";
import type { OciGroupAccessDetail, OciGroupAccessSummary } from "@/types/oci-group";

export type OciGroupAccessListResponse = {
  configured: boolean;
  groups: OciGroupAccessSummary[];
};

async function fetchGroupAccessList(tenancyId?: string | null): Promise<OciGroupAccessListResponse> {
  const result = await fetchOciGroupAccessList(undefined, tenancyId);
  return {
    configured: isGroupsApiConfigured(),
    groups: result.groups,
  };
}

export function useOciGroupAccessList(tenancyId?: string | null) {
  const normalizedTenancyId = tenancyId?.trim() || null;

  return useQuery({
    queryKey: ["oci-group-access", buildGroupAccessUrl(normalizedTenancyId)],
    queryFn: () => fetchGroupAccessList(normalizedTenancyId),
    staleTime: 30_000,
  });
}

export type OciGroupAccessDetailResponse = {
  configured: boolean;
  group: OciGroupAccessDetail;
};

async function fetchGroupAccessDetail(
  groupName: string,
  tenancyId?: string | null
): Promise<OciGroupAccessDetailResponse> {
  const group = await fetchOciGroupAccessDetail(groupName, undefined, tenancyId);
  return {
    configured: isGroupsApiConfigured(),
    group,
  };
}

export function useOciGroupAccessDetail(groupName: string, tenancyId?: string | null) {
  const normalizedGroupName = groupName.trim();
  const normalizedTenancyId = tenancyId?.trim() || null;

  return useQuery({
    queryKey: [
      "oci-group-access-detail",
      normalizedGroupName,
      buildGroupAccessUrl(normalizedTenancyId, normalizedGroupName),
    ],
    queryFn: () => fetchGroupAccessDetail(normalizedGroupName, normalizedTenancyId),
    enabled: Boolean(normalizedGroupName),
    staleTime: 30_000,
  });
}

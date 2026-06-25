import type {
  OciGroup,
  OciGroupAccessDetail,
  OciGroupAccessListResult,
  OciGroupAccessSummary,
  OciGroupMember,
  OciGroupResource,
  OciGroupStatement,
  OciGroupsResult,
} from "@/types/oci-group";

/** KeyForge OCI groups endpoint (ACMECOM tenant). */
export const GROUPS_API_URL =
  "https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/groups";

/** KeyForge OCI group access endpoint (ACMECOM tenant). */
export const GROUPS_ACCESS_API_URL =
  "https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/groups/access";

export function isGroupsApiConfigured(): boolean {
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOptionalString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function parseApiError(text: string, status: number, statusText: string): string {
  if (!text.trim()) {
    return `Groups API request failed (${status} ${statusText})`;
  }
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const message = body.message ?? body.error ?? body.statusMessage;
    if (typeof message === "string" && message.trim()) return message.trim();
  } catch {
    // not JSON
  }
  return text;
}

function isGroupLikeRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return Boolean(
    readOptionalString(value, "name", "groupName", "group_name", "displayName", "display_name") ||
      readOptionalString(value, "id", "groupId", "group_id", "ocid")
  );
}

function normalizeGroupMap(value: Record<string, unknown>): unknown[] {
  return Object.entries(value).map(([key, item]) => {
    if (typeof item === "string" && item.trim()) {
      return { name: item.trim(), id: key };
    }
    if (!isRecord(item)) return item;
    const group = { ...item };
    if (!readOptionalString(group, "name", "groupName", "group_name", "displayName")) {
      group.name = key;
    }
    return group;
  });
}

function readOptionalNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readNestedArray(record: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function countFromRecord(record: Record<string, unknown>, arrayKeys: string[], countKeys: string[]): number {
  const explicit = readOptionalNumber(record, ...countKeys);
  if (explicit != null) return explicit;
  for (const key of arrayKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

function parseMemberItem(item: unknown, index: number): OciGroupMember | null {
  if (typeof item === "string") {
    const name = item.trim();
    if (!name) return null;
    return { id: `member-${index}-${name}`, name };
  }
  if (!isRecord(item)) return null;

  const name =
    readOptionalString(item, "name", "displayName", "userName", "username", "memberName") ?? "";
  if (!name) return null;

  const id =
    readOptionalString(
      item,
      "userOcid",
      "user_ocid",
      "id",
      "userId",
      "user_id",
      "ocid",
      "memberId",
      "member_id"
    ) ?? `member-${index}-${name}`;

  const email = readOptionalString(item, "email", "emailAddress", "mail");
  const type = readOptionalString(item, "type", "memberType", "userType", "kind");
  const status = readOptionalString(item, "status", "lifecycleState", "state");

  return {
    id,
    name,
    ...(email ? { email } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  };
}

function parseStatementItem(item: unknown, index: number): OciGroupStatement | null {
  if (typeof item === "string") {
    const statement = item.trim();
    if (!statement) return null;
    return { id: `statement-${index}`, statement };
  }
  if (!isRecord(item)) return null;

  const statement =
    readOptionalString(
      item,
      "statement",
      "text",
      "raw",
      "statementText",
      "statement_text",
      "fullText"
    ) ?? "";
  const policyName = readOptionalString(item, "policyName", "policy", "policy_name");
  const verb = readOptionalString(item, "verb", "action");
  const resource = readOptionalString(item, "resource", "resourceType", "resource_type");
  const compartment = readOptionalString(item, "compartment", "compartmentName", "compartment_name");
  const condition = readOptionalString(item, "condition", "whereClause", "where");

  if (!statement && !policyName && !verb && !resource) return null;

  const id =
    readOptionalString(item, "ref", "policyId", "policy_id", "id", "statementId", "statement_id") ??
    `statement-${index}`;

  return {
    id,
    ...(policyName ? { policyName } : {}),
    ...(statement ? { statement } : {}),
    ...(verb ? { verb } : {}),
    ...(resource ? { resource } : {}),
    ...(compartment ? { compartment } : {}),
    ...(condition ? { condition } : {}),
  };
}

function parseResourceItem(
  item: unknown,
  index: number,
  compartmentName?: string
): OciGroupResource | null {
  if (typeof item === "string") {
    const name = item.trim();
    if (!name) return null;
    return { id: `resource-${index}-${name}`, name };
  }
  if (!isRecord(item)) return null;

  const name =
    readOptionalString(item, "displayName", "display_name", "name", "resourceName", "resource_name") ??
    "";
  if (!name) return null;

  const id =
    readOptionalString(
      item,
      "identifier",
      "id",
      "resourceId",
      "resource_id",
      "ocid",
      "resourceOcid"
    ) ?? `resource-${index}-${name}`;

  const resourceType = readOptionalString(item, "resourceType", "resource_type", "type");
  const compartment =
    compartmentName ??
    readOptionalString(item, "compartmentName", "compartment_name", "compartment", "compartmentId", "compartment_id");
  const lifecycleState = readOptionalString(
    item,
    "lifecycleState",
    "lifecycle_state",
    "status",
    "state"
  );

  return {
    id,
    name,
    ...(resourceType ? { resourceType } : {}),
    ...(compartment ? { compartment } : {}),
    ...(lifecycleState ? { lifecycleState } : {}),
  };
}

function parseMembers(record: Record<string, unknown>): OciGroupMember[] {
  return readNestedArray(record, "members", "users", "groupMembers", "group_members", "memberList")
    .map((item, index) => parseMemberItem(item, index))
    .filter((item): item is OciGroupMember => item !== null);
}

function parseStatements(record: Record<string, unknown>): OciGroupStatement[] {
  return readNestedArray(
    record,
    "statements",
    "policyStatements",
    "policy_statements",
    "grants",
    "accessStatements",
    "access_statements"
  )
    .map((item, index) => parseStatementItem(item, index))
    .filter((item): item is OciGroupStatement => item !== null);
}

function parseResourcesFromCompartments(compartments: unknown[]): OciGroupResource[] {
  const resources: OciGroupResource[] = [];

  for (const compartmentEntry of compartments) {
    if (!isRecord(compartmentEntry)) continue;

    const compartmentName = readOptionalString(
      compartmentEntry,
      "compartmentName",
      "compartment_name",
      "name"
    );

    for (const [index, resourceItem] of readNestedArray(compartmentEntry, "resources").entries()) {
      const parsed = parseResourceItem(resourceItem, resources.length + index, compartmentName);
      if (parsed) resources.push(parsed);
    }
  }

  return resources;
}

function parseResources(record: Record<string, unknown>): OciGroupResource[] {
  const resourcesValue = record.resources;

  if (Array.isArray(resourcesValue)) {
    return resourcesValue
      .map((item, index) => parseResourceItem(item, index))
      .filter((item): item is OciGroupResource => item !== null);
  }

  if (isRecord(resourcesValue)) {
    const fromCompartments = parseResourcesFromCompartments(
      readNestedArray(resourcesValue, "compartments")
    );
    if (fromCompartments.length > 0) return fromCompartments;
  }

  return readNestedArray(record, "resourceItems", "resource_items", "items")
    .map((item, index) => parseResourceItem(item, index))
    .filter((item): item is OciGroupResource => item !== null);
}

function readNestedResourceCount(record: Record<string, unknown>): number | undefined {
  const resourcesValue = record.resources;
  if (!isRecord(resourcesValue)) return undefined;
  return readOptionalNumber(resourcesValue, "resourceCount", "resource_count", "count");
}

function parseGroupAccessRecord(item: unknown, index: number): OciGroupAccessDetail | null {
  if (!isRecord(item)) return null;

  const nestedGroup = isRecord(item.group) ? item.group : null;
  const metadataSource = nestedGroup ?? item;

  const name =
    readOptionalString(
      metadataSource,
      "name",
      "groupName",
      "group_name",
      "displayName",
      "display_name"
    ) ?? "";
  if (!name) return null;

  const id =
    readOptionalString(
      metadataSource,
      "ocid",
      "id",
      "groupId",
      "group_id",
      "groupOcid",
      "group_ocid"
    ) ?? name;

  const description = readOptionalString(metadataSource, "description", "groupDescription");
  const members = parseMembers(item);
  const statements = parseStatements(item);
  const resources = parseResources(item);

  const memberCount =
    readOptionalNumber(
      metadataSource,
      "memberCount",
      "member_count",
      "membersCount",
      "members_count",
      "userCount",
      "user_count"
    ) ??
    countFromRecord(
      item,
      ["members", "users", "groupMembers", "group_members", "memberList"],
      []
    );
  const statementCount = countFromRecord(
    item,
    ["statements", "policyStatements", "policy_statements", "grants", "accessStatements"],
    [
      "statementCount",
      "statement_count",
      "statementsCount",
      "statements_count",
      "grantCount",
      "grant_count",
    ]
  );
  const nestedResourceCount = readNestedResourceCount(item);
  const resourceCount =
    nestedResourceCount ??
    countFromRecord(
      item,
      ["resources", "resourceItems", "resource_items", "items"],
      [
        "resourceCount",
        "resource_count",
        "resourcesCount",
        "resources_count",
        "totalResources",
        "total_resources",
      ]
    );

  return {
    id,
    name,
    ...(description ? { description } : {}),
    memberCount: members.length > 0 ? members.length : memberCount,
    statementCount: statements.length > 0 ? statements.length : statementCount,
    resourceCount: resources.length > 0 ? resources.length : resourceCount,
    members,
    statements,
    resources,
  };
}

function mergeGroupAccessByName(groups: OciGroupAccessDetail[]): OciGroupAccessDetail[] {
  const seen = new Map<string, OciGroupAccessDetail>();
  for (const group of groups) {
    const key = group.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, group);
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function extractGroupAccessArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  for (const key of ["groups", "groupAccess", "group_access", "data", "items", "results", "rows"]) {
    const value = payload[key];
    if (Array.isArray(value) && value.length > 0) return value;
    if (isRecord(value)) {
      const mapped = normalizeGroupMap(value);
      if (mapped.length > 0) return mapped;
    }
  }

  if (isGroupLikeRecord(payload)) return [payload];

  const groupLikeEntries = Object.entries(payload).filter(([, value]) => isGroupLikeRecord(value));
  if (groupLikeEntries.length > 0) {
    return normalizeGroupMap(Object.fromEntries(groupLikeEntries));
  }

  return [];
}

export function parseGroupAccessListResponse(payload: unknown): OciGroupAccessListResult {
  if (!payload || (typeof payload !== "object" && !Array.isArray(payload))) {
    throw new Error("Group access API returned an unexpected response");
  }

  const groups = mergeGroupAccessByName(
    extractGroupAccessArray(payload)
      .map((item, index) => parseGroupAccessRecord(item, index))
      .filter((item): item is OciGroupAccessDetail => item !== null)
  ).map(
    (group): OciGroupAccessSummary => ({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.memberCount,
      statementCount: group.statementCount,
      resourceCount: group.resourceCount,
    })
  );

  return { groups };
}

export function parseGroupAccessDetailResponse(
  payload: unknown,
  groupName: string
): OciGroupAccessDetail | null {
  const normalizedName = groupName.trim().toLowerCase();
  const groups = mergeGroupAccessByName(
    extractGroupAccessArray(payload)
      .map((item, index) => parseGroupAccessRecord(item, index))
      .filter((item): item is OciGroupAccessDetail => item !== null)
  );

  const match =
    groups.find((group) => group.name.toLowerCase() === normalizedName) ??
    groups.find((group) => group.id.toLowerCase() === normalizedName) ??
    (groups.length === 1 ? groups[0] : null);

  return match ?? null;
}

export function buildGroupAccessUrl(
  tenancyId?: string | null,
  groupName?: string | null
): string {
  const url = new URL(GROUPS_ACCESS_API_URL);
  const id = tenancyId?.trim();
  if (id) url.searchParams.set("tenancyId", id);
  const group = groupName?.trim();
  if (group) url.searchParams.set("groupName", group);
  return url.toString();
}

async function fetchGroupAccessPayload(
  bearerToken: string | null | undefined,
  tenancyId?: string | null,
  groupName?: string | null
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = bearerToken?.trim() || process.env.POLICY_OPTIMIZATION_API_KEY?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildGroupAccessUrl(tenancyId, groupName), {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(parseApiError(text, res.status, res.statusText)) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  return (await res.json()) as unknown;
}

export async function fetchOciGroupAccessList(
  bearerToken?: string | null,
  tenancyId?: string | null
): Promise<OciGroupAccessListResult> {
  const payload = await fetchGroupAccessPayload(bearerToken, tenancyId);
  return parseGroupAccessListResponse(payload);
}

export async function fetchOciGroupAccessDetail(
  groupName: string,
  bearerToken?: string | null,
  tenancyId?: string | null
): Promise<OciGroupAccessDetail> {
  const trimmedName = groupName.trim();
  if (!trimmedName) {
    throw new Error("Group name is required");
  }

  const filteredPayload = await fetchGroupAccessPayload(bearerToken, tenancyId, trimmedName);
  const filtered = parseGroupAccessDetailResponse(filteredPayload, trimmedName);
  if (filtered) return filtered;

  const listPayload = await fetchGroupAccessPayload(bearerToken, tenancyId);
  const fromList = parseGroupAccessDetailResponse(listPayload, trimmedName);
  if (fromList) return fromList;

  throw new Error(`Group "${trimmedName}" was not found in the access API response`);
}

function extractGroupsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (!isRecord(payload)) return [];

  for (const key of ["groups", "data", "items", "results", "rows"]) {
    const value = payload[key];
    if (Array.isArray(value) && value.length > 0) return value;
    if (isRecord(value)) {
      const mapped = normalizeGroupMap(value);
      if (mapped.length > 0) return mapped;
    }
  }

  const groupLikeEntries = Object.entries(payload).filter(([, value]) => isGroupLikeRecord(value));
  if (groupLikeEntries.length > 0) {
    return normalizeGroupMap(Object.fromEntries(groupLikeEntries));
  }

  return [];
}

function parseGroupItem(item: unknown, index: number): OciGroup | null {
  if (typeof item === "string") {
    const name = item.trim();
    if (!name) return null;
    return { id: `group-${index}-${name}`, name };
  }

  if (!isRecord(item)) return null;

  const source = isRecord(item.group) ? item.group : item;

  const name =
    readOptionalString(source, "name", "groupName", "group_name", "displayName", "display_name") ??
    "";
  if (!name) return null;

  const id =
    readOptionalString(source, "ocid", "id", "groupId", "group_id", "groupOcid", "group_ocid") ??
    name;

  const description = readOptionalString(source, "description", "groupDescription");

  return {
    id,
    name,
    ...(description ? { description } : {}),
  };
}

function mergeGroupsByName(groups: OciGroup[]): OciGroup[] {
  const seen = new Map<string, OciGroup>();
  for (const group of groups) {
    const key = group.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, group);
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export function parseGroupsResponse(payload: unknown): OciGroupsResult {
  if (!payload || (typeof payload !== "object" && !Array.isArray(payload))) {
    throw new Error("Groups API returned an unexpected response");
  }

  const groups = mergeGroupsByName(
    extractGroupsArray(payload)
      .map((item, index) => parseGroupItem(item, index))
      .filter((item): item is OciGroup => item !== null)
  );

  return { groups };
}

export function buildGroupsUrl(tenancyId?: string | null): string {
  const url = new URL(GROUPS_API_URL);
  const id = tenancyId?.trim();
  if (id) url.searchParams.set("tenancyId", id);
  return url.toString();
}

export async function fetchOciGroups(
  bearerToken?: string | null,
  tenancyId?: string | null
): Promise<OciGroupsResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = bearerToken?.trim() || process.env.POLICY_OPTIMIZATION_API_KEY?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildGroupsUrl(tenancyId), {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(parseApiError(text, res.status, res.statusText)) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  const payload = (await res.json()) as unknown;
  return parseGroupsResponse(payload);
}

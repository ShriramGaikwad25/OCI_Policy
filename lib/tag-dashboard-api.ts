import type {
  TagDashboardResult,
  TagDashboardSummary,
  TagDashboardTagRow,
  TagDashboardTagsView,
} from "@/types/oci-policy";

/** KeyForge OCI tag dashboard summary endpoint (ACMECOM tenant). */
export const TAG_DASHBOARD_SUMMARY_API_URL =
  "https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/tag-dashboard/summary";

/** KeyForge OCI tag dashboard tags endpoint (ACMECOM tenant). */
export const TAG_DASHBOARD_TAGS_API_URL =
  "https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/tag-dashboard/tags";

/** KeyForge OCI tag dashboard load endpoint (ACMECOM tenant). */
export const TAG_DASHBOARD_LOAD_API_URL =
  "https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/tag-dashboard/load";

const SUMMARY_METADATA_KEYS = new Set([
  "tenancyId",
  "tenancyName",
  "timestamp",
  "error",
  "message",
  "status",
]);

const PREFERRED_SUMMARY_ORDER = [
  "policiesScanned",
  "policiesWithTags",
  "policiesWithoutTags",
  "totalTags",
  "uniqueTagKeys",
  "tagNamespaces",
  "taggedStatements",
  "untaggedStatements",
  "taggedResources",
  "untaggedResources",
  "violations",
  "findings",
  "grantsAnalyzed",
  "duplicates",
  "redundant",
] as const;

export function isTagDashboardApiConfigured(): boolean {
  return true;
}

function parseApiError(text: string, status: number, statusText: string): string {
  if (!text.trim()) {
    return `Tag dashboard API request failed (${status} ${statusText})`;
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

function humanizeSummaryKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function summaryAccentForKey(key: string, index: number): string {
  const normalized = key.toLowerCase();
  if (
    normalized.includes("violation") ||
    normalized.includes("finding") ||
    normalized.includes("without")
  ) {
    return "text-red-700";
  }
  if (normalized.includes("untagged") || normalized.includes("redundant")) {
    return "text-amber-700";
  }
  if (normalized.includes("tagged") || normalized.includes("duplicate")) {
    return "text-blue-700";
  }

  const accents = [
    "text-gray-900",
    "text-blue-700",
    "text-amber-700",
    "text-orange-700",
    "text-green-700",
    "text-purple-700",
  ];
  return accents[index % accents.length];
}

function extractSummary(record: Record<string, unknown>): TagDashboardSummary | null {
  const rawSummary = record.summary;
  if (rawSummary && typeof rawSummary === "object" && !Array.isArray(rawSummary)) {
    const summary: TagDashboardSummary = {};
    for (const [key, value] of Object.entries(rawSummary as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        summary[key] = value;
      }
    }
    return Object.keys(summary).length > 0 ? summary : null;
  }

  const summary: TagDashboardSummary = {};
  for (const [key, value] of Object.entries(record)) {
    if (SUMMARY_METADATA_KEYS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      summary[key] = value;
    }
  }

  return Object.keys(summary).length > 0 ? summary : null;
}

function parseTagDashboardResponse(payload: unknown): TagDashboardResult {
  if (!payload || typeof payload !== "object") {
    throw new Error("Tag dashboard API returned an unexpected response shape");
  }

  const record = payload as Record<string, unknown>;
  const tenancyName =
    typeof record.tenancyName === "string" ? record.tenancyName.trim() || null : null;

  return {
    summary: extractSummary(record),
    tenancyName,
  };
}

export type TagDashboardSummaryCard = {
  key: string;
  label: string;
  value: number;
  accent: string;
};

export function buildTagDashboardSummaryCards(
  summary: TagDashboardSummary | null | undefined
): TagDashboardSummaryCard[] {
  if (!summary) return [];

  const keys = Object.keys(summary);
  const preferred = PREFERRED_SUMMARY_ORDER.filter((key) => key in summary);
  const remaining = keys
    .filter((key) => !preferred.includes(key as (typeof PREFERRED_SUMMARY_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));
  const orderedKeys = [...preferred, ...remaining];

  return orderedKeys.map((key, index) => ({
    key,
    label: humanizeSummaryKey(key),
    value: summary[key],
    accent: summaryAccentForKey(key, index),
  }));
}

export async function fetchTagDashboardSummary(
  bearerToken?: string | null
): Promise<TagDashboardResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token =
    bearerToken?.trim() || process.env.POLICY_OPTIMIZATION_API_KEY?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(TAG_DASHBOARD_SUMMARY_API_URL, {
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
  return parseTagDashboardResponse(payload);
}

function readOptionalString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  return readOptionalString(record, ...keys) ?? "—";
}

function extractTagsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  for (const key of ["tags", "items", "data", "results", "tagList"]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function formatTagCellValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function isFreeformTagKind(kind: string | undefined, source?: string): boolean {
  const normalized = (kind ?? source ?? "").trim().toLowerCase();
  return normalized.includes("freeform");
}

function isDefinedTagKind(kind: string | undefined, source?: string): boolean {
  const normalized = (kind ?? source ?? "").trim().toLowerCase();
  return normalized.includes("defined");
}

function readResourceCount(record: Record<string, unknown>): number | undefined {
  const value = record.resourceCount ?? record.resource_count;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function formatTagDateTime(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
    return trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }
  return undefined;
}

function readResourceFields(record: Record<string, unknown>): {
  displayName?: string;
  resourceType?: string;
  lifecycleState?: string;
  timeCreated?: string;
  resourceOcid?: string;
} {
  return {
    displayName: readOptionalString(record, "displayName", "display_name", "name"),
    resourceType: readOptionalString(record, "resourceType", "resourceKind", "resource_type"),
    lifecycleState: readOptionalString(
      record,
      "lifecycleState",
      "lifecycle_state",
      "state"
    ),
    timeCreated: formatTagDateTime(
      record.timeCreated ?? record.time_created ?? record.created ?? record.createdAt
    ),
    resourceOcid: readOptionalString(
      record,
      "identifier",
      "resourceOcid",
      "ocid",
      "resourceId"
    ),
  };
}

function expandTagEntry(tag: unknown, tagIndex: number): TagDashboardTagRow[] {
  if (!tag || typeof tag !== "object") return [];

  const record = tag as Record<string, unknown>;
  const kind = readOptionalString(record, "kind");
  const namespace = readOptionalString(record, "namespace", "tagNamespace", "ns") ?? "—";
  const key = readString(record, "tagKey", "key");
  const value = readString(record, "value", "tagValue", "val");
  const resourceCount = readResourceCount(record);
  const resources = Array.isArray(record.resources) ? record.resources : [];

  const base = {
    kind,
    namespace,
    key,
    value,
    resourceCount,
    source: kind,
  };

  if (resources.length === 0) {
    return [
      {
        id: `tag-${tagIndex}`,
        ...base,
      },
    ];
  }

  return resources.map((resource, resourceIndex) => {
    const resourceFields = readResourceFields(resource as Record<string, unknown>);
    return {
      id: `tag-${tagIndex}-resource-${resourceIndex}-${resourceFields.resourceOcid ?? resourceIndex}`,
      ...base,
      ...resourceFields,
    };
  });
}

function buildFromTagEntries(tags: unknown[]): TagDashboardTagsView {
  const defined: TagDashboardTagRow[] = [];
  const freeform: TagDashboardTagRow[] = [];

  tags.forEach((tag, index) => {
    for (const row of expandTagEntry(tag, index)) {
      if (isFreeformTagKind(row.kind, row.source)) {
        freeform.push({ ...row, kind: "FREEFORM", source: "FREEFORM" });
      } else {
        defined.push({ ...row, kind: "DEFINED", source: "DEFINED" });
      }
    }
  });

  return { defined, freeform };
}

function parseTagDashboardTagItem(
  item: unknown,
  index: number,
  category?: "defined" | "freeform"
): TagDashboardTagRow | null {
  if (!item || typeof item !== "object") return null;

  const record = item as Record<string, unknown>;
  const namespace = readOptionalString(record, "namespace", "tagNamespace", "ns") ?? "—";
  const key = readString(record, "tagKey", "key");
  const value = readString(record, "value", "tagValue", "val");
  const resourceFields = readResourceFields(record);
  const kind =
    readOptionalString(record, "kind") ??
    (category === "defined" ? "DEFINED" : category === "freeform" ? "FREEFORM" : undefined);
  const source =
    readOptionalString(record, "source", "tagType", "type") ?? kind;

  return {
    id: `${category ?? "tag"}-${namespace}-${key}-${value}-${resourceFields.resourceOcid ?? index}`,
    kind,
    namespace,
    key,
    value,
    resourceCount: readResourceCount(record),
    ...resourceFields,
    source,
  };
}

function parseDefinedTagsValue(value: unknown, startIndex: number): TagDashboardTagRow[] {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => parseTagDashboardTagItem(item, startIndex + index, "defined"))
      .filter((row): row is TagDashboardTagRow => row !== null);
  }

  if (!value || typeof value !== "object") return [];

  const rows: TagDashboardTagRow[] = [];
  let index = startIndex;

  for (const [namespace, keys] of Object.entries(value as Record<string, unknown>)) {
    if (keys && typeof keys === "object" && !Array.isArray(keys)) {
      for (const [key, tagValue] of Object.entries(keys as Record<string, unknown>)) {
        if (tagValue && typeof tagValue === "object" && !Array.isArray(tagValue)) {
          const tagRecord = tagValue as Record<string, unknown>;
          const resourceFields = readResourceFields(tagRecord);
          rows.push({
            id: `defined-${namespace}-${key}-${index}`,
            kind: readOptionalString(tagRecord, "kind") ?? "DEFINED",
            namespace,
            key,
            value: formatTagCellValue(
              tagRecord.value ?? tagRecord.tagValue ?? tagRecord.val ?? tagValue
            ),
            resourceCount: readResourceCount(tagRecord),
            ...resourceFields,
            source: "DEFINED",
          });
        } else {
          rows.push({
            id: `defined-${namespace}-${key}-${index}`,
            kind: "DEFINED",
            namespace,
            key,
            value: formatTagCellValue(tagValue),
            source: "DEFINED",
          });
        }
        index += 1;
      }
      continue;
    }

    const parsed = parseTagDashboardTagItem(
      { namespace, key: namespace, value: keys },
      index,
      "defined"
    );
    if (parsed) {
      rows.push(parsed);
      index += 1;
    }
  }

  return rows;
}

function parseFreeformTagsValue(value: unknown, startIndex: number): TagDashboardTagRow[] {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => parseTagDashboardTagItem(item, startIndex + index, "freeform"))
      .filter((row): row is TagDashboardTagRow => row !== null);
  }

  if (!value || typeof value !== "object") return [];

  const rows: TagDashboardTagRow[] = [];
  let index = startIndex;

  for (const [key, tagValue] of Object.entries(value as Record<string, unknown>)) {
    if (tagValue && typeof tagValue === "object" && !Array.isArray(tagValue)) {
      const tagRecord = tagValue as Record<string, unknown>;
      const resourceFields = readResourceFields(tagRecord);
      rows.push({
        id: `freeform-${key}-${index}`,
        kind: readOptionalString(tagRecord, "kind") ?? "FREEFORM",
        namespace: readString(tagRecord, "namespace", "tagNamespace", "ns"),
        key,
        value: formatTagCellValue(
          tagRecord.value ?? tagRecord.tagValue ?? tagRecord.val ?? tagValue
        ),
        resourceCount: readResourceCount(tagRecord),
        ...resourceFields,
        source: "FREEFORM",
      });
    } else {
      rows.push({
        id: `freeform-${key}-${index}`,
        kind: "FREEFORM",
        namespace: "—",
        key,
        value: formatTagCellValue(tagValue),
        source: "FREEFORM",
      });
    }
    index += 1;
  }

  return rows;
}

function categorizeFlatTagRows(rows: TagDashboardTagRow[]): TagDashboardTagsView {
  const defined: TagDashboardTagRow[] = [];
  const freeform: TagDashboardTagRow[] = [];

  for (const row of rows) {
    if (isFreeformTagKind(row.kind, row.source)) {
      freeform.push({ ...row, kind: row.kind ?? "FREEFORM", source: "FREEFORM" });
      continue;
    }

    if (
      isDefinedTagKind(row.kind, row.source) ||
      (row.namespace !== "—" && row.namespace.trim())
    ) {
      defined.push({ ...row, kind: row.kind ?? "DEFINED", source: "DEFINED" });
      continue;
    }

    freeform.push({ ...row, kind: row.kind ?? "FREEFORM", source: "FREEFORM" });
  }

  return { defined, freeform };
}

export function buildTagDashboardTagsView(payload: unknown): TagDashboardTagsView {
  if (!payload || typeof payload !== "object") {
    return { defined: [], freeform: [] };
  }

  const record = payload as Record<string, unknown>;
  const tags = extractTagsArray(payload);

  if (tags.length > 0) {
    const usesKindShape = tags.some(
      (tag) => tag && typeof tag === "object" && "kind" in (tag as Record<string, unknown>)
    );

    if (usesKindShape) {
      return buildFromTagEntries(tags);
    }

    const flatRows = tags
      .map((item, index) => parseTagDashboardTagItem(item, index))
      .filter((row): row is TagDashboardTagRow => row !== null);

    return categorizeFlatTagRows(flatRows);
  }

  const defined = parseDefinedTagsValue(
    record.definedTags ?? record.defined ?? record.DEFINED,
    0
  );
  const freeform = parseFreeformTagsValue(
    record.freeformTags ?? record.freeform ?? record.FREEFORM,
    defined.length
  );

  if (defined.length > 0 || freeform.length > 0) {
    return { defined, freeform };
  }

  return { defined: [], freeform: [] };
}

export async function fetchTagDashboardTags(
  bearerToken?: string | null
): Promise<TagDashboardTagsView> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token =
    bearerToken?.trim() || process.env.POLICY_OPTIMIZATION_API_KEY?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(TAG_DASHBOARD_TAGS_API_URL, {
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
  return buildTagDashboardTagsView(payload);
}

export async function loadTagDashboard(
  bearerToken?: string | null
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const token =
    bearerToken?.trim() || process.env.POLICY_OPTIMIZATION_API_KEY?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(TAG_DASHBOARD_LOAD_API_URL, {
    method: "POST",
    headers,
    body: "{}",
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

  const text = await res.text().catch(() => "");
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export type LoadTagDashboardCard = {
  label: string;
  value: string;
  accent?: string;
};

function formatLoadTagCardValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value.trim() || "—";
  if (Array.isArray(value)) {
    return value.length === 0 ? "None" : value.length.toLocaleString();
  }
  return JSON.stringify(value);
}

function pushLoadTagCards(
  cards: LoadTagDashboardCard[],
  label: string,
  value: unknown
): void {
  cards.push({
    label,
    value: formatLoadTagCardValue(value),
    accent: typeof value === "number" ? "text-blue-700" : undefined,
  });
}

export function buildLoadTagDashboardCards(payload: unknown): LoadTagDashboardCard[] {
  if (payload == null || payload === "") {
    return [{ label: "Status", value: "Tags loaded successfully." }];
  }

  if (typeof payload === "string") {
    return [{ label: "Message", value: payload }];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item, index) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return Object.entries(item as Record<string, unknown>).map(([key, value]) => ({
          label: `${humanizeSummaryKey(key)} ${index + 1}`,
          value: formatLoadTagCardValue(value),
          accent: typeof value === "number" ? "text-blue-700" : undefined,
        }));
      }

      return [
        {
          label: `Item ${index + 1}`,
          value: formatLoadTagCardValue(item),
        },
      ];
    });
  }

  if (typeof payload === "object") {
    const cards: LoadTagDashboardCard[] = [];

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [nestedKey, nestedValue] of Object.entries(
          value as Record<string, unknown>
        )) {
          pushLoadTagCards(
            cards,
            `${humanizeSummaryKey(key)} · ${humanizeSummaryKey(nestedKey)}`,
            nestedValue
          );
        }
        continue;
      }

      pushLoadTagCards(cards, humanizeSummaryKey(key), value);
    }

    return cards.length > 0
      ? cards
      : [{ label: "Status", value: "Tags loaded successfully." }];
  }

  return [{ label: "Result", value: String(payload) }];
}

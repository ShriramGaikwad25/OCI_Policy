import type { CompartmentTreeNode, CompartmentsTreeResult } from "@/types/oci-compartments";

/** KeyForge OCI compartments tree endpoint (ACMECOM tenant). */
export const COMPARTMENTS_API_URL =
  "https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/resources/compartments";

export function isCompartmentsApiConfigured(): boolean {
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

function readResourceCount(record: Record<string, unknown>): number | null {
  const value =
    record.resourceCount ??
    record.resource_count ??
    record.count ??
    record.totalResources ??
    record.total_resources;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readResourceType(record: Record<string, unknown>): string | null {
  return (
    readOptionalString(
      record,
      "resourceType",
      "resource_type",
      "type",
      "kind",
      "leafType",
      "leaf_type"
    ) ?? null
  );
}

function readNodeId(record: Record<string, unknown>, fallback: string): string {
  return (
    readOptionalString(
      record,
      "id",
      "compartmentId",
      "compartment_id",
      "ocid",
      "identifier"
    ) ?? fallback
  );
}

function readNodeName(record: Record<string, unknown>, fallback: string): string {
  return (
    readOptionalString(
      record,
      "name",
      "displayName",
      "display_name",
      "compartmentName",
      "compartment_name",
      "label",
      "title"
    ) ?? fallback
  );
}

function parseCompartmentNode(record: Record<string, unknown>, index: number): CompartmentTreeNode {
  const childrenRaw =
    record.children ??
    record.childCompartments ??
    record.child_compartments ??
    record.compartments ??
    record.nodes;

  const children = Array.isArray(childrenRaw)
    ? childrenRaw
        .filter(isRecord)
        .map((child, childIndex) => parseCompartmentNode(child, childIndex))
    : [];

  return {
    id: readNodeId(record, `compartment-${index}`),
    name: readNodeName(record, `Compartment ${index + 1}`),
    resourceCount: readResourceCount(record),
    resourceType: readResourceType(record),
    children,
  };
}

function buildTreeFromFlat(records: Record<string, unknown>[]): CompartmentTreeNode | null {
  if (records.length === 0) return null;

  const nodes = new Map<string, CompartmentTreeNode>();
  const parentById = new Map<string, string | null>();

  records.forEach((record, index) => {
    const id = readNodeId(record, `flat-${index}`);
    nodes.set(id, {
      id,
      name: readNodeName(record, `Compartment ${index + 1}`),
      resourceCount: readResourceCount(record),
      resourceType: readResourceType(record),
      children: [],
    });

    const parentId = readOptionalString(
      record,
      "parentId",
      "parent_id",
      "parentCompartmentId",
      "parent_compartment_id",
      "parentOcid",
      "parent_ocid"
    );
    parentById.set(id, parentId ?? null);
  });

  const roots: CompartmentTreeNode[] = [];

  for (const [id, node] of nodes) {
    const parentId = parentById.get(id);
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  if (roots.length === 1) return roots[0];
  if (roots.length === 0) return null;

  return {
    id: "synthetic-root",
    name: "Root",
    resourceCount: roots.reduce((sum, node) => sum + (node.resourceCount ?? 0), 0) || null,
    resourceType: null,
    children: roots,
  };
}

function extractCompartmentRecords(payload: unknown): Record<string, unknown>[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter(isRecord);

  if (!isRecord(payload)) return [];

  const nested =
    payload.compartments ??
    payload.items ??
    payload.data ??
    payload.results ??
    payload.nodes;

  if (Array.isArray(nested)) return nested.filter(isRecord);

  if (isRecord(nested)) {
    const inner =
      nested.compartments ?? nested.items ?? nested.children ?? nested.nodes;
    if (Array.isArray(inner)) return inner.filter(isRecord);
  }

  const rootCandidate =
    payload.root ?? payload.tree ?? payload.compartment ?? payload.tenancy;
  if (isRecord(rootCandidate)) return [rootCandidate];

  return [payload];
}

function parseRootNode(records: Record<string, unknown>[]): CompartmentTreeNode | null {
  if (records.length === 0) return null;

  const first = records[0];
  const hasNestedChildren = [first.children, first.childCompartments, first.compartments].some(
    Array.isArray
  );

  if (records.length === 1 && hasNestedChildren) {
    return parseCompartmentNode(first, 0);
  }

  const hasParentRefs = records.some((record) =>
    Boolean(
      readOptionalString(
        record,
        "parentId",
        "parent_id",
        "parentCompartmentId",
        "parent_compartment_id"
      )
    )
  );

  if (hasParentRefs || records.length > 1) {
    return buildTreeFromFlat(records);
  }

  return parseCompartmentNode(first, 0);
}

export function parseCompartmentsPayload(payload: unknown): CompartmentsTreeResult {
  const record = isRecord(payload) ? payload : {};
  const records = extractCompartmentRecords(payload);

  return {
    tenancyId: readOptionalString(record, "tenancyId", "tenancy_id") ?? null,
    tenancyName:
      readOptionalString(record, "tenancyName", "tenancy_name", "name", "displayName") ?? null,
    root: parseRootNode(records),
  };
}

function parseApiError(text: string, status: number, statusText: string): string {
  if (!text.trim()) {
    return `Compartments API request failed (${status} ${statusText})`;
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

export async function fetchCompartmentsTree(
  bearerToken?: string | null
): Promise<CompartmentsTreeResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = bearerToken?.trim() || process.env.POLICY_OPTIMIZATION_API_KEY?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(COMPARTMENTS_API_URL, {
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
  return parseCompartmentsPayload(payload);
}

export function collectCompartmentPaths(
  node: CompartmentTreeNode,
  prefix: CompartmentTreeNode[] = []
): CompartmentTreeNode[][] {
  const path = [...prefix, node];
  if (node.children.length === 0) return [path];
  return node.children.flatMap((child) => collectCompartmentPaths(child, path));
}

export function sumPathResourceCounts(path: CompartmentTreeNode[]): number {
  return path.reduce((sum, node) => sum + (node.resourceCount ?? 0), 0);
}

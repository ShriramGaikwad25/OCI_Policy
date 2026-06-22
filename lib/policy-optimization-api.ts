import type {
  PolicyOptimizationGrant,
  PolicyOptimizationItem,
  PolicyOptimizationResult,
  PolicyOptimizationSummary,
} from "@/types/oci-policy";

/** KeyForge OCI policy optimization endpoint (ACMECOM tenant). */
export const POLICY_OPTIMIZATION_API_URL =
  "https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/policy-optimization";

export function isPolicyOptimizationApiConfigured(): boolean {
  return true;
}

interface PolicyOptimizationFinding {
  type: string;
  severity: string;
  subject: { kind: string; name: string };
  verb: string;
  resource: string;
  compartment: { name?: string; ocid?: string; scope: string };
  redundantGrants: PolicyOptimizationGrant[];
  coveredBy?: PolicyOptimizationGrant[];
  reason: string;
  suggestedAction: string;
}

interface PolicyOptimizationApiResponse {
  tenancyId?: string;
  tenancyName?: string;
  summary?: PolicyOptimizationSummary;
  findings?: PolicyOptimizationFinding[];
  rows?: PolicyOptimizationItem[];
  data?: PolicyOptimizationItem[];
}

function extractConditionFromRaw(raw: string): string | null {
  const match = raw.match(/\bwhere\b(.+)$/i);
  return match ? match[1].trim() : null;
}

function formatSubject(subject: { kind: string; name: string }): string {
  const name = subject.name?.trim() || "—";
  if (subject.kind === "GROUP") return name;
  if (subject.kind === "SERVICE") return `service ${name}`;
  if (subject.kind === "UNKNOWN") return name;
  return `${subject.kind}: ${name}`;
}

function formatCompartment(compartment: PolicyOptimizationFinding["compartment"]): {
  compartment: string;
  compartmentTitle: string;
} {
  const name = compartment.name?.trim();
  const ocid = compartment.ocid?.trim();
  const scope = compartment.scope?.trim();

  if (name) {
    return {
      compartment: name,
      compartmentTitle: ocid ? `${name} · ${ocid}` : name,
    };
  }

  if (scope === "TENANCY") {
    return {
      compartment: "tenancy",
      compartmentTitle: ocid ?? "tenancy",
    };
  }

  if (ocid) {
    return { compartment: ocid, compartmentTitle: ocid };
  }

  return {
    compartment: scope || "—",
    compartmentTitle: scope || "—",
  };
}

export function mapFindingsToRows(findings: PolicyOptimizationFinding[]): PolicyOptimizationItem[] {
  return findings.map((finding, index) => {
    const redundantGrants = (finding.redundantGrants ?? []).map((grant) => ({
      ref: grant.ref,
      policyName: grant.policyName,
      raw: grant.raw,
    }));
    const coveredBy = (finding.coveredBy ?? []).map((grant) => ({
      ref: grant.ref,
      policyName: grant.policyName,
      raw: grant.raw,
    }));
    const firstGrant = redundantGrants[0];
    const compartmentFields = formatCompartment(finding.compartment);

    return {
      findingId: `${finding.type}-${index}`,
      policyName: firstGrant?.policyName ?? "—",
      statement: redundantGrants.map((grant) => grant.ref).join(", ") || "—",
      groupName: formatSubject(finding.subject),
      owner: "—",
      action: finding.verb,
      resource: finding.resource,
      compartment: compartmentFields.compartment,
      compartmentTitle: compartmentFields.compartmentTitle,
      condition: firstGrant ? extractConditionFromRaw(firstGrant.raw) : null,
      optimizationType: finding.type,
      reason: finding.reason,
      coveredByStatement: coveredBy[0]?.ref ?? null,
      recommendation: finding.suggestedAction,
      severity: finding.severity,
      rawStatement: firstGrant?.raw,
      coveredByRaw: coveredBy[0]?.raw ?? null,
      redundantGrants,
      coveredBy,
    };
  });
}

function parsePolicyOptimizationResponse(payload: unknown): PolicyOptimizationResult {
  if (Array.isArray(payload)) {
    return {
      rows: payload as PolicyOptimizationItem[],
      summary: null,
      tenancyName: null,
    };
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Policy optimization API returned an unexpected response shape");
  }

  const record = payload as PolicyOptimizationApiResponse;

  if (Array.isArray(record.findings)) {
    return {
      rows: mapFindingsToRows(record.findings),
      summary: record.summary ?? null,
      tenancyName: record.tenancyName ?? null,
    };
  }

  if (Array.isArray(record.rows)) {
    return { rows: record.rows, summary: record.summary ?? null, tenancyName: record.tenancyName ?? null };
  }

  if (Array.isArray(record.data)) {
    return { rows: record.data, summary: record.summary ?? null, tenancyName: record.tenancyName ?? null };
  }

  throw new Error("Policy optimization API returned an unexpected response shape");
}

function parseApiError(text: string, status: number, statusText: string): string {
  if (!text.trim()) {
    return `Policy optimization API request failed (${status} ${statusText})`;
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

export async function fetchPolicyOptimizationRows(
  bearerToken?: string | null
): Promise<PolicyOptimizationResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token =
    bearerToken?.trim() || process.env.POLICY_OPTIMIZATION_API_KEY?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(POLICY_OPTIMIZATION_API_URL, {
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
  return parsePolicyOptimizationResponse(payload);
}

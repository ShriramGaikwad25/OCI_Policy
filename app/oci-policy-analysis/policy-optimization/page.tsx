"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  RotateCw,
  Search,
  Shield,
  WifiOff,
  X,
} from "lucide-react";
import { useOciPolicyOptimization } from "@/hooks/useOciPolicyOptimization";
import {
  filterPolicyOptimizationRows,
  groupPolicyOptimizationRows,
} from "@/lib/policy-optimization-search";
import type {
  PolicyOptimizationGrant,
  PolicyOptimizationGroup,
  PolicyOptimizationItem,
} from "@/types/oci-policy";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const EMPTY_OPTIMIZATION_ROWS: PolicyOptimizationItem[] = [];
const TH =
  "px-4 py-3.5 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider align-middle bg-slate-100 border-b border-slate-300 whitespace-nowrap";
const TD = "px-4 py-3 text-sm font-normal text-gray-800 align-middle bg-white";
const INNER_TH =
  "px-3 py-2 text-left text-[11px] font-semibold text-blue-800 uppercase tracking-wider align-top bg-blue-50/80 border-b border-blue-100";
const INNER_TD =
  "px-3 py-2.5 text-sm font-normal text-gray-800 align-top bg-white break-words leading-snug [overflow-wrap:anywhere]";

function WrappedCell({
  value,
  mono = false,
  className = "",
}: {
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`block break-words leading-snug [overflow-wrap:anywhere] ${mono ? "font-mono text-xs" : ""} ${className}`}
    >
      {value || "—"}
    </span>
  );
}

function SummaryStatBox({
  label,
  value,
  accent = "text-gray-900",
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm min-w-0">
      <p className="text-xs text-gray-500 mb-1 leading-snug">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function optimizationTypeStyle(type: string): string {
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function formatPolicyStatement(raw: string): string {
  return raw.trim();
}

function collectUniqueStatements(grants: PolicyOptimizationGrant[]): string[] {
  const seen = new Set<string>();
  const statements: string[] = [];
  for (const grant of grants) {
    const raw = grant.raw.trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    statements.push(raw);
  }
  return statements;
}

function GrantRefPill({
  grant,
  variant,
}: {
  grant: PolicyOptimizationGrant;
  variant: "remove" | "keep";
}) {
  const styles =
    variant === "remove"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <span
      className={`inline-flex max-w-full flex-col rounded-lg border px-2.5 py-1.5 text-xs leading-tight ${styles}`}
    >
      <span className="font-semibold break-words">{grant.policyName}</span>
      <span className="font-mono text-[11px] opacity-80">{grant.ref}</span>
    </span>
  );
}

function GrantRecordList({
  grants,
  variant,
  showStatementPerRecord,
}: {
  grants: PolicyOptimizationGrant[];
  variant: "remove" | "keep";
  showStatementPerRecord: boolean;
}) {
  if (showStatementPerRecord) {
    return (
      <div className="space-y-3">
        {grants.map((grant) => (
          <div
            key={`${grant.policyName}-${grant.ref}`}
            className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <GrantRefPill grant={grant} variant={variant} />
            <PolicyStatementBlock raw={grant.raw} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {grants.map((grant) => (
        <GrantRefPill key={`${grant.policyName}-${grant.ref}`} grant={grant} variant={variant} />
      ))}
    </div>
  );
}

function PolicyStatementBlock({ raw, shared = false }: { raw: string; shared?: boolean }) {
  const formatted = formatPolicyStatement(raw);

  return (
    <div
      className={`rounded-lg border border-slate-200 ${shared ? "bg-white" : "bg-slate-50"}`}
    >
      <pre className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-3 py-2.5 text-[11px] leading-relaxed text-slate-700 font-mono">
        {formatted}
      </pre>
    </div>
  );
}

function SidebarSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function optimizationSidebarAction(
  type: string
): "remove-duplicate" | "modify" | null {
  const upper = type.toUpperCase();
  if (upper === "DUPLICATE") return "remove-duplicate";
  if (upper.includes("REDUNDANT") || upper === "OVER_BROAD") return "modify";
  return null;
}

function OptimizationDetailsSidebar({
  row,
  widthPx,
  onClose,
}: {
  row: PolicyOptimizationItem;
  widthPx: number;
  onClose: () => void;
}) {
  const action = optimizationSidebarAction(row.optimizationType);
  const showRemoveDuplicate = action === "remove-duplicate";
  const showModify = action === "modify";
  const redundantGrants = row.redundantGrants ?? [];
  const coveredBy = row.coveredBy ?? [];
  const uniqueStatements = collectUniqueStatements([...redundantGrants, ...coveredBy]);
  const hasSharedStatement = uniqueStatements.length === 1;

  return (
    <aside
      className="fixed right-0 top-[60px] z-50 flex flex-col border-l border-gray-200 bg-slate-50 shadow-2xl"
      style={{ width: widthPx, height: "calc(100vh - 60px)" }}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4">
        <div className="min-w-0 space-y-2">
          <h2 className="text-base font-semibold text-gray-900">Finding details</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${optimizationTypeStyle(row.optimizationType)}`}
            >
              {row.optimizationType}
            </span>
            {row.severity && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {row.severity}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Close details"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {redundantGrants.length > 0 && (
          <SidebarSection
            title={`Remove (${redundantGrants.length})`}
            description="Redundant grants identified in this finding"
          >
            <GrantRecordList
              grants={redundantGrants}
              variant="remove"
              showStatementPerRecord={!hasSharedStatement}
            />
          </SidebarSection>
        )}

        {coveredBy.length > 0 && (
          <SidebarSection
            title={`Keep (${coveredBy.length})`}
            description="Existing grant that already provides this access"
          >
            <GrantRecordList
              grants={coveredBy}
              variant="keep"
              showStatementPerRecord={!hasSharedStatement}
            />
          </SidebarSection>
        )}

        {hasSharedStatement && uniqueStatements[0] && (
          <SidebarSection
            title="Policy statement"
            description="Shared statement text for the grants above"
          >
            <PolicyStatementBlock raw={uniqueStatements[0]} shared />
          </SidebarSection>
        )}

        <SidebarSection title="Reason">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950">
            {row.reason || "—"}
          </p>
        </SidebarSection>

        <SidebarSection title="Suggested action">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-950">
            {row.recommendation || "—"}
          </p>
        </SidebarSection>
      </div>

      {(showRemoveDuplicate || showModify) && (
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
          {showRemoveDuplicate && (
            <button
              type="button"
              className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              Remove duplicate
            </button>
          )}
          {showModify && (
            <button
              type="button"
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Modify
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

export default function OciPolicyOptimizationPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useOciPolicyOptimization();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<PolicyOptimizationItem | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const detailsPanelWidth = 480;

  const configured = data?.configured ?? false;
  const rows = data?.rows ?? EMPTY_OPTIMIZATION_ROWS;
  const summary = data?.summary ?? null;
  const tenancyName = data?.tenancyName ?? null;
  const normalizedSearch = searchQuery.trim();

  const filteredRows = useMemo(
    () => filterPolicyOptimizationRows(rows, normalizedSearch),
    [rows, normalizedSearch]
  );

  const groupedRows = useMemo(
    () => groupPolicyOptimizationRows(filteredRows),
    [filteredRows]
  );

  const groupedRowKeys = useMemo(
    () => groupedRows.map((group) => group.key).join("\0"),
    [groupedRows]
  );

  const totalGroups = groupedRows.length;
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [totalGroups, pageSize, normalizedSearch]);

  useEffect(() => {
    if (normalizedSearch) {
      const nextKeys = groupedRowKeys.split("\0").filter(Boolean);
      setExpandedGroups((prev) => {
        if (prev.size === nextKeys.length && nextKeys.every((key) => prev.has(key))) {
          return prev;
        }
        return new Set(nextKeys);
      });
    } else {
      setExpandedGroups((prev) => (prev.size === 0 ? prev : new Set()));
    }
  }, [normalizedSearch, groupedRowKeys]);

  useEffect(() => {
    if (
      selectedRow &&
      !filteredRows.some((row) => row.findingId === selectedRow.findingId)
    ) {
      setSelectedRow(null);
    }
  }, [filteredRows, selectedRow]);

  const pageGroups = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return groupedRows.slice(start, start + pageSize);
  }, [groupedRows, safePage, pageSize]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="relative w-full min-w-0">
      <div
        className="flex min-w-0 flex-col transition-all duration-300 ease-in-out"
        style={{
          width: selectedRow ? `calc(100% - ${detailsPanelWidth}px)` : "100%",
        }}
      >
      <div className="shrink-0 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Shield className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Policy Optimization</h1>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0"
            aria-label="Refresh policy optimization data"
          >
            <RotateCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Redundant and duplicate policy statements
          {tenancyName ? ` for ${tenancyName}` : ""} (effective statements are excluded).
        </p>
      </div>

      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <SummaryStatBox
          label="Grants analyzed"
          value={summary?.grantsAnalyzed ?? "—"}
          accent="text-gray-900"
        />
        <SummaryStatBox
          label="Duplicates"
          value={summary?.duplicates ?? "—"}
          accent="text-blue-700"
        />
        <SummaryStatBox
          label="Redundant"
          value={summary?.redundant ?? "—"}
          accent="text-amber-700"
        />
        <SummaryStatBox
          label="Consolidations"
          value={summary?.consolidations ?? "—"}
          accent="text-gray-900"
        />
        <SummaryStatBox
          label="Over broad"
          value={summary?.overBroad ?? "—"}
          accent="text-orange-700"
        />
        <SummaryStatBox
          label="Dead conditions"
          value={summary?.deadConditions ?? "—"}
          accent="text-gray-900"
        />
      </div>

      {!configured && !isLoading && (
        <div className="shrink-0 mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <p>Sign in to load policy optimization data from KeyForge.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-600 py-8">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading optimization rows…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error instanceof Error ? error.message : "Failed to load policy optimization"}
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search policy, statement, subject, resource, or compartment…"
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Search policy optimization rows"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            {normalizedSearch && (
              <p className="text-sm text-gray-600 tabular-nums">
                {totalRows === 0
                  ? "No matches"
                  : `${totalRows} match${totalRows === 1 ? "" : "es"}`}
              </p>
            )}
          </div>
          {filteredRows.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-600">
              No rows match &ldquo;{searchQuery.trim()}&rdquo;. Try a different search term.
            </p>
          ) : (
            <>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm border-collapse">
              <colgroup>
                <col className="w-[70%]" />
                <col className="w-[20%]" />
                <col className="w-16" />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className={TH}>Type</th>
                  <th className={TH}>Records</th>
                  <th className={TH} aria-label="Expand" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pageGroups.map((group: PolicyOptimizationGroup) => {
                  const isExpanded = expandedGroups.has(group.key);
                  return (
                    <Fragment key={group.key}>
                      <tr
                        className="hover:bg-blue-50/50 cursor-pointer"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <td className={TD}>
                          <span
                            className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium ${optimizationTypeStyle(group.optimizationType)}`}
                          >
                            {group.optimizationType}
                          </span>
                        </td>
                        <td className={`${TD} tabular-nums text-gray-600`}>
                          {group.statements.length}
                        </td>
                        <td className={`${TD} pl-3 pr-6 text-left text-gray-500`}>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" aria-hidden />
                          ) : (
                            <ChevronDown className="h-5 w-5" aria-hidden />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={3} className="bg-slate-50/70 px-3 py-2">
                            <div className="overflow-x-auto rounded-md border border-blue-100 bg-white shadow-sm">
                              <table className="w-full table-fixed text-sm border-collapse">
                                <colgroup>
                                  <col className="w-[30%]" />
                                  <col className="w-[12%]" />
                                  <col className="w-[28%]" />
                                  <col className="w-[30%]" />
                                </colgroup>
                                <thead>
                                  <tr>
                                    <th scope="col" className={INNER_TH}>
                                      Subject
                                    </th>
                                    <th scope="col" className={INNER_TH}>
                                      Action
                                    </th>
                                    <th scope="col" className={INNER_TH}>
                                      Compartment
                                    </th>
                                    <th scope="col" className={INNER_TH}>
                                      Resource
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.statements.map((row) => {
                                    const isSelected =
                                      selectedRow?.findingId === row.findingId;
                                    return (
                                      <tr
                                        key={row.findingId}
                                        className={`cursor-pointer hover:bg-blue-50/40 ${isSelected ? "bg-blue-50" : ""}`}
                                        onClick={() => setSelectedRow(row)}
                                      >
                                        <td className={INNER_TD}>
                                          <WrappedCell
                                            value={row.groupName}
                                            className="font-medium text-gray-900"
                                          />
                                        </td>
                                        <td className={INNER_TD}>
                                          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                            {row.action}
                                          </span>
                                        </td>
                                        <td className={INNER_TD}>
                                          <WrappedCell
                                            value={row.compartmentTitle ?? row.compartment}
                                            className="text-gray-600"
                                          />
                                        </td>
                                        <td className={INNER_TD}>
                                          <WrappedCell
                                            value={row.resource}
                                            className="text-gray-700"
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
            <label className="flex items-center gap-2 text-gray-600">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <span className="text-gray-600 tabular-nums">
                Page {safePage} of {totalPages}
                <span className="text-gray-400"> · {totalGroups} types</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {!isLoading && !isError && configured && rows.length === 0 && (
        <p className="text-gray-600">No optimization rows returned from the API.</p>
      )}

      </div>

      {selectedRow && (
        <OptimizationDetailsSidebar
          row={selectedRow}
          widthPx={detailsPanelWidth}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  );
}

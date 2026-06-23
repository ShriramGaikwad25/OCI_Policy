"use client";

import { useMemo, useState } from "react";
import { FolderSync, Loader2, RotateCw, Tags, WifiOff } from "lucide-react";
import Modal from "@/components/Modal";
import { useOciTagDashboard } from "@/hooks/useOciTagDashboard";
import { useOciTagDashboardTags } from "@/hooks/useOciTagDashboardTags";
import {
  buildLoadTagDashboardCards,
  buildTagDashboardSummaryCards,
  loadTagDashboard,
  type LoadTagDashboardCard,
} from "@/lib/tag-dashboard-api";
import type { TagDashboardTagRow, TagDashboardTagResource } from "@/types/oci-policy";

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
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="mb-1 text-xs leading-snug text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function LoadTagDashboardCard({ label, value, accent = "text-gray-900" }: LoadTagDashboardCard) {
  const compact = value.length > 48;

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="mb-1 text-xs leading-snug text-gray-500">{label}</p>
      <p
        className={`break-words leading-snug [overflow-wrap:anywhere] ${
          compact ? "text-sm font-medium" : "text-2xl font-semibold tabular-nums"
        } ${accent}`}
      >
        {value}
      </p>
    </div>
  );
}

function LoadTagDashboardCards({ payload }: { payload: unknown }) {
  const cards = useMemo(() => buildLoadTagDashboardCards(payload), [payload]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card, index) => (
        <LoadTagDashboardCard key={`${card.label}-${index}`} {...card} />
      ))}
    </div>
  );
}

const TAG_SECTION_STYLES = {
  defined: {
    shell: "border-blue-100",
    bar: "border-blue-100 bg-blue-50/50",
    accent: "bg-blue-500",
    title: "text-blue-900",
    count: "border-blue-200 bg-white text-blue-800",
    th: "px-4 py-2.5 text-left text-[11px] font-semibold text-blue-800 uppercase tracking-wider bg-blue-50/80 border-b border-blue-100",
    tagCell: "border-r border-gray-200",
    resourceCell: "border-l-2 border-gray-300",
    label: "DEFINED TAGS",
    labelNote: "(Ignored Oracle_Tags)",
    empty: "No DEFINED tags found (Oracle_Tags excluded).",
  },
  freeform: {
    shell: "border-amber-100",
    bar: "border-amber-100 bg-amber-50/40",
    accent: "bg-amber-500",
    title: "text-amber-950",
    count: "border-amber-200 bg-white text-amber-900",
    th: "px-4 py-2.5 text-left text-[11px] font-semibold text-amber-900 uppercase tracking-wider bg-amber-50/70 border-b border-amber-100",
    tagCell: "border-r border-gray-200",
    resourceCell: "border-l-2 border-gray-300",
    label: "FREEFORM TAGS",
    empty: "No FREEFORM tags found.",
  },
} as const;

function getTagResources(row: TagDashboardTagRow): TagDashboardTagResource[] {
  if (row.resources?.length) return row.resources;

  if (
    row.displayName ||
    row.resourceType ||
    row.lifecycleState ||
    row.timeCreated ||
    row.resourceOcid
  ) {
    return [
      {
        displayName: row.displayName,
        resourceType: row.resourceType,
        lifecycleState: row.lifecycleState,
        timeCreated: row.timeCreated,
        resourceOcid: row.resourceOcid,
      },
    ];
  }

  return [{}];
}

function TagSectionTable({
  variant,
  rows,
  showNamespace = true,
}: {
  variant: keyof typeof TAG_SECTION_STYLES;
  rows: TagDashboardTagRow[];
  showNamespace?: boolean;
}) {
  const styles = TAG_SECTION_STYLES[variant];

  return (
    <section className={`overflow-hidden rounded-lg border bg-white shadow-sm ${styles.shell}`}>
      <div className={`flex items-center justify-between gap-4 border-b px-4 py-3 ${styles.bar}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={`h-7 w-1 shrink-0 rounded-full ${styles.accent}`} aria-hidden />
          <h2 className={`text-sm font-semibold tracking-tight ${styles.title}`}>
            {styles.label}
            {"labelNote" in styles && styles.labelNote ? (
              <span className="ml-1.5 text-xs font-normal text-gray-500">
                {styles.labelNote}
              </span>
            ) : null}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums ${styles.count}`}
        >
          {rows.length} {rows.length === 1 ? "tag" : "tags"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-sm text-gray-600">{styles.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr>
                {showNamespace && (
                  <th scope="col" className={styles.th}>
                    Namespace
                  </th>
                )}
                <th scope="col" className={styles.th}>
                  Key
                </th>
                <th scope="col" className={styles.th}>
                  Value
                </th>
                <th scope="col" className={`${styles.th} border-r ${styles.tagCell}`}>
                  Resource count
                </th>
                <th scope="col" className={`${styles.th} ${styles.resourceCell}`}>
                  Display name
                </th>
                <th scope="col" className={styles.th}>
                  Resource type
                </th>
                <th scope="col" className={styles.th}>
                  Lifecycle state
                </th>
                <th scope="col" className={styles.th}>
                  Time created
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((row) => {
                const resources = getTagResources(row);
                const span = resources.length;
                const hasMultipleResources = span > 1;

                return resources.map((resource, resourceIndex) => {
                  const isLastResourceInTag = resourceIndex === resources.length - 1;
                  const isContinuationRow = resourceIndex > 0;
                  const resourceRowClass = [
                    "bg-white",
                    isContinuationRow ? "border-t border-gray-200" : "",
                    isLastResourceInTag ? "border-b-2 border-gray-300" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={`${row.id}-${resourceIndex}`} className={resourceRowClass}>
                      {resourceIndex === 0 && (
                        <>
                          {showNamespace && (
                            <td
                              rowSpan={span}
                              className={`px-4 py-2.5 align-top text-gray-800 ${styles.tagCell}`}
                            >
                              {row.namespace}
                            </td>
                          )}
                          <td
                            rowSpan={span}
                            className={`px-4 py-2.5 align-top font-medium text-gray-900 ${styles.tagCell}`}
                          >
                            {row.key}
                          </td>
                          <td
                            rowSpan={span}
                            className={`px-4 py-2.5 align-top break-words text-gray-700 [overflow-wrap:anywhere] ${styles.tagCell}`}
                          >
                            {row.value}
                          </td>
                          <td
                            rowSpan={span}
                            className={`px-4 py-2.5 align-top tabular-nums text-gray-600 ${styles.tagCell}`}
                          >
                            {row.resourceCount ?? "—"}
                          </td>
                        </>
                      )}
                      <td
                        className={`px-4 py-2.5 font-medium text-gray-900 ${
                          hasMultipleResources || resourceIndex === 0 ? styles.resourceCell : ""
                        }`}
                      >
                        {resource.displayName ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{resource.resourceType ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {resource.lifecycleState ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                        {resource.timeCreated ?? "—"}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TagSections({
  definedRows,
  freeformRows,
  isLoading,
  isError,
  error,
}: {
  definedRows: TagDashboardTagRow[];
  freeformRows: TagDashboardTagRow[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <div className="mt-6 space-y-4">
      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-8 text-sm text-gray-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading tags…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error instanceof Error ? error.message : "Failed to load tags"}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col gap-4">
          <TagSectionTable variant="defined" rows={definedRows} showNamespace />
          <TagSectionTable variant="freeform" rows={freeformRows} showNamespace={false} />
        </div>
      )}
    </div>
  );
}

export default function OciTagDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useOciTagDashboard();
  const {
    data: tagsData,
    isLoading: isTagsLoading,
    isError: isTagsError,
    error: tagsError,
    refetch: refetchTags,
    isFetching: isTagsFetching,
  } = useOciTagDashboardTags();
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [loadTagsModal, setLoadTagsModal] = useState<
    | { type: "success"; title: string; payload: unknown }
    | { type: "error"; title: string; message: string }
    | null
  >(null);

  const configured = data?.configured ?? false;
  const summary = data?.summary ?? null;
  const summaryCards = useMemo(() => buildTagDashboardSummaryCards(summary), [summary]);
  const definedRows = tagsData?.defined ?? [];
  const freeformRows = tagsData?.freeform ?? [];
  const isRefreshing = isFetching || isTagsFetching;

  const handleRefresh = () => {
    void refetch();
    void refetchTags();
  };

  const handleLoadTags = async () => {
    setIsLoadingTags(true);
    setLoadTagsModal(null);
    try {
      const payload = await loadTagDashboard();
      setLoadTagsModal({
        type: "success",
        title: "Load Tags",
        payload,
      });
    } catch (loadError) {
      setLoadTagsModal({
        type: "error",
        title: "Load Tags Failed",
        message:
          loadError instanceof Error ? loadError.message : "Failed to load tags.",
      });
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleCloseLoadTagsModal = () => {
    const shouldRefresh = loadTagsModal?.type === "success";
    setLoadTagsModal(null);
    if (shouldRefresh) {
      handleRefresh();
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 shrink-0">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600">
              <Tags className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleLoadTags()}
              disabled={isLoadingTags || isRefreshing}
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              aria-label="Load tags from OCI"
            >
              {isLoadingTags ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FolderSync className="h-4 w-4" aria-hidden />
              )}
              Load Tags
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingTags}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Refresh tag dashboard data"
            >
              <RotateCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!configured && !isLoading && (
        <div className="mb-3 flex shrink-0 items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Sign in to load tag dashboard data from KeyForge.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading tag dashboard summary…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error instanceof Error ? error.message : "Failed to load tag dashboard summary"}
        </div>
      )}

      {!isLoading && !isError && summaryCards.length > 0 && (
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {summaryCards.map((card) => (
            <SummaryStatBox
              key={card.key}
              label={card.label}
              value={card.value.toLocaleString()}
              accent={card.accent}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && summaryCards.length === 0 && (
        <p className="text-sm text-gray-600">No tag dashboard summary data returned from the API.</p>
      )}

      <TagSections
        definedRows={definedRows}
        freeformRows={freeformRows}
        isLoading={isTagsLoading}
        isError={isTagsError}
        error={tagsError}
      />

      <Modal
        open={loadTagsModal !== null}
        title={loadTagsModal?.title ?? "Load Tags"}
        onClose={handleCloseLoadTagsModal}
        wide
        footer={
          <button
            type="button"
            onClick={handleCloseLoadTagsModal}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            OK
          </button>
        }
      >
        {loadTagsModal?.type === "error" ? (
          <p className="text-red-700">{loadTagsModal.message}</p>
        ) : loadTagsModal?.type === "success" ? (
          <LoadTagDashboardCards payload={loadTagsModal.payload} />
        ) : null}
      </Modal>
    </div>
  );
}

"use client";

import {
  collectCompartmentPaths,
  formatCompartmentCount,
  getCompartmentDisplayCount,
  sumPathResourceCounts,
} from "@/lib/compartments-api";
import type { CompartmentTreeNode } from "@/types/oci-compartments";
import { CompartmentCountDisplay } from "@/components/oci-compartments/CompartmentCountBadge";
import { ZoomPanViewport } from "@/components/oci-compartments/ZoomPanViewport";

const PATH_LINE_COLORS = ["bg-red-700", "bg-amber-400", "bg-red-700", "bg-amber-400"] as const;

function CompartmentPathColumn({
  path,
  colorClass,
}: {
  path: CompartmentTreeNode[];
  colorClass: string;
}) {
  const leaf = path[path.length - 1];
  const pathTotal = sumPathResourceCounts(path);
  const displayTotal =
    pathTotal > 0 ? pathTotal : (getCompartmentDisplayCount(leaf) ?? 0);

  return (
    <div className="flex w-[8.5rem] shrink-0 select-none flex-col items-center">
      <div className="relative flex w-full flex-col items-center gap-2.5 py-1">
        <div
          className={`absolute bottom-2 left-1/2 top-2 w-1 -translate-x-1/2 rounded-full ${colorClass}`}
          aria-hidden
        />
        {path.map((node, index) => (
          <div
            key={`${node.id}-${index}`}
            className="relative z-10 w-full overflow-visible rounded-lg bg-teal-800 px-2 py-1.5 text-center text-[11px] font-medium text-white [overflow-wrap:anywhere]"
          >
            {index === 0 ? "Root" : node.name}
            <CompartmentCountDisplay
              node={node}
              variant="inline"
              className="mt-0.5 block text-[10px] font-bold leading-none tabular-nums text-amber-200"
            />
          </div>
        ))}
        {leaf.resourceType ? (
          <span className="relative z-10 text-center text-[10px] font-medium text-teal-900">
            {leaf.resourceType}
          </span>
        ) : null}
      </div>
      {displayTotal > 0 ? (
        <span
          className="mt-2 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm"
          title={`${displayTotal.toLocaleString()} resources on path`}
        >
          {formatCompartmentCount(displayTotal)}
        </span>
      ) : null}
    </div>
  );
}

export function CompartmentPathsView({ root }: { root: CompartmentTreeNode | null }) {
  const paths = root ? collectCompartmentPaths(root) : [];

  return (
    <ZoomPanViewport
      title="Paths"
      empty={!root || paths.length === 0}
      emptyMessage={
        root ? "No paths to display." : "Paths appear when compartment data loads."
      }
      fitKey={paths.map((path) => path.map((node) => node.id).join(">")).join("|")}
      footer={
        paths.length > 0
          ? `${paths.length} paths · drag to pan · scroll to zoom`
          : undefined
      }
    >
      <div className="flex gap-5 p-4">
        {paths.map((path, index) => (
          <CompartmentPathColumn
            key={`${path.map((node) => node.id).join(">")}-${index}`}
            path={path}
            colorClass={PATH_LINE_COLORS[index % PATH_LINE_COLORS.length]}
          />
        ))}
      </div>
    </ZoomPanViewport>
  );
}

import {
  formatCompartmentCount,
  getCompartmentDisplayCount,
  getCompartmentSecondaryCount,
} from "@/lib/compartments-api";
import type { CompartmentTreeNode } from "@/types/oci-compartments";

type CompartmentCountDisplayProps = {
  node: CompartmentTreeNode;
  variant?: "inline" | "badge";
  className?: string;
};

export function CompartmentCountDisplay({
  node,
  variant = "inline",
  className,
}: CompartmentCountDisplayProps) {
  const count = getCompartmentDisplayCount(node);
  const secondary = getCompartmentSecondaryCount(node);

  if ((count == null || count <= 0) && !secondary) return null;

  if (variant === "badge") {
    if (count == null || count <= 0) return null;
    return (
      <span
        className={
          className ??
          "absolute -right-1 -top-1 z-20 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
        }
        title={`${count.toLocaleString()} resources`}
      >
        {formatCompartmentCount(count)}
      </span>
    );
  }

  return (
    <span
      className={
        className ??
        "mt-0.5 block text-[10px] font-bold leading-none tabular-nums text-amber-200"
      }
      title={
        count != null && count > 0
          ? `${count.toLocaleString()} resources`
          : secondary?.title
      }
    >
      {count != null && count > 0
        ? formatCompartmentCount(count)
        : secondary
          ? `${secondary.value} sub`
          : null}
    </span>
  );
}

/** @deprecated Use CompartmentCountDisplay */
export const CompartmentCountBadge = CompartmentCountDisplay;

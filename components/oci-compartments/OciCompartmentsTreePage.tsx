"use client";

import { Network, RotateCw, WifiOff } from "lucide-react";
import { useOciCompartmentsTree } from "@/hooks/useOciCompartmentsTree";
import { CompartmentGraphView } from "@/components/oci-compartments/CompartmentGraphView";
import { CompartmentPathsView } from "@/components/oci-compartments/CompartmentPathsView";

export default function OciCompartmentsTreePage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useOciCompartmentsTree();
  const configured = data?.configured ?? false;
  const root = data?.root ?? null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-8">
      <div className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600">
              <Network className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Compartment tree</h1>
              {data?.tenancyName ? (
                <p className="text-sm text-gray-500">Tenancy: {data.tenancyName}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Refresh compartment tree"
          >
            <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {!configured && !isLoading && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Sign in to load compartment data from KeyForge.</p>
        </div>
      )}

      <div className="flex h-[min(620px,calc(100vh-140px))] min-h-[460px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1 md:gap-6">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <CompartmentGraphView
              root={root}
              isLoading={isLoading}
              isError={isError}
              error={error}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <CompartmentPathsView root={!isLoading && !isError ? root : null} />
          </div>
        </div>
      </div>

      {!isLoading && !isError && !root ? (
        <p className="text-sm text-gray-500">No compartment hierarchy returned by the API.</p>
      ) : null}
    </div>
  );
}

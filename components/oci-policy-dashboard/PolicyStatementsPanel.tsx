"use client";

import { ChevronRight } from "lucide-react";
import type { PolicyListStatement } from "@/types/oci-policy";

const ACTION_COLUMN_WIDTH = "3.25rem";
const STATEMENT_TH =
  "px-3 py-2 text-left text-[11px] font-semibold text-blue-800 uppercase tracking-wide bg-blue-50/80 border-b border-blue-100";
const STATEMENT_TH_CENTER = `${STATEMENT_TH} text-center`;
const STATEMENT_TH_ACTION = `${STATEMENT_TH} text-right`;
const STATEMENT_TD = "px-3 py-2.5 align-top bg-white";
const STATEMENT_TD_ACTION = "px-3 py-2.5 align-top text-right bg-white";

export function formatStatementRef(ref: string | undefined, index: number): string {
  if (!ref) return String(index + 1);
  const stripped = ref.replace(/^#/, "").trim();
  if (/^\d+$/.test(stripped)) return String(Number(stripped) + 1);
  return ref.startsWith("#") ? ref : `#${ref}`;
}

export function PolicyStatementsPanel({
  policyName,
  statements,
  isLoading = false,
  selectedStatementIndex = null,
  onStatementClick,
}: {
  policyName: string;
  statements: PolicyListStatement[];
  isLoading?: boolean;
  selectedStatementIndex?: number | null;
  onStatementClick?: (index: number, statement: PolicyListStatement) => void;
}) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm"
      data-right-sidebar-keep
    >
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-blue-900">
          Policy statements
          <span className="ml-2 font-normal text-gray-500">— {policyName}</span>
        </h2>
      </div>

      {isLoading ? (
        <p className="px-4 py-6 text-sm text-gray-500">Loading statements…</p>
      ) : statements.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-600">
          No statement text returned from the API for {policyName}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: "3.5rem" }} />
              <col />
              <col style={{ width: ACTION_COLUMN_WIDTH }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={STATEMENT_TH_CENTER}>
                  #
                </th>
                <th scope="col" className={STATEMENT_TH}>
                  Statement
                </th>
                <th scope="col" className={STATEMENT_TH_ACTION} aria-label="View scopes">
                  <span className="sr-only">View scopes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {statements.map((statement, index) => {
                const isSelected = selectedStatementIndex === index;

                return (
                  <tr
                    key={`${statement.id}-${index}`}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`Statement ${formatStatementRef(statement.ref, index)}`}
                    onClick={() => onStatementClick?.(index, statement)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onStatementClick?.(index, statement);
                      }
                    }}
                    className={`border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${
                      isSelected
                        ? "bg-blue-50 ring-2 ring-inset ring-blue-300"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td
                      className={`${STATEMENT_TD} font-mono text-xs tabular-nums whitespace-nowrap text-center ${
                        isSelected ? "font-semibold text-blue-700" : "text-slate-500"
                      }`}
                    >
                      {formatStatementRef(statement.ref, index)}
                    </td>
                    <td className={STATEMENT_TD}>
                      <pre
                        className={`m-0 whitespace-pre-wrap font-mono text-sm leading-relaxed [overflow-wrap:anywhere] ${
                          isSelected ? "text-blue-950" : "text-slate-800"
                        }`}
                      >
                        {statement.text}
                      </pre>
                    </td>
                    <td className={STATEMENT_TD_ACTION}>
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white shadow-sm ${
                          isSelected
                            ? "border-blue-400 text-blue-700"
                            : "border-blue-200 text-blue-600"
                        }`}
                        aria-hidden
                      >
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

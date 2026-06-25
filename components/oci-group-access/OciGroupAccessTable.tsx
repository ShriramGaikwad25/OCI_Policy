"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OciGroupAccessSummary } from "@/types/oci-group";
import { TablePagination } from "@/components/oci-group-access/TablePagination";

const WRAP_CELL = "whitespace-normal break-words [overflow-wrap:anywhere]";
const TH = `px-3 py-3.5 text-left text-[11px] font-semibold text-blue-800 uppercase tracking-wide align-middle bg-blue-50/80 border-b border-blue-100 ${WRAP_CELL}`;
const TH_CENTER = `${TH} text-center`;
const TD = `px-3 py-3 align-top text-sm leading-snug text-gray-800 bg-white ${WRAP_CELL}`;
const TD_CENTER = `${TD} text-center tabular-nums whitespace-nowrap`;
const TD_MUTED = `${TD} text-gray-600`;

export function groupAccessDetailHref(groupName: string): string {
  return `/oci-policy-analysis/group-access/${encodeURIComponent(groupName)}`;
}

export function OciGroupAccessTable({ groups }: { groups: OciGroupAccessSummary[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [groups.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageGroups = groups.slice(start, start + pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: "24%" }} />
            <col />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th scope="col" className={TH}>
                Group
              </th>
              <th scope="col" className={TH}>
                Description
              </th>
              <th scope="col" className={TH_CENTER}>
                Members
              </th>
              <th scope="col" className={TH_CENTER}>
                Statements
              </th>
              <th scope="col" className={TH_CENTER}>
                Resources
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pageGroups.map((group) => (
              <tr key={group.id} className="hover:bg-slate-50">
                <td className={TD}>
                  <Link
                    href={groupAccessDetailHref(group.name)}
                    className={`font-medium text-blue-700 hover:text-blue-900 hover:underline ${WRAP_CELL}`}
                  >
                    {group.name}
                  </Link>
                </td>
                <td className={TD_MUTED}>{group.description || "—"}</td>
                <td className={TD_CENTER}>{group.memberCount.toLocaleString()}</td>
                <td className={TD_CENTER}>{group.statementCount.toLocaleString()}</td>
                <td className={TD_CENTER}>{group.resourceCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        totalItems={groups.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

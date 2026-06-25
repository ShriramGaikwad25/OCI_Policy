"use client";

import { useEffect, useState } from "react";
import type {
  OciGroupMember,
  OciGroupResource,
  OciGroupStatement,
} from "@/types/oci-group";
import { TablePagination } from "@/components/oci-group-access/TablePagination";

const WRAP_CELL = "whitespace-normal break-words [overflow-wrap:anywhere]";
const TH = `px-3 py-3 text-left text-[11px] font-semibold text-blue-800 uppercase tracking-wide align-middle bg-blue-50/80 border-b border-blue-100 ${WRAP_CELL}`;
const TD = `px-3 py-2.5 align-top text-sm leading-snug text-gray-800 bg-white ${WRAP_CELL}`;

function CellValue({ value }: { value: string | undefined }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return <span className={WRAP_CELL}>{value}</span>;
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-gray-500">
        {message}
      </td>
    </tr>
  );
}

function DataTable({
  columns,
  rows,
  emptyMessage,
  colWidths,
}: {
  columns: { key: string; label: string; render: (row: Record<string, string | undefined>) => string | undefined }[];
  rows: Record<string, string | undefined>[];
  emptyMessage: string;
  colWidths?: string[];
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          {colWidths ? (
            <colgroup>
              {colWidths.map((width, index) => (
                <col key={`${width}-${index}`} style={width ? { width } : undefined} />
              ))}
            </colgroup>
          ) : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={TH}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.length === 0 ? (
              <EmptyRow colSpan={columns.length} message={emptyMessage} />
            ) : (
              pageRows.map((row, index) => (
                <tr key={`${row.id ?? start + index}`} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={column.key} className={TD}>
                      <CellValue value={column.render(row)} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 ? (
        <TablePagination
          totalItems={rows.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
}

function memberRows(members: OciGroupMember[]): Record<string, string | undefined>[] {
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    type: member.type,
    status: member.status,
  }));
}

function statementRows(statements: OciGroupStatement[]): Record<string, string | undefined>[] {
  return statements.map((statement) => ({
    id: statement.id,
    policyName: statement.policyName,
    statement: statement.statement,
    verb: statement.verb,
    resource: statement.resource,
    compartment: statement.compartment,
    condition: statement.condition,
  }));
}

function resourceRows(resources: OciGroupResource[]): Record<string, string | undefined>[] {
  return resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    resourceType: resource.resourceType,
    compartment: resource.compartment,
    lifecycleState: resource.lifecycleState,
  }));
}

export function OciGroupMembersTable({ members }: { members: OciGroupMember[] }) {
  return (
    <DataTable
      columns={[
        { key: "name", label: "Name", render: (row) => row.name },
        { key: "email", label: "Email", render: (row) => row.email },
        { key: "type", label: "Type", render: (row) => row.type },
        { key: "status", label: "Status", render: (row) => row.status },
      ]}
      rows={memberRows(members)}
      emptyMessage="No members found for this group."
      colWidths={["28%", "32%", "20%", "20%"]}
    />
  );
}

export function OciGroupStatementsTable({ statements }: { statements: OciGroupStatement[] }) {
  return (
    <DataTable
      columns={[
        { key: "policyName", label: "Policy", render: (row) => row.policyName },
        { key: "statement", label: "Statement", render: (row) => row.statement },
        { key: "verb", label: "Verb", render: (row) => row.verb },
        { key: "resource", label: "Resource", render: (row) => row.resource },
        { key: "compartment", label: "Compartment", render: (row) => row.compartment },
        { key: "condition", label: "Condition", render: (row) => row.condition },
      ]}
      rows={statementRows(statements)}
      emptyMessage="No statements found for this group."
      colWidths={["12%", "", "8%", "10%", "14%", ""]}
    />
  );
}

export function OciGroupResourcesTable({ resources }: { resources: OciGroupResource[] }) {
  return (
    <DataTable
      columns={[
        { key: "name", label: "Name", render: (row) => row.name },
        { key: "resourceType", label: "Type", render: (row) => row.resourceType },
        { key: "compartment", label: "Compartment", render: (row) => row.compartment },
        { key: "lifecycleState", label: "State", render: (row) => row.lifecycleState },
      ]}
      rows={resourceRows(resources)}
      emptyMessage="No resources found for this group."
      colWidths={["28%", "14%", "", "18%"]}
    />
  );
}

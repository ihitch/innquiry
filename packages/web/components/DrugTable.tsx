"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Drug, EntryType, ENTRY_TYPE_COLORS, ENTRY_TYPE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";

const col = createColumnHelper<Drug>();

const columns = [
  col.accessor("inn_name", {
    header: "INN Name",
    cell: (info) => (
      <span className="inline-flex items-center gap-2">
        <span className="font-medium capitalize text-gray-900">{info.getValue()}</span>
        {info.row.original.is_amendment && (
          <span
            title="Amendment to a previously published entry"
            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800"
          >
            Amendment
          </span>
        )}
      </span>
    ),
  }),
  col.accessor("inn_name_latin", {
    header: "Latin",
    cell: (info) => <span className="text-gray-700 italic">{info.getValue() ?? "—"}</span>,
  }),
  col.accessor("entry_type", {
    header: "Type",
    cell: (info) => {
      const type = info.getValue() as EntryType;
      return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ENTRY_TYPE_COLORS[type]}`}>
          {ENTRY_TYPE_LABELS[type]}
        </span>
      );
    },
  }),
  col.accessor("cas_number", {
    header: "CAS Number",
    cell: (info) => {
      const cas = info.getValue();
      if (!cas) return "—";
      return (
        <a
          href={`https://pubchem.ncbi.nlm.nih.gov/#query=${cas}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:underline"
        >
          {cas}
        </a>
      );
    },
  }),
  col.accessor("molecular_formula", {
    header: "Formula",
    cell: (info) => (
      <span className="font-mono text-xs text-gray-800">{info.getValue() ?? "—"}</span>
    ),
  }),
  col.accessor("action_and_use", {
    header: "Action & Use",
    cell: (info) => {
      const val = info.getValue();
      if (!val) return "—";
      return (
        <span title={val} className="line-clamp-2 max-w-xs">
          {val}
        </span>
      );
    },
  }),
  col.accessor("is_recommended", {
    header: "#",
    cell: (info) => (info.getValue() ? "✓" : ""),
  }),
  col.accessor("list_number", {
    header: "List",
  }),
];

interface DrugTableProps {
  data: Drug[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick: (drug: Drug) => void;
}

export function DrugTable({
  data, loading, total, page, pageSize, onPageChange, onRowClick,
}: DrugTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-gray-50">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                  No results found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top text-gray-800">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {total > 0
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total.toLocaleString()}`
            : "0 results"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="px-2 py-1">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Drug, DrugsResponse, EntryType, ENTRY_TYPE_LABELS } from "@/lib/types";
import { DrugTable } from "./DrugTable";
import { FilterBar } from "./FilterBar";

interface DrugsViewProps {
  initialData: Drug[];
  total: number;
  listNumbers: number[];
}

export function DrugsView({ initialData, total: initialTotal, listNumbers }: DrugsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<Drug[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/drugs?${searchParams.toString()}`);
      const json: DrugsResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">innquiry</h1>
            <p className="text-sm text-gray-600">WHO International Nonproprietary Names</p>
          </div>
          <span className="text-sm text-gray-700">{total.toLocaleString()} entries</span>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        <FilterBar
          search={searchParams.get("search") || ""}
          action={searchParams.get("action") || ""}
          type={(searchParams.get("type") || "") as EntryType | ""}
          list={searchParams.get("list") || ""}
          listNumbers={listNumbers}
          onSearch={(v) => updateParam("search", v)}
          onAction={(v) => updateParam("action", v)}
          onType={(v) => updateParam("type", v)}
          onList={(v) => updateParam("list", v)}
        />

        <DrugTable
          data={data}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onRowClick={setSelectedDrug}
        />
      </main>

      {selectedDrug && (
        <DrugDetail drug={selectedDrug} onClose={() => setSelectedDrug(null)} />
      )}
    </div>
  );
}

const PDF_BUCKET_URL =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "") + "/storage/v1/object/public/inn-pdfs";

function buildPdfUrl(drug: Drug): string {
  const pdfFile = `${PDF_BUCKET_URL}/pl${drug.list_number}.pdf`;
  const viewer = `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfFile)}`;
  const hash: string[] = [];
  if (drug.source_page) hash.push(`page=${drug.source_page}`);
  const term = drug.inn_name_latin || drug.inn_name;
  if (term) hash.push(`search=${encodeURIComponent(term)}&phrase=true&highlightall=true`);
  return hash.length ? `${viewer}#${hash.join("&")}` : viewer;
}

function DrugDetail({ drug, onClose }: { drug: Drug; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold capitalize text-gray-900">{drug.inn_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <dl className="space-y-4 text-sm">
          {drug.inn_name_latin && <Field label="Latin INN" value={drug.inn_name_latin} />}
          {drug.inn_name_french && <Field label="French INN" value={drug.inn_name_french} />}
          {drug.inn_name_spanish && <Field label="Spanish INN" value={drug.inn_name_spanish} />}
          <Field label="Type" value={ENTRY_TYPE_LABELS[drug.entry_type]} />
          {drug.cas_number && (
            <div>
              <dt className="font-medium text-gray-500">CAS Number</dt>
              <dd>
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/#query=${drug.cas_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {drug.cas_number}
                </a>
              </dd>
            </div>
          )}
          {drug.molecular_formula && <Field label="Molecular Formula" value={drug.molecular_formula} />}
          {drug.action_and_use && <Field label="Action & Use (EN)" value={drug.action_and_use} />}
          {drug.action_and_use_french && <Field label="Action & Use (FR)" value={drug.action_and_use_french} />}
          {drug.action_and_use_spanish && <Field label="Action & Use (ES)" value={drug.action_and_use_spanish} />}
          {drug.chemical_name && (
            <div>
              <dt className="font-medium text-gray-500">Chemical Name (EN)</dt>
              <dd className="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-words">{drug.chemical_name}</dd>
            </div>
          )}
          <Field label="INN List" value={String(drug.list_number)} />
          {drug.publication_date && <Field label="Publication Date" value={drug.publication_date} />}
          {drug.list_number && (
            <div>
              <dt className="font-medium text-gray-500">Source</dt>
              <dd className="mt-0.5">
                <a
                  href={buildPdfUrl(drug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                >
                  View in PDF{drug.source_page ? ` (page ${drug.source_page})` : ""} →
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{value}</dd>
    </div>
  );
}

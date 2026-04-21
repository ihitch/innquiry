import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { Drug } from "@/lib/types";

const CSV_COLUMNS: (keyof Drug)[] = [
  "inn_name",
  "inn_name_latin",
  "entry_type",
  "is_recommended",
  "cas_number",
  "molecular_formula",
  "action_and_use",
  "chemical_name",
  "list_number",
  "publication_date",
  "source_page",
];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const search = searchParams.get("search") || "";
  const action = searchParams.get("action") || "";
  const type = searchParams.get("type") || "";
  const list = searchParams.get("list") || "";

  const supabase = createServerClient();

  let query = supabase.from("drugs").select(CSV_COLUMNS.join(",")).order("inn_name");

  if (search) {
    query = query.or(
      `inn_name.ilike.%${search}%,inn_name_latin.ilike.%${search}%,cas_number.ilike.%${search}%`
    );
  }
  if (action) query = query.ilike("action_and_use", `%${action}%`);
  if (type) query = query.eq("entry_type", type);
  if (list) query = query.eq("list_number", parseInt(list));

  const { data, error } = await query;

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const header = CSV_COLUMNS.join(",");
  const rows = (data ?? []).map((row) =>
    CSV_COLUMNS.map((col) => escapeCell((row as unknown as Drug)[col])).join(",")
  );
  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="innquiry-export.csv"`,
    },
  });
}

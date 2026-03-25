import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const search = searchParams.get("search") || "";
  const action = searchParams.get("action") || "";
  const type = searchParams.get("type") || "";
  const list = searchParams.get("list") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
  const sortBy = searchParams.get("sortBy") || "inn_name";
  const sortDir = searchParams.get("sortDir") === "desc" ? false : true;

  const supabase = createServerClient();

  let query = supabase.from("drugs").select("*", { count: "exact" });

  if (search) {
    query = query.or(
      `inn_name.ilike.%${search}%,inn_name_latin.ilike.%${search}%,cas_number.ilike.%${search}%`
    );
  }
  if (action) {
    query = query.ilike("action_and_use", `%${action}%`);
  }
  if (type) {
    query = query.eq("entry_type", type);
  }
  if (list) {
    query = query.eq("list_number", parseInt(list));
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order(sortBy, { ascending: sortDir })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}

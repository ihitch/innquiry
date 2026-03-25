import { createServerClient } from "@/lib/supabase-server";
import { DrugsView } from "@/components/DrugsView";
import { Drug } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DrugsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = createServerClient();

  // Fetch initial data server-side for fast first paint
  const search = params.search || "";
  const action = params.action || "";
  const type = params.type || "";
  const list = params.list || "";
  const page = Math.max(1, parseInt(params.page || "1"));
  const pageSize = 50;

  let query = supabase.from("drugs").select("*", { count: "exact" });
  if (search) {
    query = query.or(
      `inn_name.ilike.%${search}%,inn_name_latin.ilike.%${search}%,cas_number.ilike.%${search}%`
    );
  }
  if (action) query = query.ilike("action_and_use", `%${action}%`);
  if (type) query = query.eq("entry_type", type);
  if (list) query = query.eq("list_number", parseInt(list));

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("inn_name")
    .range(from, from + pageSize - 1);

  // Distinct list numbers for filter selector
  const { data: listsData } = await supabase
    .from("drugs")
    .select("list_number")
    .order("list_number", { ascending: false });

  const listNumbers = [...new Set((listsData ?? []).map((r) => r.list_number))];

  return (
    <DrugsView
      initialData={data as Drug[]}
      total={count ?? 0}
      listNumbers={listNumbers}
    />
  );
}

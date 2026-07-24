import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { supId, sellerName, code, name, region, ordersCount, status } = body;

  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert([
      {
        client_code: code || null,
        seller_code: supId || null,
        seller_name: sellerName || null,
        name,
        region: region || null,
        orders_count: ordersCount ?? 0,
        status: status ?? "Ativo",
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar cliente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    supId: data.seller_code,
    sellerName: data.seller_name,
    code: data.client_code,
    name: data.name,
    region: data.region,
    ordersCount: data.orders_count,
    status: data.status,
  });
}
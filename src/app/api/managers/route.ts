import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { supId, code, name, sellersCount, ordersCount, status } = body;

  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("managers")
    .insert([
      {
        supervisor_id: supId || null,
        code: code || null,
        name,
        sellers_count: sellersCount ?? 0,
        orders_count: ordersCount ?? 0,
        status: status ?? "Ativo",
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar gerente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    supId: data.supervisor_id,
    code: data.code,
    name: data.name,
    sellersCount: data.sellers_count,
    ordersCount: data.orders_count,
    status: data.status,
  });
}
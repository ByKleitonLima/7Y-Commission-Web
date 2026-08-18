import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

// Exclusão por chave composta (entity_type, entity_code, period_from,
// period_to), então usamos POST com corpo JSON em vez de DELETE com
// parâmetro na URL.
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { entityType, entityCode, periodFrom, periodTo } = body;

  if (!entityType || !entityCode) {
    return NextResponse.json(
      { error: "Dados incompletos para remover o ajuste de comissão." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("commission_overrides")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_code", entityCode)
    .eq("period_from", periodFrom || "")
    .eq("period_to", periodTo || "");

  if (error) {
    console.error("Erro ao remover ajuste de comissão:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
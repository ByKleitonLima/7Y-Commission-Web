import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { sellerCode, group } = body;

  if (!sellerCode || !group) {
    return NextResponse.json(
      { error: "Dados incompletos para remover o percentual de comissão." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("seller_group_commission_percents")
    .delete()
    .eq("seller_code", String(sellerCode).trim())
    .eq("group_name", String(group).trim().toUpperCase());

  if (error) {
    console.error("Erro ao remover percentual de comissão por grupo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
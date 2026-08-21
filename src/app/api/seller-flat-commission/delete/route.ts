// src/app/api/seller-flat-commission/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { sellerCode } = body;

  if (!sellerCode) {
    return NextResponse.json(
      { error: "Dados incompletos para remover o percentual flat do vendedor." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("seller_flat_commission_percents")
    .delete()
    .eq("seller_code", String(sellerCode).trim());

  if (error) {
    console.error("Erro ao remover percentual flat do vendedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
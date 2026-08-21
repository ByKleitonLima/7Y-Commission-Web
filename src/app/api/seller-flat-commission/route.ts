// src/app/api/seller-flat-commission/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { sellerCode, percent } = body;

  if (!sellerCode || percent === undefined || percent === null || Number.isNaN(Number(percent))) {
    return NextResponse.json(
      { error: "Dados incompletos para salvar o percentual flat do vendedor." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("seller_flat_commission_percents").upsert(
    [
      {
        seller_code: String(sellerCode).trim(),
        percent: Number(percent),
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "seller_code" }
  );

  if (error) {
    console.error("Erro ao salvar percentual flat do vendedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
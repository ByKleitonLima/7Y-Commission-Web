// src/app/api/manager-seller-commission/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { supervisorId, sellerCode, percent } = body;

  if (!sellerCode || percent === undefined || percent === null || Number.isNaN(Number(percent))) {
    return NextResponse.json(
      { error: "Dados incompletos para salvar o percentual do gerente sobre o vendedor." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("manager_seller_commission_percents").upsert(
    [
      {
        supervisor_id: supervisorId ? String(supervisorId).trim() : null,
        seller_code: String(sellerCode).trim(),
        percent: Number(percent),
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "seller_code" }
  );

  if (error) {
    console.error("Erro ao salvar percentual do gerente sobre o vendedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
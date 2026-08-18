import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const {
    entityType,
    entityCode,
    periodFrom,
    periodTo,
    overrideCommission,
    overridePercent,
    reason,
    updatedBy,
  } = body;

  if (!entityType || !entityCode) {
    return NextResponse.json(
      { error: "Dados incompletos para salvar o ajuste de comissão." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("commission_overrides").upsert(
    [
      {
        entity_type: entityType,
        entity_code: entityCode,
        period_from: periodFrom || "",
        period_to: periodTo || "",
        override_commission: overrideCommission,
        override_percent: overridePercent,
        reason: reason || null,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "entity_type,entity_code,period_from,period_to" }
  );

  if (error) {
    console.error("Erro ao salvar ajuste de comissão:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
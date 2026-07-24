import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const supabaseAdmin = getSupabaseAdmin();

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.supId !== undefined) updateData.supervisor_id = body.supId || null;
  if (body.code !== undefined) updateData.seller_code = body.code;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.status !== undefined) updateData.status = body.status;

  const { error } = await supabaseAdmin.from("sellers").update(updateData).eq("id", params.id);

  if (error) {
    console.error("Erro ao atualizar vendedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("sellers").delete().eq("id", params.id);

  if (error) {
    console.error("Erro ao remover vendedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
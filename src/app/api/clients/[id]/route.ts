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
  if (body.supId !== undefined) updateData.seller_code = body.supId || null;
  if (body.sellerName !== undefined) updateData.seller_name = body.sellerName;
  if (body.code !== undefined) updateData.client_code = body.code;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.region !== undefined) updateData.region = body.region;
  if (body.status !== undefined) updateData.status = body.status;

  const { error } = await supabaseAdmin.from("clients").update(updateData).eq("id", params.id);

  if (error) {
    console.error("Erro ao atualizar cliente:", error);
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
  const { error } = await supabaseAdmin.from("clients").delete().eq("id", params.id);

  if (error) {
    console.error("Erro ao remover cliente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
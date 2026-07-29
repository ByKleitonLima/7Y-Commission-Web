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
  if (body.code !== undefined) updateData.code = body.code;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.cpf !== undefined) updateData.cpf = body.cpf || null;
  if (body.phone !== undefined) updateData.phone = body.phone || null;
  if (body.email !== undefined) updateData.email = body.email || null;
  if (body.role !== undefined) updateData.role = body.role || null;
  if (body.photoUrl !== undefined) updateData.photo_url = body.photoUrl || null;
  if (body.status !== undefined) updateData.status = body.status;

  const { error } = await supabaseAdmin.from("managers").update(updateData).eq("id", params.id);

  if (error) {
    console.error("Erro ao atualizar gerente:", error);
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
  const { error } = await supabaseAdmin.from("managers").delete().eq("id", params.id);

  if (error) {
    console.error("Erro ao remover gerente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
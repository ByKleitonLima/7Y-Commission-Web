import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: "Apenas administradores podem excluir importações." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  // Apaga primeiro as sales_records vinculadas a essa importação, sem
  // depender de um ON DELETE CASCADE configurado (ou não) no banco — essa
  // era a causa de "excluir" o histórico mas os dados continuarem contando
  // no Dashboard.
  const { error: recordsError } = await supabaseAdmin
    .from("sales_records")
    .delete()
    .eq("upload_id", id);

  if (recordsError) {
    console.error("Erro ao remover vendas da importação:", recordsError);
    return NextResponse.json({ error: recordsError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin
    .from("upload_history")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir importação:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
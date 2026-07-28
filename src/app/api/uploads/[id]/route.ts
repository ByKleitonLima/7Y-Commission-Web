import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth"; // Ajustado para pegar qualquer usuário logado
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Alterado: agora valida apenas se o usuário está autenticado no sistema
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Você precisa estar autenticado para excluir importações." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  // Apaga primeiro as sales_records vinculadas a essa importação
  const { error: recordsError } = await supabaseAdmin
    .from("sales_records")
    .delete()
    .eq("upload_id", id);

  if (recordsError) {
    console.error("Erro ao remover vendas da importação:", recordsError);
    return NextResponse.json({ error: recordsError.message }, { status: 500 });
  }

  // Em seguida apaga o registro do histórico
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
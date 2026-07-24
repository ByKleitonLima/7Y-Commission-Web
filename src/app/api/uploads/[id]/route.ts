import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 1. Tipado como Promise
) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: "Apenas administradores podem excluir importações." },
      { status: 403 }
    );
  }

  // 2. Unwrapping do params com await
  const { id } = await params;

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("upload_history")
    .delete()
    .eq("id", id); // 3. Usando a variável desestruturada

  if (error) {
    console.error("Erro ao excluir importação:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
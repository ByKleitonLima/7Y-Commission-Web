import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/verifyAuth";
import { firebaseAdminDb } from "@/lib/firebaseAdmin";
import { ALL_PAGE_HREFS, ADMIN_ONLY_HREFS_SET } from "@/lib/permissions";

// Atualiza role e/ou allowedPages de um usuário. Só Admin pode chamar.
export async function PATCH(req: NextRequest, { params }: { params: { uid: string } }) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  const { uid } = params;
  const body = await req.json();
  const { role, allowedPages } = body;

  if (role !== undefined && !["Admin", "Usuário"].includes(role)) {
    return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
  }

  // Impede o próprio Admin de se rebaixar e ficar trancado para fora.
  if (uid === admin.uid && role && role !== "Admin") {
    return NextResponse.json(
      { error: "Você não pode remover seu próprio acesso de administrador." },
      { status: 400 }
    );
  }

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (role) updateData.role = role;

  if (Array.isArray(allowedPages)) {
    updateData.allowedPages = allowedPages.filter(
      (h: unknown) =>
        typeof h === "string" && ALL_PAGE_HREFS.includes(h) && !ADMIN_ONLY_HREFS_SET.has(h)
    );
  }

  try {
    await firebaseAdminDb.collection("users").doc(uid).set(updateData, { merge: true });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao atualizar usuário:", err);
    return NextResponse.json({ error: err.message || "Erro ao atualizar usuário." }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/verifyAuth";
import { firebaseAdminDb } from "@/lib/firebaseAdmin";
import { ALL_PAGE_HREFS } from "@/lib/permissions";

// Rota de uso único: promove o usuário JÁ AUTENTICADO a Admin, desde que
// ele informe o segredo configurado em BOOTSTRAP_ADMIN_SECRET. Depois de
// usar, remova essa variável de ambiente (ou troque o valor) para desativar
// essa porta de entrada.
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const secretEnv = process.env.BOOTSTRAP_ADMIN_SECRET;
  if (!secretEnv) {
    return NextResponse.json(
      { error: "BOOTSTRAP_ADMIN_SECRET não configurado no servidor." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (body.secret !== secretEnv) {
    return NextResponse.json({ error: "Segredo inválido." }, { status: 403 });
  }

  await firebaseAdminDb.collection("users").doc(user.uid).set(
    {
      role: "Admin",
      allowedPages: ALL_PAGE_HREFS,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );

  return NextResponse.json({ success: true });
}
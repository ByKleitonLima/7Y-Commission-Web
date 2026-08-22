import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/verifyAuth";
import { firebaseAdminAuth, firebaseAdminDb } from "@/lib/firebaseAdmin";
import { ALL_PAGE_HREFS } from "@/lib/permissions";

// Lista todos os usuários do Firebase Auth, combinando com os dados de
// role/allowedPages salvos no Firestore ("users/{uid}"). Só Admin acessa.
export async function GET(req: NextRequest) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  try {
    // listUsers pagina de 1000 em 1000. Para bases maiores, seria preciso
    // percorrer pageToken em loop — deixado simples por enquanto.
    const listResult = await firebaseAdminAuth.listUsers(1000);
    const snapshot = await firebaseAdminDb.collection("users").get();
    const docsByUid = new Map(snapshot.docs.map((d) => [d.id, d.data()]));

    const users = listResult.users.map((u) => {
      const docData: any = docsByUid.get(u.uid) || {};
      const role = docData.role === "Admin" ? "Admin" : "Usuário";
      return {
        uid: u.uid,
        email: u.email || "",
        name: docData.name || u.email?.split("@")[0] || "Usuário",
        role,
        allowedPages:
          role === "Admin"
            ? ALL_PAGE_HREFS
            : Array.isArray(docData.allowedPages)
              ? docData.allowedPages
              : [],
        disabled: u.disabled,
        createdAt: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
      };
    });

    users.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return NextResponse.json({ users, allPages: ALL_PAGE_HREFS });
  } catch (err: any) {
    console.error("Erro ao listar usuários:", err);
    return NextResponse.json({ error: err.message || "Erro ao listar usuários." }, { status: 500 });
  }
}
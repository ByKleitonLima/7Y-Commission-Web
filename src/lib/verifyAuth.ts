import { NextRequest } from "next/server";
import { firebaseAdminAuth, firebaseAdminDb } from "@/lib/firebaseAdmin";

export async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);

  try {
    return await firebaseAdminAuth.verifyIdToken(token);
  } catch (err) {
    console.error("Token do Firebase inválido:", err);
    return null;
  }
}

const ADMIN_ROLE = "Admin";

export async function getAuthenticatedAdmin(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return null;

  try {
    const snapshot = await firebaseAdminDb.collection("users").doc(user.uid).get();
    const role = snapshot.exists ? snapshot.data()?.role : null;

    if (role !== ADMIN_ROLE) return null;
    return user;
  } catch (err) {
    console.error("Erro ao verificar permissão de administrador:", err);
    return null;
  }
}
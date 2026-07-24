import { NextRequest } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebaseAdmin";

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
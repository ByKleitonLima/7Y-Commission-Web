"use client";

import { auth } from "@/lib/firebase";

export async function authFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const token = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Erro na requisição (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}
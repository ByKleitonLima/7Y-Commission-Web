import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getAuthenticatedAdmin } from "@/lib/verifyAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

// Qualquer usuário autenticado pode REGISTRAR uma ação sua (é assim que
// as telas vão chamar logAudit() depois de criar/editar/excluir algo).
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const {
    action,
    entityType,
    entityId,
    entityLabel,
    description,
    changes,
    metadata,
    userName,
    userEmail,
  } = body;

  if (!action || !entityType) {
    return NextResponse.json(
      { error: "Dados incompletos para registrar o log." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("audit_logs").insert([
    {
      user_id: user.uid,
      user_name: userName || user.email?.split("@")[0] || "Usuário",
      user_email: userEmail || user.email || null,
      action,
      entity_type: entityType,
      entity_id: entityId !== undefined && entityId !== null ? String(entityId) : null,
      entity_label: entityLabel || null,
      description: description || null,
      changes: changes ?? null,
      metadata: metadata ?? null,
    },
  ]);

  if (error) {
    console.error("Erro ao registrar log de auditoria:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Só Admin pode LISTAR os logs (painel de auditoria).
export async function GET(req: NextRequest) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: "Acesso restrito a administradores." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const search = searchParams.get("search");
  const page = Number(searchParams.get("page") || "0");
  const pageSize = Math.min(Number(searchParams.get("pageSize") || "50"), 200);

  const supabaseAdmin = getSupabaseAdmin();

  let query = supabaseAdmin.from("audit_logs").select("*", { count: "exact" });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (userId) query = query.eq("user_id", userId);
  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);
  if (search) {
    const like = `%${search}%`;
    query = query.or(
      `entity_label.ilike.${like},description.ilike.${like},user_name.ilike.${like},user_email.ilike.${like}`
    );
  }

  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (error) {
    console.error("Erro ao buscar logs de auditoria:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [], total: count || 0 });
}
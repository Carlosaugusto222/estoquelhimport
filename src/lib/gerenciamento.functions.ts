import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("admin_listar_usuarios");
    if (error) throw new Error(error.message);
    return ((data as Array<{ id: string; email: string | null; created_at: string; last_sign_in_at: string | null; is_admin: boolean }>) ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      is_admin: u.is_admin,
      is_self: u.id === context.userId,
    }));
  });

export const definirAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ user_id: z.string().uuid(), tornar_admin: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin, error: chkErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (chkErr) throw new Error(chkErr.message);
    if (!isAdmin) throw new Error("Acesso restrito a administradores");
    if (data.user_id === context.userId && !data.tornar_admin) {
      throw new Error("Você não pode remover seu próprio acesso de administrador");
    }
    if (data.tornar_admin) {
      const { error } = await context.supabase
        .from("user_roles")
        .insert({ user_id: data.user_id, role: "admin" });
      if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).rpc("admin_excluir_usuario", {
      _user_id: data.user_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type MovimentacaoDetalhada = {
  id: string;
  created_at: string;
  tipo: "entrada" | "saida" | string;
  quantidade: number;
  observacoes: string | null;
  produto_id: string | null;
  produto_categoria: string | null;
  produto_modelo: string | null;
  produto_qualidade: string | null;
  produto_tier: string | null;
  user_id: string | null;
  user_email: string | null;
};

export const listarMovimentacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MovimentacaoDetalhada[]> => {
    const { data, error } = await (context.supabase as any).rpc(
      "admin_listar_movimentacoes",
    );
    if (error) throw new Error(error.message);
    return (data ?? []) as MovimentacaoDetalhada[];
  });
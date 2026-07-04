
-- 1) Revogar EXECUTE de public/anon nas SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_oldest_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_oldest_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_listar_usuarios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_listar_movimentacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_movimentacoes() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_excluir_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aplicar_movimentacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aplicar_movimentacao() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;

-- 2) Proteger admin principal — reescreve admin_excluir_usuario
CREATE OR REPLACE FUNCTION public.admin_excluir_usuario(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta';
  END IF;
  IF public.is_oldest_admin(_user_id) THEN
    RAISE EXCEPTION 'O administrador principal não pode ser excluído';
  END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_excluir_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario(uuid) TO authenticated, service_role;

-- 3) Impedir remoção do papel admin do administrador principal via RLS
DROP POLICY IF EXISTS "admin gerencia papéis" ON public.user_roles;
CREATE POLICY "admin gerencia papéis (insert/update)"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin remove papéis (exceto principal)"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND NOT (role = 'admin' AND public.is_oldest_admin(user_id))
  );

-- 4) Movimentações: todos os admins podem ver todas
DROP POLICY IF EXISTS "ler movimentacoes" ON public.movimentacoes;
CREATE POLICY "ler movimentacoes"
  ON public.movimentacoes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- 5) Validação de dados em movimentacoes (evita estoque negativo por bug)
ALTER TABLE public.movimentacoes
  DROP CONSTRAINT IF EXISTS movimentacoes_tipo_check,
  DROP CONSTRAINT IF EXISTS movimentacoes_quantidade_check;

ALTER TABLE public.movimentacoes
  ADD CONSTRAINT movimentacoes_tipo_check
    CHECK (tipo IN ('entrada','saida')),
  ADD CONSTRAINT movimentacoes_quantidade_check
    CHECK (quantidade > 0);

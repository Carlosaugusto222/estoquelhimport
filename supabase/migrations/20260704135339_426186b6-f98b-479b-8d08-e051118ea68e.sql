
CREATE OR REPLACE FUNCTION public.is_oldest_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1
  ) AND (
    SELECT user_id FROM public.user_roles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1
  ) = _user_id
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_movimentacoes()
RETURNS TABLE(id uuid, created_at timestamp with time zone, tipo text, quantidade integer, observacoes text, produto_id uuid, produto_categoria text, produto_modelo text, produto_qualidade text, produto_tier text, user_id uuid, user_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_oldest_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito ao administrador principal';
  END IF;
  RETURN QUERY
  SELECT m.id, m.created_at, m.tipo, m.quantidade, m.observacoes, m.produto_id,
         p.categoria, p.modelo, p.qualidade, p.tier,
         m.user_id, u.email::text
    FROM public.movimentacoes m
    LEFT JOIN public.produtos p ON p.id = m.produto_id
    LEFT JOIN auth.users u ON u.id = m.user_id
   ORDER BY m.created_at DESC;
END;
$$;

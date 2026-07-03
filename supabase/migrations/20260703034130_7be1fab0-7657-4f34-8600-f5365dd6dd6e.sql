CREATE OR REPLACE FUNCTION public.admin_listar_movimentacoes()
RETURNS TABLE(
  id uuid,
  created_at timestamp with time zone,
  tipo text,
  quantidade integer,
  observacoes text,
  produto_id uuid,
  produto_categoria text,
  produto_modelo text,
  produto_qualidade text,
  produto_tier text,
  user_id uuid,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;
  RETURN QUERY
  SELECT m.id,
         m.created_at,
         m.tipo,
         m.quantidade,
         m.observacoes,
         m.produto_id,
         p.categoria AS produto_categoria,
         p.modelo AS produto_modelo,
         p.qualidade AS produto_qualidade,
         p.tier AS produto_tier,
         m.user_id,
         u.email::text AS user_email
    FROM public.movimentacoes m
    LEFT JOIN public.produtos p ON p.id = m.produto_id
    LEFT JOIN auth.users u ON u.id = m.user_id
   ORDER BY m.created_at DESC;
END;
$function$;
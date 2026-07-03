
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Tabela de papéis
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função has_role (security definer para evitar recursão nas policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Policies de user_roles
CREATE POLICY "usuário vê seus papéis"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin gerencia papéis"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bootstrap: qualquer usuário autenticado pode se tornar admin se ainda não existir nenhum
CREATE POLICY "primeiro admin (bootstrap)"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  );

-- Substitui policies de produtos: leitura para o dono; escrita só admin
DROP POLICY IF EXISTS "own produtos" ON public.produtos;

CREATE POLICY "ler produtos"
  ON public.produtos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin cadastra produtos"
  ON public.produtos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin edita produtos"
  ON public.produtos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin exclui produtos"
  ON public.produtos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Substitui policies de movimentacoes: leitura para o dono; escrita só admin
DROP POLICY IF EXISTS "own movimentacoes" ON public.movimentacoes;

CREATE POLICY "ler movimentacoes"
  ON public.movimentacoes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin cria movimentacoes"
  ON public.movimentacoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin exclui movimentacoes"
  ON public.movimentacoes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

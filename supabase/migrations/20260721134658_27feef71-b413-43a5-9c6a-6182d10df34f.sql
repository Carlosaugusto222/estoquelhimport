
DROP POLICY IF EXISTS "ler produtos" ON public.produtos;
CREATE POLICY "ler produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ler movimentacoes" ON public.movimentacoes;
CREATE POLICY "ler movimentacoes" ON public.movimentacoes
  FOR SELECT TO authenticated
  USING (true);

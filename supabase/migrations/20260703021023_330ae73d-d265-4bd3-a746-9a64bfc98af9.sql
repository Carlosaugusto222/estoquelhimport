
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('tela','bateria')),
  modelo TEXT NOT NULL,
  qualidade TEXT,
  tier TEXT CHECK (tier IN ('ecoline','premium') OR tier IS NULL),
  fornecedor TEXT,
  data_compra DATE,
  tem_garantia BOOLEAN NOT NULL DEFAULT false,
  numero_serie TEXT,
  preco_custo NUMERIC(10,2),
  preco_venda NUMERIC(10,2),
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own produtos" ON public.produtos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own movimentacoes" ON public.movimentacoes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_produtos_user ON public.produtos(user_id);
CREATE INDEX idx_mov_produto ON public.movimentacoes(produto_id);

-- Atualiza estoque_atual automaticamente
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.produtos
      SET estoque_atual = estoque_atual + CASE WHEN NEW.tipo='entrada' THEN NEW.quantidade ELSE -NEW.quantidade END,
          updated_at = now()
      WHERE id = NEW.produto_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.produtos
      SET estoque_atual = estoque_atual - CASE WHEN OLD.tipo='entrada' THEN OLD.quantidade ELSE -OLD.quantidade END,
          updated_at = now()
      WHERE id = OLD.produto_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_movimentacoes
AFTER INSERT OR DELETE ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_produtos_updated
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

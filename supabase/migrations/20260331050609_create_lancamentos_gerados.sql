CREATE TABLE IF NOT EXISTS public.lancamentos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID NOT NULL REFERENCES public.importacoes(id) ON DELETE CASCADE,
  data DATE,
  conta_debito TEXT,
  conta_credito TEXT,
  valor NUMERIC,
  tipo TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lancamentos_gerados ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DROP POLICY IF EXISTS "auth_all" ON public.lancamentos_gerados;
CREATE POLICY "auth_all" ON public.lancamentos_gerados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed some initial data for testing if table is empty
DO $$
DECLARE
  v_importacao_id UUID;
BEGIN
  -- Get any existing importacao to link our seed data to
  SELECT id INTO v_importacao_id FROM public.importacoes LIMIT 1;
  
  IF v_importacao_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.lancamentos_gerados LIMIT 1) THEN
      INSERT INTO public.lancamentos_gerados (importacao_id, data, conta_debito, conta_credito, valor, tipo, status)
      VALUES 
        (v_importacao_id, '2023-12-01'::date, '1.1.1.01.0001', '2.1.1.01.0001', 1500.50, 'Ajuste', 'Pendente'),
        (v_importacao_id, '2023-12-05'::date, '1.1.1.02.0001', '3.1.1.01.0001', 3200.00, 'Reclassificação', 'Aprovado'),
        (v_importacao_id, '2023-12-10'::date, '2.1.1.01.0001', '1.1.1.01.0001', 450.75, 'Normal', 'Aprovado');
    END IF;
  END IF;
END $$;

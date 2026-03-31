ALTER TABLE public.plano_contas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.plano_contas ALTER COLUMN importacao_id DROP NOT NULL;
ALTER TABLE public.plano_contas ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE public.plano_contas ADD COLUMN IF NOT EXISTS natureza TEXT;
ALTER TABLE public.plano_contas ADD COLUMN IF NOT EXISTS finalidade TEXT;

DO $
BEGIN
  UPDATE public.plano_contas pc
  SET user_id = i.user_id
  FROM public.importacoes i
  WHERE pc.importacao_id = i.id AND pc.user_id IS NULL;
END $;

DROP POLICY IF EXISTS "auth_plano_contas_all" ON public.plano_contas;
CREATE POLICY "auth_plano_contas_all" ON public.plano_contas
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR importacao_id IN (SELECT id FROM public.importacoes WHERE user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR importacao_id IN (SELECT id FROM public.importacoes WHERE user_id = auth.uid()));

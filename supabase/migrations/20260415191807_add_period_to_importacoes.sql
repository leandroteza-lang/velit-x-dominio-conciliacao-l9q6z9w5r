ALTER TABLE public.importacoes ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.importacoes ADD COLUMN IF NOT EXISTS data_fim DATE;
ALTER TABLE public.importacoes ADD COLUMN IF NOT EXISTS descricao TEXT;

CREATE TABLE IF NOT EXISTS public.plano_contas_backup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_date TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL
);

ALTER TABLE public.plano_contas_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_plano_contas_backup_all" ON public.plano_contas_backup;
CREATE POLICY "auth_plano_contas_backup_all" ON public.plano_contas_backup 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

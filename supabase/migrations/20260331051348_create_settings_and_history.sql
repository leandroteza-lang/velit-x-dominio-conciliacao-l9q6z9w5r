-- CREATE TABLES
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    export_directory TEXT DEFAULT '',
    csv_separator TEXT DEFAULT ';',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    number_format TEXT DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_user_settings_select" ON public.user_settings;
CREATE POLICY "auth_user_settings_select" ON public.user_settings
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_user_settings_insert" ON public.user_settings;
CREATE POLICY "auth_user_settings_insert" ON public.user_settings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_user_settings_update" ON public.user_settings;
CREATE POLICY "auth_user_settings_update" ON public.user_settings
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    export_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL,
    records_count INTEGER DEFAULT 0,
    CONSTRAINT fk_user_history FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_export_history_select" ON public.export_history;
CREATE POLICY "auth_export_history_select" ON public.export_history
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_export_history_insert" ON public.export_history;
CREATE POLICY "auth_export_history_insert" ON public.export_history
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_export_history_delete" ON public.export_history;
CREATE POLICY "auth_export_history_delete" ON public.export_history
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SEED DATA
DO $$
DECLARE
  leandro_id UUID;
BEGIN
  SELECT id INTO leandro_id FROM auth.users WHERE email = 'leandro_teza@hotmail.com' LIMIT 1;
  IF leandro_id IS NOT NULL THEN
    INSERT INTO public.user_settings (user_id, export_directory, csv_separator, date_format, number_format)
    VALUES (leandro_id, 'C:/Exportacoes/', ';', 'DD/MM/YYYY', 'pt-BR')
    ON CONFLICT (user_id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM public.export_history WHERE user_id = leandro_id) THEN
      INSERT INTO public.export_history (user_id, file_name, type, records_count)
      VALUES 
        (leandro_id, 'lancamentos_20231001.txt', 'Lançamentos', 150),
        (leandro_id, 'resumo_contas_20231001.xlsx', 'Resumo', 45);
    END IF;
  END IF;
END $$;

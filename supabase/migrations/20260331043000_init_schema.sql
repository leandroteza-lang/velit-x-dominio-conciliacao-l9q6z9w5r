-- Seed user leandro_teza@hotmail.com
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'leandro_teza@hotmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'leandro_teza@hotmail.com',
      crypt('securepassword123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Leandro Teza"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );
  END IF;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS public.importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT,
  classificacao TEXT,
  nome TEXT,
  descricao TEXT,
  mascara TEXT
);

CREATE TABLE IF NOT EXISTS public.balancete_dominio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT,
  classificacao TEXT,
  saldo_anterior NUMERIC,
  debito NUMERIC,
  credito NUMERIC,
  saldo_atual NUMERIC
);

CREATE TABLE IF NOT EXISTS public.balancete_velit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  conta_contabil TEXT,
  descricao TEXT,
  saldo_anterior NUMERIC,
  debito NUMERIC,
  credito NUMERIC,
  saldo_atual NUMERIC
);

CREATE TABLE IF NOT EXISTS public.razao_dominio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  conta TEXT,
  data DATE,
  historico TEXT,
  debito NUMERIC,
  credito NUMERIC,
  saldo NUMERIC
);

CREATE TABLE IF NOT EXISTS public.razao_velit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  conta TEXT,
  data DATE,
  historico TEXT,
  debito NUMERIC,
  credito NUMERIC,
  saldo NUMERIC
);

CREATE TABLE IF NOT EXISTS public.conciliacao_balancetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  conta_contabil TEXT,
  descricao TEXT,
  saldo_dominio NUMERIC,
  saldo_velit NUMERIC,
  diferenca NUMERIC,
  status TEXT
);

CREATE TABLE IF NOT EXISTS public.conciliacao_razoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  conta TEXT,
  divergencia NUMERIC,
  status TEXT
);

CREATE TABLE IF NOT EXISTS public.razao_conferencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  conta TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS public.lancamentos_dominio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  conta TEXT,
  valor NUMERIC,
  data DATE
);

CREATE TABLE IF NOT EXISTS public.resumo_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID REFERENCES public.importacoes(id) ON DELETE CASCADE NOT NULL,
  total_velit NUMERIC,
  total_dominio NUMERIC
);

-- Enable RLS
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balancete_dominio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balancete_velit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razao_dominio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razao_velit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliacao_balancetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliacao_razoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razao_conferencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_dominio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumo_lancamentos ENABLE ROW LEVEL SECURITY;

-- Create Policies (allow authenticated users to read/write all rows in their scope, using true for simplicity as per spec)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "auth_all" ON public.%I FOR ALL TO authenticated USING (true)', t);
  END LOOP;
END $$;

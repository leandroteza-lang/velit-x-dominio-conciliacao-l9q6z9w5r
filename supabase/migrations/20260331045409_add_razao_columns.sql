DO $$
BEGIN
  ALTER TABLE public.razao_dominio ADD COLUMN IF NOT EXISTS partida text;
  ALTER TABLE public.razao_dominio ADD COLUMN IF NOT EXISTS contra text;
  ALTER TABLE public.razao_dominio ADD COLUMN IF NOT EXISTS status text;
  ALTER TABLE public.razao_dominio ADD COLUMN IF NOT EXISTS linha_cliente text;
END $$;

-- Insert some dummy data for testing if no records exist
DO $$
DECLARE
  v_user_id uuid;
  v_import_id uuid;
BEGIN
  -- Get an existing user
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Get or create an importacao
    SELECT id INTO v_import_id FROM public.importacoes WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 1;
    
    IF v_import_id IS NULL THEN
      v_import_id := gen_random_uuid();
      INSERT INTO public.importacoes (id, user_id, status) VALUES (v_import_id, v_user_id, 'COMPLETED');
    END IF;

    -- Add mock records to razao_dominio if empty
    IF NOT EXISTS (SELECT 1 FROM public.razao_dominio WHERE importacao_id = v_import_id AND status IS NOT NULL) THEN
      INSERT INTO public.razao_dominio (importacao_id, data, partida, contra, historico, debito, credito, saldo, status, linha_cliente) VALUES
      (v_import_id, '2023-01-01', '1001', '2001', 'Saldo Inicial de Caixa', 1000.00, 0, 1000.00, 'SALDO_INICIAL', 'L-001'),
      (v_import_id, '2023-01-02', '1002', '2002', 'Pagamento de Fornecedor X', 0, 500.00, 500.00, 'ENCONTRADO', 'L-002'),
      (v_import_id, '2023-01-03', '1003', '2003', 'Recebimento de Cliente Y', 1500.00, 0, 2000.00, 'ENCONTRADO', 'L-003'),
      (v_import_id, '2023-01-04', '1004', '2004', 'Despesa não identificada', 0, 200.00, 1800.00, 'NAO_ENCONTRADO', 'L-004'),
      (v_import_id, '2023-01-05', '1005', '2005', 'Transferência de saldo', 500.00, 0, 2300.00, 'ENCONTRADO', 'L-005'),
      (v_import_id, '2023-01-06', '1006', '2006', 'Pagamento de Imposto', 0, 300.00, 2000.00, 'NAO_ENCONTRADO', 'L-006');
    END IF;
  END IF;
END $$;

// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4'
  }
  public: {
    Tables: {
      balancete_dominio: {
        Row: {
          classificacao: string | null
          codigo: string | null
          credito: number | null
          debito: number | null
          id: string
          importacao_id: string
          saldo_anterior: number | null
          saldo_atual: number | null
        }
        Insert: {
          classificacao?: string | null
          codigo?: string | null
          credito?: number | null
          debito?: number | null
          id?: string
          importacao_id: string
          saldo_anterior?: number | null
          saldo_atual?: number | null
        }
        Update: {
          classificacao?: string | null
          codigo?: string | null
          credito?: number | null
          debito?: number | null
          id?: string
          importacao_id?: string
          saldo_anterior?: number | null
          saldo_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'balancete_dominio_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      balancete_velit: {
        Row: {
          conta_contabil: string | null
          credito: number | null
          debito: number | null
          descricao: string | null
          id: string
          importacao_id: string
          saldo_anterior: number | null
          saldo_atual: number | null
        }
        Insert: {
          conta_contabil?: string | null
          credito?: number | null
          debito?: number | null
          descricao?: string | null
          id?: string
          importacao_id: string
          saldo_anterior?: number | null
          saldo_atual?: number | null
        }
        Update: {
          conta_contabil?: string | null
          credito?: number | null
          debito?: number | null
          descricao?: string | null
          id?: string
          importacao_id?: string
          saldo_anterior?: number | null
          saldo_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'balancete_velit_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      conciliacao_balancetes: {
        Row: {
          conta_contabil: string | null
          descricao: string | null
          diferenca: number | null
          id: string
          importacao_id: string
          saldo_dominio: number | null
          saldo_velit: number | null
          status: string | null
        }
        Insert: {
          conta_contabil?: string | null
          descricao?: string | null
          diferenca?: number | null
          id?: string
          importacao_id: string
          saldo_dominio?: number | null
          saldo_velit?: number | null
          status?: string | null
        }
        Update: {
          conta_contabil?: string | null
          descricao?: string | null
          diferenca?: number | null
          id?: string
          importacao_id?: string
          saldo_dominio?: number | null
          saldo_velit?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'conciliacao_balancetes_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      conciliacao_razoes: {
        Row: {
          conta: string | null
          divergencia: number | null
          id: string
          importacao_id: string
          status: string | null
        }
        Insert: {
          conta?: string | null
          divergencia?: number | null
          id?: string
          importacao_id: string
          status?: string | null
        }
        Update: {
          conta?: string | null
          divergencia?: number | null
          id?: string
          importacao_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'conciliacao_razoes_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      importacoes: {
        Row: {
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      lancamentos_dominio: {
        Row: {
          conta: string | null
          data: string | null
          id: string
          importacao_id: string
          valor: number | null
        }
        Insert: {
          conta?: string | null
          data?: string | null
          id?: string
          importacao_id: string
          valor?: number | null
        }
        Update: {
          conta?: string | null
          data?: string | null
          id?: string
          importacao_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'lancamentos_dominio_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      lancamentos_gerados: {
        Row: {
          conta_credito: string | null
          conta_debito: string | null
          created_at: string | null
          data: string | null
          id: string
          importacao_id: string
          status: string | null
          tipo: string | null
          valor: number | null
        }
        Insert: {
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string | null
          data?: string | null
          id?: string
          importacao_id: string
          status?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Update: {
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string | null
          data?: string | null
          id?: string
          importacao_id?: string
          status?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'lancamentos_gerados_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      plano_contas: {
        Row: {
          classificacao: string | null
          codigo: string | null
          descricao: string | null
          id: string
          importacao_id: string
          mascara: string | null
          nome: string | null
        }
        Insert: {
          classificacao?: string | null
          codigo?: string | null
          descricao?: string | null
          id?: string
          importacao_id: string
          mascara?: string | null
          nome?: string | null
        }
        Update: {
          classificacao?: string | null
          codigo?: string | null
          descricao?: string | null
          id?: string
          importacao_id?: string
          mascara?: string | null
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'plano_contas_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      razao_conferencia: {
        Row: {
          conta: string | null
          id: string
          importacao_id: string
          status: string | null
        }
        Insert: {
          conta?: string | null
          id?: string
          importacao_id: string
          status?: string | null
        }
        Update: {
          conta?: string | null
          id?: string
          importacao_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'razao_conferencia_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      razao_dominio: {
        Row: {
          conta: string | null
          contra: string | null
          credito: number | null
          data: string | null
          debito: number | null
          historico: string | null
          id: string
          importacao_id: string
          linha_cliente: string | null
          partida: string | null
          saldo: number | null
          status: string | null
        }
        Insert: {
          conta?: string | null
          contra?: string | null
          credito?: number | null
          data?: string | null
          debito?: number | null
          historico?: string | null
          id?: string
          importacao_id: string
          linha_cliente?: string | null
          partida?: string | null
          saldo?: number | null
          status?: string | null
        }
        Update: {
          conta?: string | null
          contra?: string | null
          credito?: number | null
          data?: string | null
          debito?: number | null
          historico?: string | null
          id?: string
          importacao_id?: string
          linha_cliente?: string | null
          partida?: string | null
          saldo?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'razao_dominio_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      razao_velit: {
        Row: {
          conta: string | null
          credito: number | null
          data: string | null
          debito: number | null
          historico: string | null
          id: string
          importacao_id: string
          saldo: number | null
        }
        Insert: {
          conta?: string | null
          credito?: number | null
          data?: string | null
          debito?: number | null
          historico?: string | null
          id?: string
          importacao_id: string
          saldo?: number | null
        }
        Update: {
          conta?: string | null
          credito?: number | null
          data?: string | null
          debito?: number | null
          historico?: string | null
          id?: string
          importacao_id?: string
          saldo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'razao_velit_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
      resumo_lancamentos: {
        Row: {
          id: string
          importacao_id: string
          total_dominio: number | null
          total_velit: number | null
        }
        Insert: {
          id?: string
          importacao_id: string
          total_dominio?: number | null
          total_velit?: number | null
        }
        Update: {
          id?: string
          importacao_id?: string
          total_dominio?: number | null
          total_velit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'resumo_lancamentos_importacao_id_fkey'
            columns: ['importacao_id']
            isOneToOne: false
            referencedRelation: 'importacoes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: balancete_dominio
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   codigo: text (nullable)
//   classificacao: text (nullable)
//   saldo_anterior: numeric (nullable)
//   debito: numeric (nullable)
//   credito: numeric (nullable)
//   saldo_atual: numeric (nullable)
// Table: balancete_velit
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   conta_contabil: text (nullable)
//   descricao: text (nullable)
//   saldo_anterior: numeric (nullable)
//   debito: numeric (nullable)
//   credito: numeric (nullable)
//   saldo_atual: numeric (nullable)
// Table: conciliacao_balancetes
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   conta_contabil: text (nullable)
//   descricao: text (nullable)
//   saldo_dominio: numeric (nullable)
//   saldo_velit: numeric (nullable)
//   diferenca: numeric (nullable)
//   status: text (nullable)
// Table: conciliacao_razoes
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   conta: text (nullable)
//   divergencia: numeric (nullable)
//   status: text (nullable)
// Table: importacoes
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (not null)
//   status: text (not null, default: 'PENDING'::text)
//   created_at: timestamp with time zone (not null, default: now())
// Table: lancamentos_dominio
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   conta: text (nullable)
//   valor: numeric (nullable)
//   data: date (nullable)
// Table: lancamentos_gerados
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   data: date (nullable)
//   conta_debito: text (nullable)
//   conta_credito: text (nullable)
//   valor: numeric (nullable)
//   tipo: text (nullable)
//   status: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: plano_contas
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   codigo: text (nullable)
//   classificacao: text (nullable)
//   nome: text (nullable)
//   descricao: text (nullable)
//   mascara: text (nullable)
// Table: razao_conferencia
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   conta: text (nullable)
//   status: text (nullable)
// Table: razao_dominio
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   conta: text (nullable)
//   data: date (nullable)
//   historico: text (nullable)
//   debito: numeric (nullable)
//   credito: numeric (nullable)
//   saldo: numeric (nullable)
//   partida: text (nullable)
//   contra: text (nullable)
//   status: text (nullable)
//   linha_cliente: text (nullable)
// Table: razao_velit
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   conta: text (nullable)
//   data: date (nullable)
//   historico: text (nullable)
//   debito: numeric (nullable)
//   credito: numeric (nullable)
//   saldo: numeric (nullable)
// Table: resumo_lancamentos
//   id: uuid (not null, default: gen_random_uuid())
//   importacao_id: uuid (not null)
//   total_velit: numeric (nullable)
//   total_dominio: numeric (nullable)

// --- CONSTRAINTS ---
// Table: balancete_dominio
//   FOREIGN KEY balancete_dominio_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY balancete_dominio_pkey: PRIMARY KEY (id)
// Table: balancete_velit
//   FOREIGN KEY balancete_velit_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY balancete_velit_pkey: PRIMARY KEY (id)
// Table: conciliacao_balancetes
//   FOREIGN KEY conciliacao_balancetes_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY conciliacao_balancetes_pkey: PRIMARY KEY (id)
// Table: conciliacao_razoes
//   FOREIGN KEY conciliacao_razoes_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY conciliacao_razoes_pkey: PRIMARY KEY (id)
// Table: importacoes
//   PRIMARY KEY importacoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY importacoes_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: lancamentos_dominio
//   FOREIGN KEY lancamentos_dominio_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY lancamentos_dominio_pkey: PRIMARY KEY (id)
// Table: lancamentos_gerados
//   FOREIGN KEY lancamentos_gerados_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY lancamentos_gerados_pkey: PRIMARY KEY (id)
// Table: plano_contas
//   FOREIGN KEY plano_contas_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY plano_contas_pkey: PRIMARY KEY (id)
// Table: razao_conferencia
//   FOREIGN KEY razao_conferencia_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY razao_conferencia_pkey: PRIMARY KEY (id)
// Table: razao_dominio
//   FOREIGN KEY razao_dominio_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY razao_dominio_pkey: PRIMARY KEY (id)
// Table: razao_velit
//   FOREIGN KEY razao_velit_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY razao_velit_pkey: PRIMARY KEY (id)
// Table: resumo_lancamentos
//   FOREIGN KEY resumo_lancamentos_importacao_id_fkey: FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
//   PRIMARY KEY resumo_lancamentos_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: balancete_dominio
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: balancete_velit
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: conciliacao_balancetes
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: conciliacao_razoes
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: importacoes
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: lancamentos_dominio
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: lancamentos_gerados
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: plano_contas
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: razao_conferencia
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: razao_dominio
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: razao_velit
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: resumo_lancamentos
//   Policy "auth_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true

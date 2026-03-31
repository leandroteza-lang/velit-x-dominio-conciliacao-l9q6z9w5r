import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { ComparisonRecord, ReconciliationSummary } from '@/types/reconciliation'

interface ReconciliationStore {
  importacaoId: string | null
  previewData: Record<number, any[]>
  isProcessing: boolean
  hasData: boolean
  results: ComparisonRecord[]
  summary: ReconciliationSummary | null
  uploadFile: (step: number, file: File) => Promise<void>
  processConciliacaoBalancetes: () => Promise<void>
  processData: () => Promise<void>
  reset: () => void
}

function generateStepData(step: number, importacaoId: string) {
  switch (step) {
    case 1: // Plano de Contas
      return Array.from({ length: 15 }).map((_, i) => ({
        importacao_id: importacaoId,
        codigo: `1.01.${i + 1}`,
        classificacao: 'Ativo',
        nome: `Conta Exemplo ${i + 1}`,
        descricao: 'Conta simulada do plano de contas',
        mascara: `1.01.${(i + 1).toString().padStart(2, '0')}`,
      }))
    case 2: // Balancete Domínio
      return Array.from({ length: 15 }).map((_, i) => ({
        importacao_id: importacaoId,
        codigo: `1.01.${i + 1}`,
        classificacao: 'Ativo',
        saldo_anterior: 1000 + i * 150,
        debito: 800,
        credito: 200,
        saldo_atual: 1600 + i * 150,
      }))
    case 3: // Balancete VELIT
      return Array.from({ length: 15 }).map((_, i) => {
        // Force a discrepancy on the 3rd and 7th item
        const isDiscrepancy = i === 2 || i === 6
        const saldo_atual = isDiscrepancy ? 1600 + i * 150 + 200 : 1600 + i * 150

        return {
          importacao_id: importacaoId,
          conta_contabil: `1.01.${i + 1}`,
          descricao: `Conta Exemplo ${i + 1}`,
          saldo_anterior: 1000 + i * 150,
          debito: 800 + (isDiscrepancy ? 200 : 0),
          credito: 200,
          saldo_atual,
        }
      })
    case 5: // Razão Domínio
      return Array.from({ length: 15 }).map((_, i) => ({
        importacao_id: importacaoId,
        conta: `1.01.${i + 1}`,
        data: `2023-10-${(i + 1).toString().padStart(2, '0')}`,
        historico: `Lançamento de histórico Domínio ${i + 1}`,
        debito: 100 * i,
        credito: 50 * i,
        saldo: 50 * i,
      }))
    case 6: // Razão VELIT
      return Array.from({ length: 15 }).map((_, i) => ({
        importacao_id: importacaoId,
        conta: `1.01.${i + 1}`,
        data: `2023-10-${(i + 1).toString().padStart(2, '0')}`,
        historico: `Lançamento de histórico Velit ${i + 1}`,
        debito: 100 * i,
        credito: 50 * i,
        saldo: 50 * i,
      }))
    default:
      return []
  }
}

export const useReconciliationStore = create<ReconciliationStore>((set, get) => ({
  importacaoId: null,
  previewData: {},
  isProcessing: false,
  hasData: false,
  results: [],
  summary: null,

  uploadFile: async (step, _file) => {
    let { importacaoId } = get()

    if (!importacaoId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')
      const { data, error } = await supabase
        .from('importacoes')
        .insert({ user_id: user.id })
        .select()
        .single()
      if (error) throw error
      importacaoId = data.id
      set({ importacaoId })
    }

    const tableNames: Record<number, string> = {
      1: 'plano_contas',
      2: 'balancete_dominio',
      3: 'balancete_velit',
      5: 'razao_dominio',
      6: 'razao_velit',
    }
    const tableName = tableNames[step]
    if (!tableName) return

    // Generating DB valid structure simulating a parsed CSV/XLSX
    const dataToInsert = generateStepData(step, importacaoId)

    // Clear old data for this import & step
    await supabase.from(tableName).delete().eq('importacao_id', importacaoId)

    const { error } = await supabase.from(tableName).insert(dataToInsert)
    if (error) throw error

    const { data: preview } = await supabase
      .from(tableName)
      .select('*')
      .eq('importacao_id', importacaoId)
      .limit(10)
      .order('id')

    set((state) => ({
      previewData: { ...state.previewData, [step]: preview || [] },
    }))
  },

  processConciliacaoBalancetes: async () => {
    const { importacaoId } = get()
    if (!importacaoId) return

    const { data: bDominio } = await supabase
      .from('balancete_dominio')
      .select('*')
      .eq('importacao_id', importacaoId)
      .order('codigo')
    const { data: bVelit } = await supabase
      .from('balancete_velit')
      .select('*')
      .eq('importacao_id', importacaoId)
      .order('conta_contabil')

    await supabase.from('conciliacao_balancetes').delete().eq('importacao_id', importacaoId)

    const concData =
      bDominio?.map((d) => {
        const v = bVelit?.find((v) => v.conta_contabil === d.codigo)
        const dif = (d.saldo_atual || 0) - (v?.saldo_atual || 0)
        return {
          importacao_id: importacaoId,
          conta_contabil: d.codigo,
          descricao: d.classificacao,
          saldo_dominio: d.saldo_atual,
          saldo_velit: v?.saldo_atual || 0,
          diferenca: dif,
          status: dif === 0 ? 'OK' : 'DIVERGENCIA',
        }
      }) || []

    if (concData.length > 0) {
      const { error } = await supabase.from('conciliacao_balancetes').insert(concData)
      if (error) throw error
    }

    const { data: preview } = await supabase
      .from('conciliacao_balancetes')
      .select('*')
      .eq('importacao_id', importacaoId)
      .limit(10)
      .order('conta_contabil')

    set((state) => ({
      previewData: { ...state.previewData, 4: preview || [] },
    }))
  },

  processData: async () => {
    set({ isProcessing: true })
    const { importacaoId } = get()
    if (!importacaoId) {
      set({ isProcessing: false })
      return
    }

    const { data: dbResults } = await supabase
      .from('conciliacao_balancetes')
      .select('*')
      .eq('importacao_id', importacaoId)
      .order('conta_contabil')

    const mappedResults: ComparisonRecord[] = (dbResults || []).map((r) => ({
      id: r.id,
      date: new Date().toISOString().split('T')[0],
      description: r.descricao || 'N/A',
      velitValue: r.saldo_velit,
      dominioValue: r.saldo_dominio,
      difference: r.diferenca,
      status: r.status === 'OK' ? 'MATCHED' : 'MISMATCH',
    }))

    const summary: ReconciliationSummary = {
      totalVelit: mappedResults.filter((r) => r.velitValue !== null).length,
      totalDominio: mappedResults.filter((r) => r.dominioValue !== null).length,
      matches: mappedResults.filter((r) => r.status === 'MATCHED').length,
      discrepancies: mappedResults.filter((r) => r.status !== 'MATCHED').length,
    }

    await supabase.from('importacoes').update({ status: 'COMPLETED' }).eq('id', importacaoId)

    set({ isProcessing: false, hasData: true, results: mappedResults, summary })
  },

  reset: () =>
    set({
      importacaoId: null,
      previewData: {},
      isProcessing: false,
      hasData: false,
      results: [],
      summary: null,
    }),
}))

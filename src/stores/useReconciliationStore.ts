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

// --- LÓGICA VBA TRADUZIDA PARA TYPESCRIPT ---
function normalizarTexto(s: string): string {
  if (!s) return ''
  return s.replace(/\u00A0/g, '').trim()
}

function normalizarMascara(s: string): string {
  let m = normalizarTexto(s).replace(/\s+/g, '')
  while (m.includes('..')) m = m.replace(/\.\./g, '.')
  while (m.endsWith('.')) m = m.slice(0, -1)
  return m
}

function somenteDigitos(s: string): string {
  return normalizarTexto(s).replace(/\D/g, '')
}

function aplicarMascaraAoCodigo(codigo: string, mascara: string): string {
  const m = normalizarMascara(mascara)
  if (!m) return normalizarTexto(codigo)

  const codigoLimpo = somenteDigitos(codigo)
  if (!codigoLimpo) return ''

  const tokens = m.split('.')
  const lens = tokens.map((t) => t.length)

  const partes: string[] = []
  let pos = 0

  for (const len of lens) {
    if (pos >= codigoLimpo.length) break
    if (pos + len <= codigoLimpo.length) {
      partes.push(codigoLimpo.substring(pos, pos + len))
      pos += len
    } else {
      partes.push(codigoLimpo.substring(pos))
      pos = codigoLimpo.length
      break
    }
  }

  if (pos < codigoLimpo.length) {
    if (partes.length === 0) {
      partes.push(codigoLimpo.substring(pos))
    } else {
      const ultimo = partes.pop()! + codigoLimpo.substring(pos)
      partes.push(ultimo)
    }
  }

  return partes.join('.')
}

function processarPlanoContas(rawData: any[], importacaoId: string) {
  if (!rawData || rawData.length === 0) return []

  const isRawCsv = Array.isArray(rawData[0])
  let cCod = 0,
    cClass = 1,
    cNome = 2,
    cMasc = 3

  // Identifica as colunas corretas se for o arquivo bruto do Domínio (que possui mais de 19 colunas)
  if (isRawCsv && rawData[0].length >= 19) {
    cCod = 13 // N
    cClass = 14 // O
    cNome = 15 // P
    cMasc = 18 // S
  }

  // Ignora linhas vazias (sem código)
  const data = rawData.filter((row) => {
    const cod = isRawCsv ? row[cCod] : row.codigo
    return normalizarTexto(String(cod || '')) !== ''
  })

  // Obtém máscara padrão
  let mascaraPadrao = ''
  for (const row of data) {
    const m = normalizarMascara(String(isRawCsv ? row[cMasc] : row.mascara || ''))
    if (m) {
      mascaraPadrao = m
      break
    }
  }

  if (!mascaraPadrao) mascaraPadrao = '1.1.1.11.1111' // Fallback

  return data.map((row) => {
    const rawCod = String(isRawCsv ? row[cCod] : row.codigo || '')
    const rawClassificacao = String(isRawCsv ? row[cClass] : row.classificacao || '')
    const rawNome = String(isRawCsv ? row[cNome] : row.nome || '')
    const rawMascara = String(isRawCsv ? row[cMasc] : row.mascara || '')

    // Aplica máscara na classificação
    let classif = aplicarMascaraAoCodigo(rawClassificacao, mascaraPadrao)
    classif = classif.replace(/,/g, '.')

    // Cria a descrição: Classificação - Nome
    const descricao = `${classif} - ${rawNome}`

    return {
      importacao_id: importacaoId,
      codigo: rawCod,
      classificacao: classif,
      nome: rawNome,
      descricao: descricao,
      mascara: rawMascara || mascaraPadrao,
    }
  })
}

async function parseCsvFile(file: File): Promise<any[]> {
  try {
    const text = await file.text()
    const lines = text.split(/\r?\n/)
    return lines.map((line) => line.split(/[;,]/))
  } catch (e) {
    return []
  }
}
// --- FIM LÓGICA VBA ---

function generateStepData(step: number, importacaoId: string) {
  switch (step) {
    case 1: // Plano de Contas Mock raw data
      return Array.from({ length: 15 }).map((_, i) => ({
        codigo: `10100${i + 1}`,
        classificacao: `101${(i + 1).toString().padStart(2, '0')}`,
        nome: `Conta Exemplo ${i + 1}`,
        mascara: `1.01.00`,
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

  uploadFile: async (step, file) => {
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

    let dataToInsert: any[] = []

    // Lógica para processar arquivo real ou mock
    if (step === 1) {
      // Se for CSV ou TXT, tenta processar o arquivo. Senão usa o mock para demonstração.
      let rawData = []
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
        rawData = await parseCsvFile(file)
        if (rawData.length > 1) {
          rawData = rawData.slice(1) // Ignora cabeçalho
        }
      } else {
        rawData = generateStepData(step, importacaoId)
      }
      dataToInsert = processarPlanoContas(rawData, importacaoId)
    } else {
      dataToInsert = generateStepData(step, importacaoId)
    }

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

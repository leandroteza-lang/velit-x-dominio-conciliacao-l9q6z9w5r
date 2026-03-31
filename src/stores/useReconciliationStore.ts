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
  preparePlanoContasImport: (
    file: File,
  ) => Promise<{ newAccounts: any[]; existingAccounts: any[]; rawData: any[] }>
  executePlanoContasImport: (
    action: 'ADD_NEW' | 'UPDATE_EXISTING' | 'REPLACE_ALL',
    rawData: any[],
  ) => Promise<void>
  uploadFile: (step: number, file: File) => Promise<void>
  processConciliacaoBalancetes: () => Promise<void>
  processData: () => Promise<void>
  reset: () => void
}

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

function processarPlanoContas(rawData: any[], importacaoId: string | null) {
  if (!rawData || rawData.length === 0) return []

  const isRawCsv = Array.isArray(rawData[0])
  let cCod = 0,
    cClass = 1,
    cNome = 2,
    cMasc = 3

  if (isRawCsv && rawData[0].length >= 19) {
    cCod = 13 // N
    cClass = 14 // O
    cNome = 15 // P
    cMasc = 18 // S
  }

  let data = rawData.filter((row) => {
    const cod = isRawCsv ? row[cCod] : row.codigo
    return normalizarTexto(String(cod || '')) !== ''
  })

  if (data.length > 0) {
    const firstCod = String(isRawCsv ? data[0][cCod] : data[0].codigo || '').toLowerCase()
    if (firstCod.includes('código') || firstCod.includes('codigo') || firstCod.includes('conta')) {
      data = data.slice(1)
    }
  }

  let mascaraPadrao = ''
  for (const row of data) {
    const m = normalizarMascara(String(isRawCsv ? row[cMasc] : row.mascara || ''))
    if (m) {
      mascaraPadrao = m
      break
    }
  }

  if (!mascaraPadrao) mascaraPadrao = '1.1.1.11.1111'

  return data.map((row) => {
    const rawCod = String(isRawCsv ? row[cCod] : row.codigo || '')
    const rawClassificacao = String(isRawCsv ? row[cClass] : row.classificacao || '')
    const rawNome = String(isRawCsv ? row[cNome] : row.nome || '')
    const rawMascara = String(isRawCsv ? row[cMasc] : row.mascara || '')

    let classif = aplicarMascaraAoCodigo(rawClassificacao, mascaraPadrao)
    classif = classif.replace(/,/g, '.')

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
    return lines.map((line) => {
      const row = []
      let inQuotes = false
      let value = ''
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if ((char === ';' || char === ',') && !inQuotes) {
          row.push(value.trim())
          value = ''
        } else {
          value += char
        }
      }
      row.push(value.trim())
      return row
    })
  } catch (e) {
    return []
  }
}

async function parseExcelFile(file: File): Promise<any[]> {
  try {
    const XLSX = await import(
      /* @vite-ignore */ 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs'
    )
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  } catch (e: any) {
    console.error('Error parsing Excel:', e)
    throw new Error('Erro ao processar arquivo Excel. Tente salvar como CSV e importe novamente.')
  }
}

function generateStepData(step: number, importacaoId: string) {
  switch (step) {
    case 1:
      return Array.from({ length: 15 }).map((_, i) => ({
        codigo: `10100${i + 1}`,
        classificacao: `101${(i + 1).toString().padStart(2, '0')}`,
        nome: `Conta Exemplo ${i + 1}`,
        mascara: `1.01.00`,
      }))
    case 2:
      return Array.from({ length: 15 }).map((_, i) => ({
        importacao_id: importacaoId,
        codigo: `1.01.${i + 1}`,
        classificacao: 'Ativo',
        saldo_anterior: 1000 + i * 150,
        debito: 800,
        credito: 200,
        saldo_atual: 1600 + i * 150,
      }))
    case 3:
      return Array.from({ length: 15 }).map((_, i) => {
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
    case 5:
      return Array.from({ length: 15 }).map((_, i) => ({
        importacao_id: importacaoId,
        conta: `1.01.${i + 1}`,
        data: `2023-10-${(i + 1).toString().padStart(2, '0')}`,
        historico: `Lançamento de histórico Domínio ${i + 1}`,
        debito: 100 * i,
        credito: 50 * i,
        saldo: 50 * i,
      }))
    case 6:
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

  preparePlanoContasImport: async (file) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    let rawData: any[] = []
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      rawData = await parseCsvFile(file)
    } else if (name.match(/\.xlsx?|\.xlsm|\.xlsb$/)) {
      rawData = await parseExcelFile(file)
    } else {
      throw new Error('Formato não suportado. Envie Excel (.xlsx, .xls) ou CSV/TXT.')
    }

    const processed = processarPlanoContas(rawData, null)
    if (processed.length === 0) throw new Error('Nenhum dado válido encontrado.')

    const { data: existing } = await supabase
      .from('plano_contas')
      .select('codigo, id')
      .eq('user_id', user.id)
    const existingCodes = new Set((existing || []).map((e) => e.codigo))

    const newAccounts = processed.filter((p) => !existingCodes.has(p.codigo))
    const existingAccounts = processed.filter((p) => existingCodes.has(p.codigo))

    return { newAccounts, existingAccounts, rawData: processed }
  },

  executePlanoContasImport: async (action, rawData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const dataWithUser = rawData.map((r) => ({
      codigo: r.codigo,
      classificacao: r.classificacao,
      nome: r.nome,
      descricao: r.descricao,
      mascara: r.mascara,
      user_id: user.id,
    }))

    if (action === 'REPLACE_ALL') {
      await supabase.from('plano_contas').delete().eq('user_id', user.id)
      for (let i = 0; i < dataWithUser.length; i += 1000) {
        await supabase.from('plano_contas').insert(dataWithUser.slice(i, i + 1000))
      }
    } else if (action === 'ADD_NEW') {
      const { data: existing } = await supabase
        .from('plano_contas')
        .select('codigo')
        .eq('user_id', user.id)
      const existingCodes = new Set((existing || []).map((e) => e.codigo))
      const toInsert = dataWithUser.filter((d) => !existingCodes.has(d.codigo))
      for (let i = 0; i < toInsert.length; i += 1000) {
        await supabase.from('plano_contas').insert(toInsert.slice(i, i + 1000))
      }
    } else if (action === 'UPDATE_EXISTING') {
      const { data: existing } = await supabase
        .from('plano_contas')
        .select('codigo, id')
        .eq('user_id', user.id)
      const existingMap = new Map((existing || []).map((e) => [e.codigo, e.id]))

      const toInsert = []
      const toUpdate = []

      for (const item of dataWithUser) {
        if (existingMap.has(item.codigo)) {
          toUpdate.push({ ...item, id: existingMap.get(item.codigo) })
        } else {
          toInsert.push(item)
        }
      }

      for (let i = 0; i < toInsert.length; i += 1000) {
        await supabase.from('plano_contas').insert(toInsert.slice(i, i + 1000))
      }
      for (let i = 0; i < toUpdate.length; i += 1000) {
        await supabase
          .from('plano_contas')
          .upsert(toUpdate.slice(i, i + 1000), { onConflict: 'id', ignoreDuplicates: false })
      }
    }
  },

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
      2: 'balancete_dominio',
      3: 'balancete_velit',
      5: 'razao_dominio',
      6: 'razao_velit',
    }
    const tableName = tableNames[step]
    if (!tableName) return

    let dataToInsert: any[] = []

    if (file) {
      dataToInsert = generateStepData(step, importacaoId)
    } else {
      dataToInsert = generateStepData(step, importacaoId)
    }

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

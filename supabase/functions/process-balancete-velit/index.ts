import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function parseExcelDate(v: any): string | null {
  if (!v) return null
  if (typeof v === 'number') {
    // Apenas aceita datas entre 1990 (32874) e 2100 (73050)
    if (v < 32874 || v > 73050) return null
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  }
  if (typeof v === 'string') {
    const s = v.trim()

    // Tenta encontrar uma data no formato DD/MM/YYYY no meio de um texto (ex: "Período: 01/01/2023 a 31/12/2023")
    const match = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (match) {
      const year = parseInt(match[3], 10)
      if (year >= 1990 && year <= 2100) {
        return `${match[3]}-${match[2]}-${match[1]}`
      }
    }

    const partsDash = s.split('-')
    if (partsDash.length === 3) {
      if (partsDash[0].length === 4) {
        const year = parseInt(partsDash[0], 10)
        if (year >= 1990 && year <= 2100) {
          return s.substring(0, 10)
        }
      }
    }
  }
  return null
}

function parseNumeroUniversal(v: any): number {
  if (typeof v === 'number') return v
  if (!v) return 0
  let s = String(v)
    .trim()
    .replace(/\s/g, '')
    .replace(/\u00A0/g, '')
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let decSep = '.'
  let thouSep = ','
  if (lastDot === -1 && lastComma === -1) {
    return Number(s) || 0
  } else if (lastDot > lastComma) {
    decSep = '.'
    thouSep = ','
  } else {
    decSep = ','
    thouSep = '.'
  }
  s = s.split(thouSep).join('')
  if (decSep === ',') s = s.replace(',', '.')
  return Number(s) || 0
}

function normalizarMascara(s: string): string {
  if (!s) return ''
  let out = s
    .trim()
    .replace(/\u00A0/g, '')
    .replace(/\s/g, '')
  while (out.includes('..')) out = out.replace('..', '.')
  while (out.endsWith('.')) out = out.slice(0, -1)
  return out
}

function somenteDigitos(s: string): string {
  if (!s) return ''
  return String(s).replace(/\D/g, '')
}

function aplicarMascaraAoCodigo(codigo: string, mascara: string): string {
  mascara = normalizarMascara(mascara)
  if (!mascara) return String(codigo).trim()

  const codigoLimpo = somenteDigitos(codigo)
  if (!codigoLimpo) return ''

  const tokens = mascara.split('.')
  const lens = tokens.map((t) => t.length)

  const partes: string[] = []
  let pos = 0

  for (const len of lens) {
    if (pos >= codigoLimpo.length) break
    if (pos + len <= codigoLimpo.length) {
      partes.push(codigoLimpo.slice(pos, pos + len))
      pos += len
    } else {
      partes.push(codigoLimpo.slice(pos))
      pos = codigoLimpo.length
      break
    }
  }

  if (pos < codigoLimpo.length) {
    if (partes.length === 0) {
      partes.push(codigoLimpo.slice(pos))
    } else {
      partes[partes.length - 1] += codigoLimpo.slice(pos)
    }
  }

  return partes.join('.')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string | null
    const existing_id = formData.get('existing_id') as string | null
    const manual_data_inicio = formData.get('data_inicio') as string | null
    const manual_data_fim = formData.get('data_fim') as string | null

    if (!file) {
      throw new Error('Nenhum arquivo enviado.')
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Não autenticado')

    // Fetch user's plano_contas to do DE/PARA (with pagination)
    let planoContasData: any[] = []
    let from = 0
    const stepSize = 1000
    let fetchMore = true

    while (fetchMore) {
      const { data, error: pcErr } = await supabase
        .from('plano_contas')
        .select('codigo, classificacao, mascara')
        .eq('user_id', user.id)
        .range(from, from + stepSize - 1)

      if (pcErr) throw pcErr

      if (data && data.length > 0) {
        planoContasData = [...planoContasData, ...data]
        from += stepSize
        if (data.length < stepSize) fetchMore = false
      } else {
        fetchMore = false
      }
    }

    const planoContasMap = new Map<string, string>()
    const planoContasMapByMascara = new Map<string, string>()
    let fallbackMascara = ''
    for (const pc of planoContasData) {
      if (pc.classificacao) {
        planoContasMapByMascara.set(normalizarMascara(pc.classificacao), pc.classificacao)
      }
      if (pc.codigo && pc.classificacao) {
        planoContasMap.set(String(pc.codigo).trim(), pc.classificacao)
      }
      if (pc.mascara && !fallbackMascara) {
        fallbackMascara = pc.mascara
      }
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

    if (jsonData.length < 2) {
      throw new Error('Arquivo vazio ou sem dados suficientes.')
    }

    // Identify columns dynamically
    let headerRowIdx = -1
    let colMap = {
      conta_contabil: -1,
      descricao: -1,
      saldo_anterior: -1,
      debito: -1,
      credito: -1,
      saldo_atual: -1,
    }

    for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
      const row = jsonData[i]
      if (!row || !Array.isArray(row)) continue

      const rowStrings = row.map((c) =>
        String(c || '')
          .toLowerCase()
          .trim(),
      )

      for (let j = 0; j < rowStrings.length; j++) {
        const val = rowStrings[j]
        if (!val) continue
        if (
          val === 'conta' ||
          val === 'código' ||
          val === 'codigo' ||
          val === 'cod' ||
          val === 'cód' ||
          val.includes('contábil') ||
          val.includes('contabil')
        )
          colMap.conta_contabil = j
        else if (val.includes('descri') || val.includes('nome')) colMap.descricao = j
        else if (val.includes('anterior') && !val.includes('atual')) colMap.saldo_anterior = j
        else if (
          (val === 'débito' || val === 'debito' || val === 'débitos' || val === 'debitos') &&
          colMap.debito === -1
        )
          colMap.debito = j
        else if (
          (val === 'crédito' || val === 'credito' || val === 'créditos' || val === 'creditos') &&
          colMap.credito === -1
        )
          colMap.credito = j
        else if (val.includes('atual') && !val.includes('anterior')) colMap.saldo_atual = j
      }

      if (
        colMap.saldo_anterior !== -1 &&
        colMap.saldo_atual !== -1 &&
        colMap.conta_contabil !== -1
      ) {
        headerRowIdx = i
        break
      }
    }

    if (headerRowIdx === -1) {
      // Fallback for VELIT Layout as described in VBA
      colMap = {
        conta_contabil: 0,
        descricao: 2,
        saldo_anterior: 3,
        debito: 4,
        credito: 5,
        saldo_atual: 6,
      }
      headerRowIdx = 0
    }

    // Find date range if available (Velit may or may not have it)
    let data_inicio = manual_data_inicio || null
    let data_fim = manual_data_fim || null

    if (!existing_id && (!data_inicio || !data_fim)) {
      // Scan ONLY rows BEFORE the header for dates, because once data starts, numbers are balances!
      // Also scan string texts if they contain dates like "01/01/2023 a 31/12/2023"
      for (let r = 0; r <= headerRowIdx; r++) {
        const row = jsonData[r]
        if (row) {
          for (let c = 0; c < row.length; c++) {
            const cellValue = row[c]
            if (!cellValue) continue

            if (typeof cellValue === 'string') {
              const matches = cellValue.match(/(\d{2})\/(\d{2})\/(\d{4})/g)
              if (matches) {
                for (const m of matches) {
                  const parsed = parseExcelDate(m)
                  if (parsed) {
                    if (!data_inicio) data_inicio = parsed
                    else if (!data_fim && parsed !== data_inicio) data_fim = parsed
                  }
                }
              }
            } else {
              const v = parseExcelDate(cellValue)
              if (v) {
                if (!data_inicio) data_inicio = v
                else if (!data_fim && v !== data_inicio) data_fim = v
              }
            }
          }
        }
      }
    }

    // Sort dates just in case
    if (data_inicio && data_fim && new Date(data_inicio) > new Date(data_fim)) {
      const temp = data_inicio
      data_inicio = data_fim
      data_fim = temp
    }

    if (!existing_id && (!data_inicio || !data_fim)) {
      return new Response(JSON.stringify({ requiresPeriod: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let existingImportacao = null
    if (existing_id) {
      const { data: existing } = await supabase
        .from('importacoes')
        .select('id, data_inicio, data_fim')
        .eq('id', existing_id)
        .single()
      if (existing) {
        existingImportacao = existing
        data_inicio = existing.data_inicio
        data_fim = existing.data_fim
      }
    } else if (data_inicio && data_fim && !action) {
      const { data: existing } = await supabase
        .from('importacoes')
        .select('id, data_inicio, data_fim')
        .eq('user_id', user.id)
        .eq('data_inicio', data_inicio)
        .eq('data_fim', data_fim)
        .single()

      if (existing) {
        existingImportacao = existing
      }
    }

    // Create or update importacao
    let importacao_id = existing_id || existingImportacao?.id
    if (!importacao_id || importacao_id === 'undefined') {
      const { data: newImp, error: impErr } = await supabase
        .from('importacoes')
        .insert({
          user_id: user.id,
          status: 'PENDING',
          data_inicio: data_inicio || null,
          data_fim: data_fim || null,
        })
        .select('id')
        .single()
      if (impErr) throw impErr
      importacao_id = newImp.id
    } else {
      await supabase
        .from('importacoes')
        .update({ created_at: new Date().toISOString() })
        .eq('id', importacao_id)
    }

    const toInsert = []
    for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
      const row = jsonData[r]
      if (!row || row.length === 0) continue

      const contaRaw =
        colMap.conta_contabil !== -1 && row[colMap.conta_contabil] != null
          ? String(row[colMap.conta_contabil]).trim()
          : null
      let descricao =
        colMap.descricao !== -1 && row[colMap.descricao] != null
          ? String(row[colMap.descricao]).trim()
          : null

      let conta_contabil = contaRaw ? normalizarMascara(contaRaw) : null

      // Mapping to Chart of accounts
      if (conta_contabil) {
        if (planoContasMapByMascara.has(conta_contabil)) {
          conta_contabil = planoContasMapByMascara.get(conta_contabil) || conta_contabil
        } else if (planoContasMap.has(conta_contabil)) {
          conta_contabil = planoContasMap.get(conta_contabil) || conta_contabil
        } else if (fallbackMascara) {
          const masc = aplicarMascaraAoCodigo(conta_contabil, fallbackMascara)
          if (planoContasMapByMascara.has(masc)) {
            conta_contabil = planoContasMapByMascara.get(masc) || masc
          } else {
            conta_contabil = masc
          }
        }
      }

      const saldo_anterior =
        colMap.saldo_anterior !== -1 ? parseNumeroUniversal(row[colMap.saldo_anterior]) : 0
      const debito = colMap.debito !== -1 ? parseNumeroUniversal(row[colMap.debito]) : 0
      const credito = colMap.credito !== -1 ? parseNumeroUniversal(row[colMap.credito]) : 0
      const saldo_atual =
        colMap.saldo_atual !== -1 ? parseNumeroUniversal(row[colMap.saldo_atual]) : 0

      if (
        !conta_contabil &&
        saldo_anterior === 0 &&
        debito === 0 &&
        credito === 0 &&
        saldo_atual === 0
      ) {
        continue
      }

      if (conta_contabil && conta_contabil !== '') {
        toInsert.push({
          importacao_id,
          conta_contabil,
          descricao,
          saldo_anterior,
          debito,
          credito,
          saldo_atual,
        })
      }
    }

    if (toInsert.length === 0) {
      throw new Error('Nenhum dado válido encontrado para importar. Verifique o layout do arquivo.')
    }

    if (existingImportacao && !action) {
      let existingRecords: any[] = []
      let fromIdx = 0
      const step = 1000
      let fetchMoreRecs = true

      while (fetchMoreRecs) {
        const { data: recs, error: recsErr } = await supabase
          .from('balancete_velit')
          .select('conta_contabil, descricao')
          .eq('importacao_id', existingImportacao.id)
          .range(fromIdx, fromIdx + step - 1)

        if (recsErr) throw recsErr

        if (recs && recs.length > 0) {
          existingRecords = [...existingRecords, ...recs]
          fromIdx += step
          if (recs.length < step) fetchMoreRecs = false
        } else {
          fetchMoreRecs = false
        }
      }

      const existingSet = new Set(
        existingRecords.map((r) => `${r.conta_contabil || ''}|${r.descricao || ''}`),
      )

      let newCount = 0
      let existingCount = 0

      for (const row of toInsert) {
        const key = `${row.conta_contabil || ''}|${row.descricao || ''}`
        if (existingSet.has(key)) {
          existingCount++
        } else {
          newCount++
        }
      }

      return new Response(
        JSON.stringify({
          requiresAction: true,
          data_inicio: data_inicio || existingImportacao.data_inicio,
          data_fim: data_fim || existingImportacao.data_fim,
          existing_id: existingImportacao.id,
          new_count: newCount,
          existing_count: existingCount,
          total_count: toInsert.length,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    let finalToInsert = toInsert

    if (action === 'REPLACE' || !action) {
      await supabase.from('balancete_velit').delete().eq('importacao_id', importacao_id)
    } else if (action === 'APPEND') {
      let existingRecords: any[] = []
      let fromIdx = 0
      const step = 1000
      let fetchMoreRecs = true

      while (fetchMoreRecs) {
        const { data: recs, error: recsErr } = await supabase
          .from('balancete_velit')
          .select('conta_contabil, descricao')
          .eq('importacao_id', importacao_id)
          .range(fromIdx, fromIdx + step - 1)

        if (recsErr) throw recsErr

        if (recs && recs.length > 0) {
          existingRecords = [...existingRecords, ...recs]
          fromIdx += step
          if (recs.length < step) fetchMoreRecs = false
        } else {
          fetchMoreRecs = false
        }
      }

      const existingSet = new Set(
        existingRecords.map((r) => `${r.conta_contabil || ''}|${r.descricao || ''}`),
      )

      finalToInsert = []
      for (const row of toInsert) {
        const key = `${row.conta_contabil || ''}|${row.descricao || ''}`
        if (!existingSet.has(key)) {
          finalToInsert.push(row)
        }
      }
    }

    if (finalToInsert.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          importacao_id,
          message: 'Nenhum registro novo para adicionar.',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    for (let i = 0; i < finalToInsert.length; i += 1000) {
      const chunk = finalToInsert.slice(i, i + 1000)
      const { error } = await supabase.from('balancete_velit').insert(chunk)
      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true, count: finalToInsert.length, importacao_id }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

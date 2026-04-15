import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx@0.18.5'

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
    let importacao_id = formData.get('importacao_id') as string

    if (!file) {
      throw new Error('Nenhum arquivo enviado.')
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Não autenticado')

    if (!importacao_id || importacao_id === 'undefined') {
      const { data: newImp, error: impErr } = await supabase
        .from('importacoes')
        .insert({ user_id: user.id, status: 'PENDING' })
        .select('id')
        .single()
      if (impErr) throw impErr
      importacao_id = newImp.id
    }

    // Fetch user's plano_contas to do DE/PARA (with pagination)
    let planoContasData: any[] = []
    let from = 0
    const stepSize = 1000
    let fetchMore = true

    while (fetchMore) {
      const { data, error: pcErr } = await supabase
        .from('plano_contas')
        .select('codigo, classificacao')
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
    for (const pc of planoContasData) {
      if (pc.codigo && pc.classificacao) {
        planoContasMap.set(String(pc.codigo).trim(), pc.classificacao)
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

    let mascaraPadrao = ''
    for (let r = 0; r < jsonData.length; r++) {
      const row = jsonData[r]
      const valL = row[11] ? String(row[11]) : ''
      const m = normalizarMascara(valL)
      if (m) {
        mascaraPadrao = m
        break
      }
    }

    const toInsert = []
    for (let r = 1; r < jsonData.length; r++) {
      const row = jsonData[r]
      if (!row || row.length === 0) continue

      const codigoRaw = row[0] ? String(row[0]).trim() : null
      let classificacaoRaw = row[2] ? String(row[2]).trim() : null

      let codigo = codigoRaw
      let classificacao = classificacaoRaw

      if (codigo && planoContasMap.has(codigo)) {
        classificacao = planoContasMap.get(codigo) || classificacao
      } else if (mascaraPadrao && classificacao) {
        classificacao = aplicarMascaraAoCodigo(classificacao, mascaraPadrao)
      }

      const saldo_anterior = parseNumeroUniversal(row[4])
      const debito = parseNumeroUniversal(row[5])
      const credito = parseNumeroUniversal(row[6])
      const saldo_atual = parseNumeroUniversal(row[7])

      if ((codigo && codigo !== '') || (classificacao && classificacao !== '')) {
        toInsert.push({
          importacao_id,
          codigo: codigo || null,
          classificacao,
          saldo_anterior,
          debito,
          credito,
          saldo_atual,
        })
      }
    }

    if (toInsert.length === 0) {
      throw new Error('Nenhum dado válido encontrado para importar.')
    }

    await supabase.from('balancete_dominio').delete().eq('importacao_id', importacao_id)

    // Insert em lotes de 1000
    for (let i = 0; i < toInsert.length; i += 1000) {
      const chunk = toInsert.slice(i, i + 1000)
      const { error } = await supabase.from('balancete_dominio').insert(chunk)
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true, count: toInsert.length, importacao_id }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

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

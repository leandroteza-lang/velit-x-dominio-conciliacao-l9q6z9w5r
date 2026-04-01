import { supabase } from '@/lib/supabase/client'

export const executePlanoContasImport = async (
  userId: string,
  contasToImport: any[],
  mode: 'REPLACE' | 'UPDATE',
) => {
  // 1. Fetch all existing accounts with pagination to avoid the 1000 record limit
  let existingContas: any[] = []
  let from = 0
  const step = 1000
  let fetchMore = true

  while (fetchMore) {
    const { data, error } = await supabase
      .from('plano_contas')
      .select('*')
      .eq('user_id', userId)
      .range(from, from + step - 1)

    if (error) throw error

    if (data && data.length > 0) {
      existingContas = [...existingContas, ...data]
      from += step
      if (data.length < step) fetchMore = false
    } else {
      fetchMore = false
    }
  }

  // 2. Create an automatic rollback backup before starting any updates
  if (existingContas.length > 0) {
    const { error: backupError } = await supabase.from('plano_contas_backup').insert([
      {
        user_id: userId,
        data: existingContas,
      },
    ])
    if (backupError) throw backupError
  }

  // Helpers for advanced comparison logic
  const sanitizeClassificacao = (str: string | null) => {
    if (!str) return ''
    return str.replace(/\s+/g, '').replace(/\./g, '').trim().toLowerCase()
  }

  const sanitizeCodigo = (str: string | null) => {
    if (!str) return ''
    return str.trim().toLowerCase()
  }

  const existingMapByClassificacao = new Map<string, any>()
  const existingMapByCodigo = new Map<string, any>()
  const allExistingIds = new Set<string>()

  existingContas.forEach((c) => {
    allExistingIds.add(c.id)
    if (c.classificacao) {
      existingMapByClassificacao.set(sanitizeClassificacao(c.classificacao), c)
    }
    if (c.codigo) {
      existingMapByCodigo.set(sanitizeCodigo(c.codigo), c)
    }
  })

  const toInsert: any[] = []
  const toUpdate: any[] = []
  const processedIds = new Set<string>()

  const getPreserved = (oldVal: any, newVal: any) => {
    if (oldVal && typeof oldVal === 'string' && oldVal.trim() !== '' && oldVal !== '-') {
      return oldVal
    }
    return newVal
  }

  for (const item of contasToImport) {
    let existing = null

    if (item.classificacao) {
      existing = existingMapByClassificacao.get(sanitizeClassificacao(item.classificacao))
    }
    if (!existing && item.codigo) {
      existing = existingMapByCodigo.get(sanitizeCodigo(item.codigo))
    }

    if (existing) {
      processedIds.add(existing.id)
      toUpdate.push({
        id: existing.id,
        codigo: item.codigo || existing.codigo,
        classificacao: item.classificacao || existing.classificacao,
        nome: item.nome || existing.nome,
        descricao: existing.descricao || item.descricao,
        mascara: item.mascara || existing.mascara,
        natureza: getPreserved(existing.natureza, item.natureza),
        tipo: getPreserved(existing.tipo, item.tipo),
        finalidade: getPreserved(existing.finalidade, item.finalidade),
        nivel_tipo: item.nivel_tipo || existing.nivel_tipo,
        importacao_id: item.importacao_id || existing.importacao_id,
        user_id: userId,
      })
    } else {
      toInsert.push({
        ...item,
        user_id: userId,
      })
    }
  }

  // 3. Process DELETES (if replacing total chart of accounts) via batches
  if (mode === 'REPLACE') {
    const toDeleteIds = Array.from(allExistingIds).filter((id) => !processedIds.has(id))
    const DELETE_BATCH_SIZE = 40
    for (let i = 0; i < toDeleteIds.length; i += DELETE_BATCH_SIZE) {
      const batch = toDeleteIds.slice(i, i + DELETE_BATCH_SIZE)
      const { error: deleteError } = await supabase.from('plano_contas').delete().in('id', batch)
      if (deleteError) throw deleteError
    }
  }

  // 4. Process INSERTS via batches
  for (let i = 0; i < toInsert.length; i += 1000) {
    const batch = toInsert.slice(i, i + 1000)
    const { error } = await supabase.from('plano_contas').insert(batch)
    if (error) throw error
  }

  // 5. Process UPDATES via batches
  for (let i = 0; i < toUpdate.length; i += 1000) {
    const batch = toUpdate.slice(i, i + 1000)
    const { error } = await supabase.from('plano_contas').upsert(batch)
    if (error) throw error
  }

  const total = toInsert.length + toUpdate.length
  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    total,
    message: `Importação concluída: ${total} registros processados (${toInsert.length} novos e ${toUpdate.length} atualizados).`,
  }
}

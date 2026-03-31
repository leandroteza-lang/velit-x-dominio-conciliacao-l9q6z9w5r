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

  // Helper for advanced comparison logic: ignores casing, spaces and accents
  const sanitize = (str: string | null) => {
    if (!str) return ''
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  const existingMapByClassificacao = new Map(
    existingContas.map((c) => [sanitize(c.classificacao), c]),
  )

  const toInsert: any[] = []
  const toUpdate: any[] = []

  for (const item of contasToImport) {
    const classifNorm = sanitize(item.classificacao)
    const existing = existingMapByClassificacao.get(classifNorm)

    if (existing) {
      // Preserve custom classifications that were made manually inside the platform
      toUpdate.push({
        id: existing.id,
        codigo: item.codigo || existing.codigo,
        classificacao: item.classificacao || existing.classificacao,
        nome: item.nome || existing.nome,
        mascara: item.mascara || existing.mascara,
        natureza: existing.natureza || item.natureza,
        tipo: existing.tipo || item.tipo,
        finalidade: existing.finalidade || item.finalidade,
        nivel_tipo: item.nivel_tipo || existing.nivel_tipo,
        user_id: userId,
      })
      // Mark existing as processed
      existingMapByClassificacao.delete(classifNorm)
    } else {
      toInsert.push({
        ...item,
        user_id: userId,
      })
    }
  }

  // 3. Process DELETES (if replacing total chart of accounts) via batches
  if (mode === 'REPLACE') {
    const toDeleteIds = Array.from(existingMapByClassificacao.values()).map((c) => c.id)
    for (let i = 0; i < toDeleteIds.length; i += 1000) {
      const batch = toDeleteIds.slice(i, i + 1000)
      await supabase.from('plano_contas').delete().in('id', batch)
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

  return { inserted: toInsert.length, updated: toUpdate.length }
}

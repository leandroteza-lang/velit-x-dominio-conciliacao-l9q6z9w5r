import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  Plus,
  Trash2,
  Download,
  Search,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  RotateCcw,
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChartIcon,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

export default function PlanoContas() {
  const { user } = useAuth()
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [totalCount, setTotalCount] = useState(0)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Global Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState({
    ATIVO: 0,
    PASSIVO: 0,
    RECEITAS: 0,
    DESPESAS: 0,
    OUTROS: 0,
  })
  const [expectedMask, setExpectedMask] = useState<number[] | null>(null)

  // Filters State
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterNivel, setFilterNivel] = useState<string>('ALL')
  const [filterTipo, setFilterTipo] = useState<string>('ALL')
  const [filterNatureza, setFilterNatureza] = useState<string>('ALL')
  const [filterFinalidade, setFilterFinalidade] = useState<string>('')
  const [debouncedFinalidade, setDebouncedFinalidade] = useState('')

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'classificacao',
    direction: 'asc',
  })

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastSelected, setLastSelected] = useState<string | null>(null)

  // UI State
  const [sheetOpen, setSheetOpen] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchConfig, setBatchConfig] = useState({ prefix: '', tipo: '', natureza: '' })
  const [restoring, setRestoring] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Form State
  const [editingConta, setEditingConta] = useState<any>(null)
  const [formData, setFormData] = useState({
    codigo: '',
    classificacao: '',
    nome: '',
    mascara: '',
    tipo: '',
    natureza: '',
    finalidade: '',
    nivel_tipo: 'SINTETICA',
  })

  // Debounce inputs
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFinalidade(filterFinalidade), 400)
    return () => clearTimeout(t)
  }, [filterFinalidade])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filterNivel, filterTipo, filterNatureza, debouncedFinalidade])

  // Fix page out of bounds
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages)
    }
  }, [totalPages, page])

  const fetchDashboardStatsAndMask = async () => {
    if (!user) return
    const natures = ['ATIVO', 'PASSIVO', 'RECEITAS', 'DESPESAS']
    const stats = { ATIVO: 0, PASSIVO: 0, RECEITAS: 0, DESPESAS: 0, OUTROS: 0 }

    await Promise.all(
      natures.map(async (nat) => {
        const { count } = await supabase
          .from('plano_contas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .ilike('natureza', nat)

        if (count !== null) stats[nat as keyof typeof stats] = count
      }),
    )

    const { count: total } = await supabase
      .from('plano_contas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    stats.OUTROS = Math.max(
      0,
      (total || 0) - stats.ATIVO - stats.PASSIVO - stats.RECEITAS - stats.DESPESAS,
    )
    setDashboardStats(stats)

    const { data } = await supabase
      .from('plano_contas')
      .select('classificacao')
      .eq('user_id', user.id)
      .limit(1000)
    if (data) {
      let maxParts = 0
      let standardClassificacao = ''
      data.forEach((c) => {
        if (c.classificacao) {
          const parts = c.classificacao.split('.')
          if (parts.length > maxParts) {
            maxParts = parts.length
            standardClassificacao = c.classificacao
          }
        }
      })
      const mask = standardClassificacao
        ? standardClassificacao.split('.').map((p) => p.length)
        : null
      setExpectedMask(mask)
    }
  }

  const fetchContas = async () => {
    if (!user) return
    setLoading(true)

    let query = supabase.from('plano_contas').select('*', { count: 'exact' }).eq('user_id', user.id)

    if (debouncedSearch) {
      query = query.or(
        `codigo.ilike.%${debouncedSearch}%,nome.ilike.%${debouncedSearch}%,classificacao.ilike.%${debouncedSearch}%,finalidade.ilike.%${debouncedSearch}%`,
      )
    }
    if (filterTipo !== 'ALL') query = query.eq('tipo', filterTipo)
    if (filterNatureza !== 'ALL') query = query.ilike('natureza', filterNatureza)
    if (debouncedFinalidade) query = query.ilike('finalidade', `%${debouncedFinalidade}%`)
    if (filterNivel !== 'ALL') query = query.eq('nivel_tipo', filterNivel)

    query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast.error('Erro ao buscar contas: ' + error.message)
    } else {
      setContas(data || [])
      if (count !== null) setTotalCount(count)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardStatsAndMask()
  }, [user])

  useEffect(() => {
    fetchContas()
  }, [
    user,
    page,
    pageSize,
    sortConfig,
    debouncedSearch,
    filterNivel,
    filterTipo,
    filterNatureza,
    debouncedFinalidade,
    refreshTrigger,
  ])

  const refreshGlobalData = () => {
    fetchDashboardStatsAndMask()
    setRefreshTrigger((prev) => prev + 1)
  }

  const getCalculatedLevel = useCallback(
    (classificacao?: string) => {
      if (!expectedMask || !classificacao) return 'SINTETICA'
      let dots = 0
      for (let i = 0; i < classificacao.length; i++) {
        if (classificacao[i] === '.') dots++
      }
      return dots === expectedMask.length - 1 ? 'ANALITICA' : 'SINTETICA'
    },
    [expectedMask],
  )

  const chartData = useMemo(() => {
    return [
      { name: 'Ativo', value: dashboardStats.ATIVO, color: '#3b82f6' },
      { name: 'Passivo', value: dashboardStats.PASSIVO, color: '#ef4444' },
      { name: 'Receitas', value: dashboardStats.RECEITAS, color: '#10b981' },
      { name: 'Despesas', value: dashboardStats.DESPESAS, color: '#f59e0b' },
      { name: 'Outros', value: dashboardStats.OUTROS, color: '#94a3b8' },
    ].filter((d) => d.value > 0)
  }, [dashboardStats])

  const logExport = (format: string, count: number) => {
    if (user) {
      supabase
        .from('export_history')
        .insert([
          {
            user_id: user.id,
            file_name: `plano_contas_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`,
            type: 'PLANO_CONTAS',
            records_count: count,
          },
        ])
        .then()
    }
  }

  const handleExport = async (format: 'CSV' | 'PDF' | 'BROWSER') => {
    if (totalCount === 0) {
      toast.error('Não há contas para exportar.')
      return
    }

    setExporting(true)
    const toastId = toast.loading('Preparando exportação, aguarde...')

    try {
      let allData: any[] = []
      let from = 0
      const step = 1000
      let fetchMore = true

      while (fetchMore) {
        let query = supabase.from('plano_contas').select('*').eq('user_id', user?.id)

        if (debouncedSearch) {
          query = query.or(
            `codigo.ilike.%${debouncedSearch}%,nome.ilike.%${debouncedSearch}%,classificacao.ilike.%${debouncedSearch}%,finalidade.ilike.%${debouncedSearch}%`,
          )
        }
        if (filterTipo !== 'ALL') query = query.eq('tipo', filterTipo)
        if (filterNatureza !== 'ALL') query = query.ilike('natureza', filterNatureza)
        if (debouncedFinalidade) query = query.ilike('finalidade', `%${debouncedFinalidade}%`)
        if (filterNivel !== 'ALL') query = query.eq('nivel_tipo', filterNivel)

        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
        query = query.range(from, from + step - 1)

        const { data, error } = await query
        if (error) throw error

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          from += step
          if (data.length < step) fetchMore = false
        } else {
          fetchMore = false
        }
      }

      toast.dismiss(toastId)

      if (format === 'CSV') {
        const headers = [
          'Código',
          'Classificação',
          'Nome',
          'Nível',
          'Tipo',
          'Natureza',
          'Finalidade',
        ]
        const csvContent = [
          headers.join(';'),
          ...allData.map((c) => {
            const nivel = c.nivel_tipo || getCalculatedLevel(c.classificacao)
            return [
              c.codigo || '',
              c.classificacao || '',
              `"${(c.nome || '').replace(/"/g, '""')}"`,
              nivel,
              c.tipo || '',
              c.natureza || '',
              `"${(c.finalidade || '').replace(/"/g, '""')}"`,
            ].join(';')
          }),
        ].join('\n')

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `plano_contas_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Plano de Contas</title>
            <style>
              body { font-family: sans-serif; font-size: 12px; margin: 20px; color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
              th { background-color: #f4f4f4; font-weight: bold; }
              h1 { font-size: 18px; margin-bottom: 5px; }
              .meta { font-size: 11px; color: #666; margin-bottom: 20px; }
              .sintetica { background-color: #f9fafb; font-weight: 600; }
              @media print {
                body { margin: 0; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
              }
            </style>
          </head>
          <body>
            <h1>Plano de Contas</h1>
            <div class="meta">Exportado em: ${new Date().toLocaleString('pt-BR')} | Total de contas: ${allData.length}</div>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Classificação</th>
                  <th>Nome</th>
                  <th>Nível</th>
                  <th>Tipo</th>
                  <th>Natureza</th>
                </tr>
              </thead>
              <tbody>
                ${allData
                  .map((c) => {
                    const nivel = c.nivel_tipo || getCalculatedLevel(c.classificacao)
                    const isSintetica = nivel === 'SINTETICA'
                    return `<tr class="${isSintetica ? 'sintetica' : ''}">
                    <td>${c.codigo || ''}</td>
                    <td>${c.classificacao || ''}</td>
                    <td>${c.nome || ''}</td>
                    <td>${nivel}</td>
                    <td>${c.tipo || ''}</td>
                    <td>${c.natureza || ''}</td>
                  </tr>`
                  })
                  .join('')}
              </tbody>
            </table>
            ${format === 'PDF' ? '<script>window.onload = function() { window.print(); }</script>' : ''}
          </body>
          </html>
        `
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const win = window.open(url, '_blank')
        if (!win) {
          toast.error(
            'O navegador bloqueou a abertura da nova aba. Permita pop-ups para este site.',
          )
        }
      }
      logExport(format, allData.length)
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error('Erro na exportação: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleRestore = async () => {
    if (!user) return
    if (
      !confirm(
        'Atenção: Isso irá desfazer a última importação e restaurar o plano de contas anterior. Deseja continuar?',
      )
    )
      return

    setRestoring(true)
    setRestoreProgress(5)
    try {
      const { data: backups, error: backupError } = await supabase
        .from('plano_contas_backup')
        .select('*')
        .eq('user_id', user.id)
        .order('backup_date', { ascending: false })
        .limit(1)

      if (backupError) throw backupError
      if (!backups || backups.length === 0) {
        toast.error('Nenhum backup encontrado para restaurar.')
        setRestoring(false)
        return
      }

      setRestoreProgress(15)
      const lastBackup = backups[0]
      const backupData = lastBackup.data as any[]

      if (!Array.isArray(backupData) || backupData.length === 0) {
        toast.error('O backup encontrado está vazio ou inválido.')
        setRestoring(false)
        return
      }

      let allIdsToDelete: string[] = []
      let fromDelete = 0
      const stepDelete = 1000
      let fetchMoreDelete = true

      while (fetchMoreDelete) {
        const { data: currentContas, error: fetchError } = await supabase
          .from('plano_contas')
          .select('id')
          .eq('user_id', user.id)
          .range(fromDelete, fromDelete + stepDelete - 1)

        if (fetchError) throw fetchError

        if (currentContas && currentContas.length > 0) {
          allIdsToDelete = [...allIdsToDelete, ...currentContas.map((c) => c.id)]
          fromDelete += stepDelete
          if (currentContas.length < stepDelete) fetchMoreDelete = false
        } else {
          fetchMoreDelete = false
        }
      }

      setRestoreProgress(30)

      if (allIdsToDelete.length > 0) {
        const DELETE_BATCH_SIZE = 40
        for (let i = 0; i < allIdsToDelete.length; i += DELETE_BATCH_SIZE) {
          const batch = allIdsToDelete.slice(i, i + DELETE_BATCH_SIZE)
          const { error: deleteError } = await supabase
            .from('plano_contas')
            .delete()
            .in('id', batch)
          if (deleteError) throw deleteError
          const progress = 30 + ((i + batch.length) / allIdsToDelete.length) * 30
          setRestoreProgress(progress)
        }
      } else {
        setRestoreProgress(60)
      }

      const sanitizedData = backupData.map((c) => {
        const { id, importacao_id, ...rest } = c
        return { ...rest, user_id: user.id }
      })

      for (let i = 0; i < sanitizedData.length; i += 1000) {
        const batch = sanitizedData.slice(i, i + 1000)
        const { error: insertError } = await supabase.from('plano_contas').insert(batch)
        if (insertError) throw insertError
        const progress = 60 + ((i + batch.length) / sanitizedData.length) * 40
        setRestoreProgress(Math.min(100, progress))
      }

      setRestoreProgress(100)
      toast.success('Plano de contas restaurado com sucesso!')
      refreshGlobalData()
    } catch (err: any) {
      toast.error('Erro ao restaurar: ' + err.message)
    } finally {
      setTimeout(() => setRestoring(false), 500)
    }
  }

  const handleNaturezaClick = (nat: string) => {
    setFilterNatureza(filterNatureza === nat ? 'ALL' : nat)
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleSelect = (id: string, shiftKey: boolean) => {
    const next = new Set(selected)
    if (shiftKey && lastSelected) {
      const items = contas.map((c) => c.id)
      const start = items.indexOf(lastSelected)
      const end = items.indexOf(id)
      if (start !== -1 && end !== -1) {
        const min = Math.min(start, end)
        const max = Math.max(start, end)
        for (let i = min; i <= max; i++) next.add(items[i])
      }
    } else {
      if (next.has(id)) next.delete(id)
      else next.add(id)
    }
    setSelected(next)
    setLastSelected(id)
  }

  const toggleAll = () => {
    if (selected.size === contas.length && contas.length > 0) setSelected(new Set())
    else setSelected(new Set(contas.map((c) => c.id)))
    setLastSelected(null)
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Excluir ${selected.size} contas selecionadas?`)) return

    const selectedIds = Array.from(selected)
    const DELETE_BATCH_SIZE = 40
    for (let i = 0; i < selectedIds.length; i += DELETE_BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + DELETE_BATCH_SIZE)
      const { error } = await supabase.from('plano_contas').delete().in('id', batch)
      if (error) {
        toast.error('Erro ao excluir: ' + error.message)
        return
      }
    }

    toast.success('Contas excluídas com sucesso!')
    setSelected(new Set())
    refreshGlobalData()
  }

  const handleDeleteIndividual = async (id: string) => {
    if (!confirm('Excluir esta conta?')) return
    await supabase.from('plano_contas').delete().eq('id', id)
    toast.success('Conta excluída!')
    refreshGlobalData()
  }

  const handleBatchUpdate = async () => {
    if (!batchConfig.prefix || (!batchConfig.tipo && !batchConfig.natureza)) {
      toast.error('Preencha o prefixo e ao menos um campo para atualizar.')
      return
    }

    const updates: any = {}
    if (batchConfig.tipo) updates.tipo = batchConfig.tipo
    if (batchConfig.natureza) updates.natureza = batchConfig.natureza

    try {
      const { error } = await supabase
        .from('plano_contas')
        .update(updates)
        .like('classificacao', `${batchConfig.prefix}%`)
        .eq('user_id', user?.id)

      if (error) throw error
      toast.success('Contas atualizadas em lote com sucesso!')
      setBatchDialogOpen(false)
      refreshGlobalData()
    } catch (err: any) {
      toast.error('Erro ao atualizar em lote: ' + err.message)
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    let strictNivel = formData.nivel_tipo
    if (expectedMask && formData.classificacao) {
      const parts = formData.classificacao.split('.')
      let valid = true
      for (let i = 0; i < parts.length; i++) {
        if (expectedMask[i] && parts[i].length !== expectedMask[i]) {
          valid = false
        }
      }
      if (!valid) {
        toast.error(
          `Estrutura inválida! O padrão detectado para cada nível é: ${expectedMask.join('.')}. Sua classificação difere disso.`,
        )
        return
      }
      strictNivel = parts.length === expectedMask.length ? 'ANALITICA' : 'SINTETICA'
    }

    const payload = { ...formData, nivel_tipo: strictNivel, user_id: user?.id }

    try {
      if (editingConta?.id) {
        await supabase.from('plano_contas').update(payload).eq('id', editingConta.id)
        toast.success('Conta atualizada!')
      } else {
        await supabase.from('plano_contas').insert([payload])
        toast.success('Conta criada!')
      }
      setSheetOpen(false)
      refreshGlobalData()
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message)
    }
  }

  const handleFormChange = (field: string, value: string) => {
    let updates: any = { [field]: value }
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const openEdit = (conta: any) => {
    setEditingConta(conta)
    setFormData({
      codigo: conta.codigo || '',
      classificacao: conta.classificacao || '',
      nome: conta.nome || '',
      mascara: conta.mascara || '',
      tipo: conta.tipo || '',
      natureza: conta.natureza || '',
      finalidade: conta.finalidade || '',
      nivel_tipo: conta.nivel_tipo || 'SINTETICA',
    })
    setSheetOpen(true)
  }

  const openNew = () => {
    setEditingConta(null)
    setFormData({
      codigo: '',
      classificacao: '',
      nome: '',
      mascara: '',
      tipo: '',
      natureza: '',
      finalidade: '',
      nivel_tipo: 'SINTETICA',
    })
    setSheetOpen(true)
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUpDown className="ml-1 w-3 h-3 inline-block text-slate-300" />
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 w-3 h-3 inline-block text-primary" />
    ) : (
      <ArrowDown className="ml-1 w-3 h-3 inline-block text-primary" />
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl flex flex-col animate-in fade-in duration-500 min-h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Plano de Contas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie a estrutura contábil, naturezas e diretrizes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir ({selected.size})
            </Button>
          )}

          <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
              >
                <Layers className="w-4 h-4 mr-2" /> Atualização Lote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atualização em Lote</DialogTitle>
                <DialogDescription>
                  Defina regras baseadas no início da classificação para atualizar várias contas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Classificação Iniciada Em (Ex: 1 ou 1.1)</Label>
                  <Input
                    value={batchConfig.prefix}
                    onChange={(e) => setBatchConfig({ ...batchConfig, prefix: e.target.value })}
                    placeholder="Ex: 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Definir Tipo</Label>
                  <select
                    value={batchConfig.tipo}
                    onChange={(e) => setBatchConfig({ ...batchConfig, tipo: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Não alterar</option>
                    <option value="DEVEDORA">Devedora</option>
                    <option value="CREDORA">Credora</option>
                    <option value="AMBAS">Ambas</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Definir Natureza</Label>
                  <select
                    value={batchConfig.natureza}
                    onChange={(e) => setBatchConfig({ ...batchConfig, natureza: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Não alterar</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="PASSIVO">Passivo</option>
                    <option value="RECEITAS">Receitas</option>
                    <option value="DESPESAS">Despesas</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleBatchUpdate}>Aplicar em Lote</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handleRestore}
            disabled={restoring}
            className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
          >
            {restoring ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Desfazer
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                disabled={exporting || totalCount === 0}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {exporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('CSV')} disabled={exporting}>
                Exportar como CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('PDF')} disabled={exporting}>
                Exportar como PDF (Imprimir)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('BROWSER')} disabled={exporting}>
                Visualizar no Navegador
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6 animate-in slide-in-from-top-4 duration-500">
        <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className={cn(
              'bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50 shadow-sm cursor-pointer transition-all hover:shadow-md',
              filterNatureza === 'ATIVO'
                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background'
                : 'hover:border-blue-300',
            )}
            onClick={() => handleNaturezaClick('ATIVO')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                Ativo
              </CardTitle>
              <Wallet className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {dashboardStats.ATIVO}
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'bg-red-50/60 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 shadow-sm cursor-pointer transition-all hover:shadow-md',
              filterNatureza === 'PASSIVO'
                ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'
                : 'hover:border-red-300',
            )}
            onClick={() => handleNaturezaClick('PASSIVO')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wider">
                Passivo
              </CardTitle>
              <Wallet className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {dashboardStats.PASSIVO}
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 shadow-sm cursor-pointer transition-all hover:shadow-md',
              filterNatureza === 'RECEITAS'
                ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background'
                : 'hover:border-emerald-300',
            )}
            onClick={() => handleNaturezaClick('RECEITAS')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Receitas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {dashboardStats.RECEITAS}
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50 shadow-sm cursor-pointer transition-all hover:shadow-md',
              filterNatureza === 'DESPESAS'
                ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background'
                : 'hover:border-amber-300',
            )}
            onClick={() => handleNaturezaClick('DESPESAS')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Despesas
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {dashboardStats.DESPESAS}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="col-span-1 shadow-sm bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
              <PieChartIcon className="w-3.5 h-3.5" /> Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[80px] flex justify-center items-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={22}
                    outerRadius={35}
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ color: '#333' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">Sem dados</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        {/* ADVANCED FILTERS BAR */}
        <div className="p-3 border-b flex flex-wrap gap-3 bg-slate-50/80 dark:bg-slate-900/80 items-end">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Pesquisa
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Código, nome, classif..."
                className="pl-9 h-9 text-sm bg-white dark:bg-slate-950 border-slate-300 focus-visible:ring-primary/30 shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-[140px] space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Nível
            </Label>
            <Select value={filterNivel} onValueChange={setFilterNivel}>
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-950 border-slate-300 shadow-inner">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="SINTETICA">Sintética</SelectItem>
                <SelectItem value="ANALITICA">Analítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[140px] space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Tipo
            </Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-950 border-slate-300 shadow-inner">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="DEVEDORA">Devedora</SelectItem>
                <SelectItem value="CREDORA">Credora</SelectItem>
                <SelectItem value="AMBAS">Ambas</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[140px] space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Natureza
            </Label>
            <Select value={filterNatureza} onValueChange={setFilterNatureza}>
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-950 border-slate-300 shadow-inner">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="PASSIVO">Passivo</SelectItem>
                <SelectItem value="RECEITAS">Receitas</SelectItem>
                <SelectItem value="DESPESAS">Despesas</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px] space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Em Finalidade
            </Label>
            <Input
              placeholder="Palavra-chave..."
              className="h-9 text-sm bg-white dark:bg-slate-950 border-slate-300 shadow-inner"
              value={filterFinalidade}
              onChange={(e) => setFilterFinalidade(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/20 dark:bg-slate-950 relative">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-900 shadow-sm z-10 border-b border-slate-300 dark:border-slate-700">
              <TableRow className="border-0">
                <TableHead className="w-10 text-center px-2 py-2">
                  <Checkbox
                    checked={contas.length > 0 && selected.size === contas.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead
                  className="w-20 px-2 py-2 cursor-pointer hover:bg-slate-200/50 select-none"
                  onClick={() => handleSort('codigo')}
                >
                  Código <SortIcon columnKey="codigo" />
                </TableHead>
                <TableHead
                  className="w-28 px-2 py-2 cursor-pointer hover:bg-slate-200/50 select-none"
                  onClick={() => handleSort('classificacao')}
                >
                  Classificação <SortIcon columnKey="classificacao" />
                </TableHead>
                <TableHead
                  className="px-2 py-2 cursor-pointer hover:bg-slate-200/50 select-none"
                  onClick={() => handleSort('nome')}
                >
                  Nome <SortIcon columnKey="nome" />
                </TableHead>
                <TableHead className="w-24 px-2 py-2">Nível</TableHead>
                <TableHead
                  className="w-24 px-2 py-2 cursor-pointer hover:bg-slate-200/50 select-none"
                  onClick={() => handleSort('tipo')}
                >
                  Tipo <SortIcon columnKey="tipo" />
                </TableHead>
                <TableHead
                  className="w-28 px-2 py-2 cursor-pointer hover:bg-slate-200/50 select-none"
                  onClick={() => handleSort('natureza')}
                >
                  Natureza <SortIcon columnKey="natureza" />
                </TableHead>
                <TableHead className="w-16 px-2 py-2 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : contas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Nenhuma conta encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                contas.map((conta) => {
                  const levels = conta.classificacao ? conta.classificacao.split('.').length : 0
                  const calculatedLevel =
                    conta.nivel_tipo || getCalculatedLevel(conta.classificacao)

                  let rowBgClass =
                    'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  let textClass = 'text-slate-700 dark:text-slate-300'
                  let borderClass = 'border-b border-slate-200 dark:border-slate-800'

                  if (calculatedLevel === 'SINTETICA') {
                    if (levels === 1) {
                      rowBgClass =
                        'bg-blue-950 hover:bg-blue-900 dark:bg-blue-950 dark:hover:bg-blue-900/80'
                      textClass = 'text-white'
                      borderClass = 'border-b border-blue-900/50 dark:border-blue-800'
                    } else if (levels === 2) {
                      rowBgClass =
                        'bg-blue-800 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800/80'
                      textClass = 'text-white'
                      borderClass = 'border-b border-blue-700/50 dark:border-blue-700/50'
                    } else if (levels === 3) {
                      rowBgClass =
                        'bg-blue-500 hover:bg-blue-600 dark:bg-blue-800 dark:hover:bg-blue-700/80'
                      textClass = 'text-white'
                      borderClass = 'border-b border-blue-400/50 dark:border-blue-600/50'
                    } else if (levels >= 4) {
                      rowBgClass =
                        'bg-blue-200 hover:bg-blue-300 dark:bg-blue-900/40 dark:hover:bg-blue-900/60'
                      textClass = 'text-blue-950 dark:text-blue-100'
                      borderClass = 'border-b border-blue-300/50 dark:border-blue-800/50'
                    }
                  }

                  return (
                    <TableRow
                      key={conta.id}
                      className={cn('transition-colors group h-10', borderClass, rowBgClass)}
                    >
                      <TableCell className="text-center px-2 py-1.5">
                        <Checkbox
                          checked={selected.has(conta.id)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(_, e) => {
                            const isShift = (window.event as MouseEvent)?.shiftKey || false
                            toggleSelect(conta.id, isShift)
                          }}
                          className={cn(
                            textClass.includes('text-white') &&
                              'border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-blue-900',
                          )}
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          'font-medium text-xs px-2 py-1.5 whitespace-nowrap',
                          textClass,
                        )}
                      >
                        {conta.codigo}
                      </TableCell>
                      <TableCell
                        className={cn('text-xs px-2 py-1.5 whitespace-nowrap font-mono', textClass)}
                      >
                        {conta.classificacao}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-sm px-2 py-1.5 max-w-[200px] md:max-w-[300px]',
                          textClass,
                        )}
                      >
                        <div className="truncate w-full">
                          {conta.finalidade ? (
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger className="text-left cursor-help truncate w-full block">
                                {conta.nome}
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-xs whitespace-normal bg-slate-800 text-white border-slate-700"
                              >
                                <p className="font-semibold text-xs mb-1">Finalidade:</p>
                                <p className="text-xs text-slate-200">{conta.finalidade}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="truncate w-full block">{conta.nome}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${calculatedLevel === 'ANALITICA' ? 'bg-purple-50 text-purple-700 ring-purple-700/20' : 'bg-slate-100 text-slate-700 ring-slate-500/20'}`}
                        >
                          {calculatedLevel}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        {conta.tipo && (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/20">
                            {conta.tipo}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={cn('text-xs px-2 py-1.5 font-medium', textClass)}>
                        {conta.natureza || '-'}
                      </TableCell>
                      <TableCell className="text-right px-2 py-1.5">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-black/10 dark:hover:bg-white/10"
                            onClick={() => openEdit(conta)}
                          >
                            <Edit
                              className={cn(
                                'w-3.5 h-3.5',
                                textClass.includes('text-white') ? 'text-white' : 'text-slate-500',
                              )}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-black/10 dark:hover:bg-white/10"
                            onClick={() => handleDeleteIndividual(conta.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION BAR */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="flex items-center gap-2">
              <span>
                Mostrando {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} a{' '}
                {Math.min(page * pageSize, totalCount)} de {totalCount} registros
              </span>
              {(search !== debouncedSearch ||
                filterFinalidade !== debouncedFinalidade ||
                loading) && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
              <span className="hidden sm:inline text-xs">por página</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center justify-center px-3 font-medium text-xs">
              Página {page} de {totalPages}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingConta ? 'Editar Conta' : 'Nova Conta'}</SheetTitle>
            <SheetDescription>Preencha os detalhes da conta contábil.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleFormChange('codigo', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mascara">Máscara</Label>
                <Input
                  id="mascara"
                  value={formData.mascara}
                  onChange={(e) => handleFormChange('mascara', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="classificacao">Classificação</Label>
                {expectedMask && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Padrão Detectado: {expectedMask.join('.')}
                  </span>
                )}
              </div>
              <Input
                id="classificacao"
                value={formData.classificacao}
                onChange={(e) => handleFormChange('classificacao', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Conta</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleFormChange('nome', e.target.value)}
                required
              />
            </div>

            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="nivel_tipo"
                  className="font-semibold text-slate-700 dark:text-slate-300"
                >
                  Nível da Conta
                </Label>
                <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Cálculo Automático
                </span>
              </div>
              <Input
                value={getCalculatedLevel(formData.classificacao)}
                disabled
                className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                O nível é definido rigorosamente com base na máscara do seu plano de contas. Contas
                com {expectedMask?.length || 'X'} níveis são consideradas Analíticas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => handleFormChange('tipo', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  <option value="DEVEDORA">Devedora</option>
                  <option value="CREDORA">Credora</option>
                  <option value="AMBAS">Ambas</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="natureza">Natureza</Label>
                <select
                  id="natureza"
                  value={formData.natureza}
                  onChange={(e) => handleFormChange('natureza', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PASSIVO">Passivo</option>
                  <option value="RECEITAS">Receitas</option>
                  <option value="DESPESAS">Despesas</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalidade">Finalidade / Diretrizes de Uso</Label>
              <textarea
                id="finalidade"
                value={formData.finalidade}
                onChange={(e) => handleFormChange('finalidade', e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Descreva quando e como utilizar esta conta..."
              />
            </div>

            <SheetFooter className="pt-4">
              <Button type="submit" className="w-full">
                Salvar Conta
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={restoring}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Desfazendo Importação</DialogTitle>
            <DialogDescription>
              Restaurando o plano de contas para a versão anterior. Por favor, não feche esta janela
              ou recarregue a página.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Progress value={restoreProgress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground font-medium">
              {Math.round(restoreProgress)}% concluído
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

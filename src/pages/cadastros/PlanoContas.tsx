import { useState, useEffect, useMemo, useRef } from 'react'
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
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function PlanoContas() {
  const { user } = useAuth()
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastSelected, setLastSelected] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Batch Update State
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchConfig, setBatchConfig] = useState({ prefix: '', tipo: '', natureza: '' })

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'classificacao',
    direction: 'asc',
  })

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

  // Virtualization State
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const rowHeight = 40
  const overscan = 15

  const fetchContas = async () => {
    if (!user) return
    setLoading(true)
    let allData: any[] = []
    let from = 0
    const step = 1000
    let fetchMore = true

    while (fetchMore) {
      const { data } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('user_id', user.id)
        .range(from, from + step - 1)

      if (data && data.length > 0) {
        allData = [...allData, ...data]
        from += step
        if (data.length < step) fetchMore = false
      } else {
        fetchMore = false
      }
    }
    setContas(allData)
    setLoading(false)
  }

  useEffect(() => {
    fetchContas()
  }, [user])

  // Derive mask pattern from existing accounts to validate new ones
  const expectedMask = useMemo(() => {
    if (contas.length === 0) return null
    let maxParts = 0
    let standardClassificacao = ''
    contas.forEach((c) => {
      if (c.classificacao) {
        const parts = c.classificacao.split('.')
        if (parts.length > maxParts) {
          maxParts = parts.length
          standardClassificacao = c.classificacao
        }
      }
    })
    return standardClassificacao ? standardClassificacao.split('.').map((p) => p.length) : null
  }, [contas])

  const filteredContas = useMemo(() => {
    return contas.filter(
      (c) =>
        (c.codigo || '').includes(search) ||
        (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.classificacao || '').includes(search),
    )
  }, [contas, search])

  const sortedContas = useMemo(() => {
    const sortableItems = [...filteredContas]
    sortableItems.sort((a, b) => {
      const aVal = (a[sortConfig.key] || '').toString().toLowerCase()
      const bVal = (b[sortConfig.key] || '').toString().toLowerCase()
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sortableItems
  }, [filteredContas, sortConfig])

  // Virtualization Calculations
  const clientHeight = containerRef.current?.clientHeight || 600
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIndex = Math.min(
    sortedContas.length,
    Math.ceil((scrollTop + clientHeight) / rowHeight) + overscan,
  )
  const visibleContas = sortedContas.slice(startIndex, endIndex)
  const topSpacer = startIndex * rowHeight
  const bottomSpacer = Math.max(0, (sortedContas.length - endIndex) * rowHeight)

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleSelect = (id: string, shiftKey: boolean) => {
    const next = new Set(selected)
    if (shiftKey && lastSelected) {
      const items = sortedContas.map((c) => c.id)
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
    if (selected.size === sortedContas.length) setSelected(new Set())
    else setSelected(new Set(sortedContas.map((c) => c.id)))
    setLastSelected(null)
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Excluir ${selected.size} contas selecionadas?`)) return

    await supabase.from('plano_contas').delete().in('id', Array.from(selected))
    toast.success('Contas excluídas com sucesso!')
    setSelected(new Set())
    fetchContas()
  }

  const handleDeleteIndividual = async (id: string) => {
    if (!confirm('Excluir esta conta?')) return
    await supabase.from('plano_contas').delete().eq('id', id)
    toast.success('Conta excluída!')
    fetchContas()
  }

  const handleBatchUpdate = async () => {
    if (!batchConfig.prefix || (!batchConfig.tipo && !batchConfig.natureza)) {
      toast.error('Preencha o prefixo e ao menos um campo para atualizar.')
      return
    }

    const updates: any = {}
    if (batchConfig.tipo) updates.tipo = batchConfig.tipo
    if (batchConfig.natureza) updates.natureza = batchConfig.natureza

    setLoading(true)
    try {
      const { error } = await supabase
        .from('plano_contas')
        .update(updates)
        .like('classificacao', `${batchConfig.prefix}%`)
        .eq('user_id', user?.id)

      if (error) throw error
      toast.success('Contas atualizadas em lote com sucesso!')
      setBatchDialogOpen(false)
      fetchContas()
    } catch (err: any) {
      toast.error('Erro ao atualizar em lote: ' + err.message)
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Mask Validation & Auto Strict Level Calculation
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
      fetchContas()
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

  const getCalculatedLevel = (classificacao: string) => {
    if (!expectedMask || !classificacao) return 'SINTETICA'
    const parts = classificacao.split('.')
    return parts.length === expectedMask.length ? 'ANALITICA' : 'SINTETICA'
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
    <div className="container mx-auto py-8 px-4 max-w-7xl flex flex-col animate-in fade-in duration-500 h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Plano de Contas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie a estrutura contábil, naturezas e diretrizes ({contas.length} contas).
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                <Layers className="w-4 h-4 mr-2" /> Atualização em Lote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atualização em Lote</DialogTitle>
                <DialogDescription>
                  Defina regras baseadas no início da classificação para atualizar várias contas
                  simultaneamente.
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

          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Conta
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="p-3 border-b flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por código, classificação ou nome..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Dica: Use <kbd className="px-1 bg-slate-100 rounded border">Shift</kbd> + Click para
            seleção múltipla.
          </p>
        </div>

        <div
          className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-950 relative"
          ref={containerRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-900 shadow-sm z-10 border-b border-slate-300 dark:border-slate-700">
                <TableRow className="border-0">
                  <TableHead className="w-10 text-center px-2 py-2">
                    <Checkbox
                      checked={sortedContas.length > 0 && selected.size === sortedContas.length}
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
                  <TableHead className="w-24 px-2 py-2">Tipo</TableHead>
                  <TableHead className="w-28 px-2 py-2">Natureza</TableHead>
                  <TableHead className="w-16 px-2 py-2 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSpacer > 0 && (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={8} className="p-0 border-0" style={{ height: topSpacer }} />
                  </TableRow>
                )}
                {visibleContas.map((conta) => {
                  const levels = conta.classificacao ? conta.classificacao.split('.').length : 0
                  const isSinteticaVisual = levels <= 4
                  const calculatedLevel = getCalculatedLevel(conta.classificacao)

                  return (
                    <TableRow
                      key={conta.id}
                      style={{ height: rowHeight }}
                      className={cn(
                        'hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group',
                        'border-b border-slate-300 dark:border-slate-700',
                        isSinteticaVisual
                          ? 'bg-blue-50/60 dark:bg-blue-900/20'
                          : 'bg-white dark:bg-slate-900',
                      )}
                    >
                      <TableCell className="text-center px-2 py-1.5">
                        <Checkbox
                          checked={selected.has(conta.id)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(_, e) => {
                            const isShift = (window.event as MouseEvent)?.shiftKey || false
                            toggleSelect(conta.id, isShift)
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300 text-xs px-2 py-1.5 whitespace-nowrap">
                        {conta.codigo}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5 whitespace-nowrap font-mono">
                        {conta.classificacao}
                      </TableCell>
                      <TableCell className="text-sm px-2 py-1.5 max-w-[200px] md:max-w-[400px]">
                        <div className="truncate w-full">
                          {conta.finalidade ? (
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger className="text-left cursor-help truncate w-full block">
                                {conta.nome}
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-xs whitespace-normal bg-slate-800 text-white"
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
                      <TableCell className="text-xs px-2 py-1.5 text-slate-600 font-medium">
                        {conta.natureza || '-'}
                      </TableCell>
                      <TableCell className="text-right px-2 py-1.5">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openEdit(conta)}
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500 hover:text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteIndividual(conta.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {bottomSpacer > 0 && (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell
                      colSpan={8}
                      className="p-0 border-0"
                      style={{ height: bottomSpacer }}
                    />
                  </TableRow>
                )}
                {sortedContas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Nenhuma conta encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
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
    </div>
  )
}

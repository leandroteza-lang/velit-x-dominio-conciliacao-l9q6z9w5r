import { useState, useEffect } from 'react'
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
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Download, Search, Edit } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export default function PlanoContas() {
  const { user } = useAuth()
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingConta, setEditingConta] = useState<any>(null)

  const fetchContas = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('plano_contas')
      .select('*')
      .eq('user_id', user.id)
      .order('codigo')
    setContas(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchContas()
  }, [user])

  const filteredContas = contas.filter(
    (c) =>
      (c.codigo || '').includes(search) ||
      (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.classificacao || '').includes(search),
  )

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === filteredContas.length) setSelected(new Set())
    else setSelected(new Set(filteredContas.map((c) => c.id)))
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Excluir ${selected.size} contas selecionadas?`)) return

    await supabase.from('plano_contas').delete().in('id', Array.from(selected))
    toast.success('Contas excluídas com sucesso!')
    setSelected(new Set())
    fetchContas()
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      codigo: fd.get('codigo'),
      classificacao: fd.get('classificacao'),
      nome: fd.get('nome'),
      mascara: fd.get('mascara'),
      tipo: fd.get('tipo'),
      natureza: fd.get('natureza'),
      finalidade: fd.get('finalidade'),
      user_id: user?.id,
    }

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

  const openEdit = (conta: any) => {
    setEditingConta(conta)
    setSheetOpen(true)
  }
  const openNew = () => {
    setEditingConta(null)
    setSheetOpen(true)
  }

  const exportExcel = async () => {
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs' as any)
      const exportData = filteredContas.map((c) => ({
        Código: c.codigo,
        Classificação: c.classificacao,
        Nome: c.nome,
        Tipo: c.tipo,
        Natureza: c.natureza,
        Finalidade: c.finalidade,
      }))
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Plano de Contas')
      XLSX.writeFile(wb, 'Plano_de_Contas.xlsx')
    } catch (err) {
      toast.error('Erro ao gerar Excel')
    }
  }

  const exportPDF = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const html = `
      <html><head><title>Plano de Contas</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
        th { background: #f4f4f5; }
      </style></head><body>
      <h2>Plano de Contas</h2>
      <table>
        <tr><th>Código</th><th>Classificação</th><th>Nome</th><th>Tipo</th><th>Natureza</th><th>Finalidade</th></tr>
        ${filteredContas
          .map(
            (c) => `<tr>
          <td>${c.codigo || ''}</td><td>${c.classificacao || ''}</td><td>${c.nome || ''}</td>
          <td>${c.tipo || ''}</td><td>${c.natureza || ''}</td><td>${c.finalidade || ''}</td>
        </tr>`,
          )
          .join('')}
      </table>
      <script>window.print(); window.setTimeout(window.close, 500);</script>
      </body></html>
    `
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl flex flex-col animate-in fade-in duration-500 h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Plano de Contas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie a estrutura contábil, naturezas e descrições.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir ({selected.size})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportExcel}>Exportar para Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>Exportar para PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Conta
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por código, classificação ou nome..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 shadow-sm z-10">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={filteredContas.length > 0 && selected.size === filteredContas.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContas.map((conta) => (
                  <TableRow
                    key={conta.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selected.has(conta.id)}
                        onCheckedChange={() => toggleSelect(conta.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                      {conta.codigo}
                    </TableCell>
                    <TableCell>{conta.classificacao}</TableCell>
                    <TableCell>{conta.nome}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400">
                        {conta.tipo || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{conta.natureza || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(conta)}>
                        <Edit className="w-4 h-4 text-slate-500 hover:text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
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
                <Input id="codigo" name="codigo" defaultValue={editingConta?.codigo} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mascara">Máscara</Label>
                <Input id="mascara" name="mascara" defaultValue={editingConta?.mascara} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classificacao">Classificação</Label>
              <Input
                id="classificacao"
                name="classificacao"
                defaultValue={editingConta?.classificacao}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Conta</Label>
              <Input id="nome" name="nome" defaultValue={editingConta?.nome} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  name="tipo"
                  defaultValue={editingConta?.tipo || ''}
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
                  name="natureza"
                  defaultValue={editingConta?.natureza || ''}
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
                name="finalidade"
                defaultValue={editingConta?.finalidade}
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

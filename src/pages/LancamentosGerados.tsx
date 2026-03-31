import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { CalendarIcon, Download, Pencil, Trash2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function LancamentosGerados() {
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [accountFilter, setAccountFilter] = useState('')
  const [date, setDate] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(false)
  const [editingRow, setEditingRow] = useState<any>(null)
  const pageSize = 30

  const fetchData = async () => {
    setLoading(true)
    try {
      let query = supabase.from('lancamentos_gerados' as any).select('*', { count: 'exact' })
      if (accountFilter) {
        query = query.or(
          `conta_debito.ilike.%${accountFilter}%,conta_credito.ilike.%${accountFilter}%`,
        )
      }
      if (date?.from) query = query.gte('data', format(date.from, 'yyyy-MM-dd'))
      if (date?.to) query = query.lte('data', format(date.to, 'yyyy-MM-dd'))

      const from = (page - 1) * pageSize
      const {
        data: result,
        error,
        count,
      } = await query.range(from, from + pageSize - 1).order('data', { ascending: false })

      if (error) throw error
      setData(result || [])
      setTotalCount(count || 0)
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchData, 400)
    return () => clearTimeout(timer)
  }, [page, accountFilter, date])

  const handleExport = async () => {
    try {
      let query = supabase
        .from('lancamentos_gerados' as any)
        .select('*')
        .order('data', { ascending: false })
      if (accountFilter)
        query = query.or(
          `conta_debito.ilike.%${accountFilter}%,conta_credito.ilike.%${accountFilter}%`,
        )
      if (date?.from) query = query.gte('data', format(date.from, 'yyyy-MM-dd'))
      if (date?.to) query = query.lte('data', format(date.to, 'yyyy-MM-dd'))

      const { data: allData, error } = await query
      if (error) throw error
      if (!allData?.length)
        return toast({ title: 'Aviso', description: 'Nenhum dado encontrado para exportar.' })

      const csv =
        '\uFEFF' +
        ['Data;Conta Débito;Conta Crédito;Valor;Tipo;Status']
          .concat(
            allData.map(
              (r) =>
                `${r.data};${r.conta_debito};${r.conta_credito};${r.valor};${r.tipo};${r.status}`,
            ),
          )
          .join('\n')

      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/plain;charset=utf-8;' }))
      link.download = `lancamentos_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`
      link.click()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao exportar.', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este lançamento?')) return
    const { error } = await supabase
      .from('lancamentos_gerados' as any)
      .delete()
      .eq('id', id)
    if (error) toast({ title: 'Erro', description: 'Falha ao deletar.', variant: 'destructive' })
    else {
      toast({ title: 'Sucesso', description: 'Lançamento removido.' })
      fetchData()
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('lancamentos_gerados' as any)
      .update(editingRow)
      .eq('id', editingRow.id)
    if (error) toast({ title: 'Erro', description: 'Falha ao atualizar.', variant: 'destructive' })
    else {
      toast({ title: 'Sucesso', description: 'Lançamento atualizado.' })
      setEditingRow(null)
      fetchData()
    }
  }

  const formatDateStr = (dateStr: string) => (dateStr ? dateStr.split('-').reverse().join('/') : '')

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos Gerados</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie e exporte os lançamentos contábeis gerados pela conciliação.
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Exportar para TXT
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por conta (Débito ou Crédito)..."
            className="pl-8"
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[280px] justify-start text-left font-normal',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from
                ? date.to
                  ? `${format(date.from, 'dd/MM/yyyy')} - ${format(date.to, 'dd/MM/yyyy')}`
                  : format(date.from, 'dd/MM/yyyy')
                : 'Filtrar por período'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(d) => {
                setDate(d)
                setPage(1)
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="border rounded-md bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Conta Débito</TableHead>
              <TableHead>Conta Crédito</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Carregando lançamentos...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum lançamento encontrado para os filtros atuais
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="group transition-colors">
                  <TableCell>{formatDateStr(row.data)}</TableCell>
                  <TableCell className="font-mono text-sm">{row.conta_debito}</TableCell>
                  <TableCell className="font-mono text-sm">{row.conta_credito}</TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {Number(row.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{row.tipo}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        row.status === 'Pendente'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800',
                      )}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingRow(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
        <span>
          Mostrando {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} a{' '}
          {Math.min(page * pageSize, totalCount)} de {totalCount} registros
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= totalCount}
          >
            Próxima
          </Button>
        </div>
      </div>

      <Dialog open={!!editingRow} onOpenChange={(o) => !o && setEditingRow(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Lançamento Gerado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  required
                  value={editingRow?.data || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, data: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={editingRow?.valor || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, valor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conta Débito</Label>
                <Input
                  required
                  value={editingRow?.conta_debito || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, conta_debito: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conta Crédito</Label>
                <Input
                  required
                  value={editingRow?.conta_credito || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, conta_credito: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input
                  required
                  value={editingRow?.tipo || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, tipo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input
                  required
                  value={editingRow?.status || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, status: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingRow(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

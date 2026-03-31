import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export default function RazaoPorConta() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [contaFilter, setContaFilter] = useState('')
  const [contasDisponiveis, setContasDisponiveis] = useState<string[]>([])
  const [openConta, setOpenConta] = useState(false)
  const pageSize = 30

  useEffect(() => {
    supabase
      .from('conciliacao_razoes')
      .select('conta')
      .then(({ data }) => {
        if (data)
          setContasDisponiveis(
            Array.from(new Set(data.map((d) => d.conta).filter(Boolean))).sort() as string[],
          )
      })
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let q = supabase.from('razao_dominio').select('*', { count: 'exact' })
        if (statusFilter !== 'all') q = q.eq('status', statusFilter)
        if (contaFilter) q = q.eq('conta', contaFilter)

        const from = (page - 1) * pageSize
        const {
          data: razaoData,
          count,
          error,
        } = await q.order('data', { ascending: true }).range(from, from + pageSize - 1)
        if (error) throw error
        setTotalCount(count || 0)

        if (razaoData?.length) {
          const contas = Array.from(
            new Set(razaoData.map((r) => r.conta).filter(Boolean)),
          ) as string[]
          const { data: balanceteData } = await supabase
            .from('balancete_dominio')
            .select('codigo, saldo_atual')
            .in('codigo', contas)
          const bMap = new Map(balanceteData?.map((b) => [b.codigo, b.saldo_atual]) || [])
          setData(
            razaoData.map((r) => ({
              ...r,
              saldo_balancete: bMap.get(r.conta) || 0,
              diferenca: (r.saldo || 0) - (bMap.get(r.conta) || 0),
            })),
          )
        } else setData([])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [page, statusFilter, contaFilter])

  const formatCurrency = (val: number | null) =>
    val === null
      ? '-'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const getStatusColor = (s: string | null) =>
    s === 'SALDO_INICIAL'
      ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-950'
      : s === 'NAO_ENCONTRADO'
        ? 'bg-red-500 hover:bg-red-600 text-white'
        : s === 'ENCONTRADO'
          ? 'bg-teal-400 hover:bg-teal-500 text-teal-950'
          : 'bg-gray-500 text-white'
  const getStatusLabel = (s: string | null) =>
    s === 'SALDO_INICIAL'
      ? 'Saldo Inicial'
      : s === 'NAO_ENCONTRADO'
        ? 'Não Encontradas'
        : s === 'ENCONTRADO'
          ? 'Encontradas'
          : s || '-'

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Razão por Conta</h1>
        <p className="text-muted-foreground">
          Comparativo detalhado entre saldos do Razão e do Balancete por conta contábil.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4 flex-row gap-4 items-end">
          <div className="flex flex-col gap-1.5 flex-1 max-w-[280px]">
            <label className="text-sm font-medium">Conta Contábil</label>
            <Popover open={openConta} onOpenChange={setOpenConta}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openConta}
                  className="justify-between"
                >
                  {contaFilter || 'Todas as contas...'}{' '}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar conta..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setContaFilter('')
                          setOpenConta(false)
                          setPage(1)
                        }}
                      >
                        <Check
                          className={cn('mr-2 h-4 w-4', !contaFilter ? 'opacity-100' : 'opacity-0')}
                        />{' '}
                        Todas as contas
                      </CommandItem>
                      {contasDisponiveis.map((conta) => (
                        <CommandItem
                          key={conta}
                          value={conta}
                          onSelect={(v) => {
                            setContaFilter(v === contaFilter ? '' : v)
                            setOpenConta(false)
                            setPage(1)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              contaFilter === conta ? 'opacity-100' : 'opacity-0',
                            )}
                          />{' '}
                          {conta}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="SALDO_INICIAL">Saldo Inicial</SelectItem>
                <SelectItem value="NAO_ENCONTRADO">Não Encontradas</SelectItem>
                <SelectItem value="ENCONTRADO">Encontradas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Saldo Razão</TableHead>
                  <TableHead className="text-right">Saldo Balancete</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : !data.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{row.conta}</TableCell>
                      <TableCell>
                        {row.data ? format(new Date(row.data), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={row.historico || ''}>
                        {row.historico}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.debito)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.credito)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.saldo)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-muted-foreground">
                        {formatCurrency(row.saldo_balancete)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-bold',
                          row.diferenca === 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400',
                        )}
                      >
                        {formatCurrency(row.diferenca)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn('border-0 font-semibold', getStatusColor(row.status))}
                        >
                          {getStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} a{' '}
              {Math.min(page * pageSize, totalCount)} de {totalCount}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalCount || loading}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

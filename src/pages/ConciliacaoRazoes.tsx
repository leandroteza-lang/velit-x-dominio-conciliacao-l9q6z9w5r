import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Search, Loader2, ChevronLeft, ChevronRight, FileText as FileTextIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ConciliacaoRazoes() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const { toast } = useToast()

  const ITEMS_PER_PAGE = 30
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    fetchData()
  }, [page, statusFilter, debouncedSearch])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: importData } = await supabase
        .from('importacoes')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!importData) {
        setData([])
        setTotalCount(0)
        return
      }

      let query = supabase
        .from('razao_dominio')
        .select('*', { count: 'exact' })
        .eq('importacao_id', importData.id)

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter)
      }

      if (debouncedSearch) {
        query = query.ilike('historico', `%${debouncedSearch}%`)
      }

      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const {
        data: tableData,
        count,
        error,
      } = await query
        .order('data', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)

      if (error) throw error

      setData(tableData || [])
      setTotalCount(count || 0)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Houve um erro ao buscar os dados da conciliação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ENCONTRADO':
        return (
          <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 shadow-none font-medium">
            Encontrado
          </Badge>
        )
      case 'NAO_ENCONTRADO':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 shadow-none font-medium">
            Não Encontrado
          </Badge>
        )
      case 'SALDO_INICIAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 shadow-none font-medium">
            Saldo Inicial
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="shadow-none">
            {status || 'Pendente'}
          </Badge>
        )
    }
  }

  return (
    <div className="container mx-auto px-4 animate-in fade-in duration-500 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Conciliação de Razões
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Audite e cruze os lançamentos individuais entre Domínio e VELIT.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:max-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por histórico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9"
              />
            </div>
            <div className="w-full sm:w-[220px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9">
                  <SelectValue placeholder="Filtrar por Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
                  <SelectItem value="NAO_ENCONTRADO">Não Encontrado</SelectItem>
                  <SelectItem value="SALDO_INICIAL">Saldo Inicial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[100px] whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Data
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Partida
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contra
                  </TableHead>
                  <TableHead className="min-w-[250px] text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Histórico
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Débito (Dom)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Crédito (Dom)
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Saldo (Dom)
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Status
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Linha Cliente
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm">Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileTextIcon className="h-10 w-10 mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="font-medium">Nenhum registro encontrado</p>
                        <p className="text-sm text-slate-400">
                          Tente ajustar seus filtros ou aguarde a geração dos dados.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 text-sm">
                        {formatDate(row.data)}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                        {row.partida || '-'}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                        {row.contra || '-'}
                      </TableCell>
                      <TableCell
                        className="text-slate-700 dark:text-slate-300 text-sm max-w-[300px] truncate"
                        title={row.historico}
                      >
                        {row.historico || '-'}
                      </TableCell>
                      <TableCell className="text-right text-slate-600 dark:text-slate-400 text-sm">
                        {formatCurrency(row.debito)}
                      </TableCell>
                      <TableCell className="text-right text-slate-600 dark:text-slate-400 text-sm">
                        {formatCurrency(row.credito)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                        {formatCurrency(row.saldo)}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                        {row.linha_cliente || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg">
            <div className="text-sm text-slate-500 font-medium">
              Mostrando {totalCount === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1} a{' '}
              {Math.min(page * ITEMS_PER_PAGE, totalCount)} de {totalCount} registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 px-2">
                Página {page} de {Math.max(1, totalPages)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0 || loading}
                className="h-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
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

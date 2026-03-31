import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Search, ChevronLeft, ChevronRight, FileX } from 'lucide-react'

type ConciliacaoRow = {
  id: string
  codigo: string
  classificacao: string
  nome: string
  saldo_anterior_dominio: number
  debito_dominio: number
  credito_dominio: number
  saldo_atual_dominio: number
  saldo_atual_velit: number
  diferenca: number
  status: string
}

const getMockData = (): ConciliacaoRow[] => {
  return [
    {
      id: '1',
      codigo: '1.1.01.01',
      classificacao: '1.1.1.01.0001',
      nome: 'Caixa Geral',
      saldo_anterior_dominio: 15000.0,
      debito_dominio: 5000.0,
      credito_dominio: 2000.0,
      saldo_atual_dominio: 18000.0,
      saldo_atual_velit: 18000.0,
      diferenca: 0,
      status: 'OK',
    },
    {
      id: '2',
      codigo: '1.1.02.01',
      classificacao: '1.1.1.02.0001',
      nome: 'Banco Itaú C/C',
      saldo_anterior_dominio: 45000.0,
      debito_dominio: 12000.0,
      credito_dominio: 8000.0,
      saldo_atual_dominio: 49000.0,
      saldo_atual_velit: 48500.0,
      diferenca: 500.0,
      status: 'Divergência',
    },
    {
      id: '3',
      codigo: '2.1.01.01',
      classificacao: '2.1.1.01.0001',
      nome: 'Fornecedores Nacionais',
      saldo_anterior_dominio: -25000.0,
      debito_dominio: 10000.0,
      credito_dominio: 15000.0,
      saldo_atual_dominio: -30000.0,
      saldo_atual_velit: 0,
      diferenca: -30000.0,
      status: 'Sem Conta',
    },
    ...Array.from({ length: 30 }).map((_, i) => ({
      id: `mock-${i + 4}`,
      codigo: `3.1.01.${String(i).padStart(2, '0')}`,
      classificacao: `3.1.1.01.${String(i).padStart(4, '0')}`,
      nome: `Despesa Operacional ${i}`,
      saldo_anterior_dominio: 0,
      debito_dominio: 1500 + i * 10,
      credito_dominio: 0,
      saldo_atual_dominio: 1500 + i * 10,
      saldo_atual_velit: 1500 + i * 10,
      diferenca: 0,
      status: 'OK',
    })),
  ]
}

export default function ConciliacaoBalancetes() {
  const [data, setData] = useState<ConciliacaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const { data: imports } = await supabase
          .from('importacoes')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)

        if (!imports || imports.length === 0) {
          setData(getMockData())
          setLoading(false)
          return
        }

        const importId = imports[0].id

        const [{ data: conciliacoes }, { data: dominios }, { data: planoContas }] =
          await Promise.all([
            supabase.from('conciliacao_balancetes').select('*').eq('importacao_id', importId),
            supabase.from('balancete_dominio').select('*').eq('importacao_id', importId),
            supabase.from('plano_contas').select('*').eq('importacao_id', importId),
          ])

        const dominiosMap = new Map(dominios?.map((d: any) => [d.codigo, d]) || [])
        const planoMap = new Map(planoContas?.map((p: any) => [p.codigo, p]) || [])

        const formatStatus = (status: string | null) => {
          if (!status) return 'Sem Conta'
          const s = status.toUpperCase()
          if (s.includes('OK') || s === 'MATCHED') return 'OK'
          if (s.includes('DIVERG') || s === 'MISMATCH') return 'Divergência'
          return 'Sem Conta'
        }

        const mergedData: ConciliacaoRow[] = (conciliacoes || []).map((c: any) => {
          const dominio = dominiosMap.get(c.conta_contabil) || {}
          const plano = planoMap.get(c.conta_contabil) || {}

          return {
            id: c.id,
            codigo: c.conta_contabil || '-',
            classificacao: dominio.classificacao || plano.classificacao || '-',
            nome: plano.nome || c.descricao || '-',
            saldo_anterior_dominio: Number(dominio.saldo_anterior) || 0,
            debito_dominio: Number(dominio.debito) || 0,
            credito_dominio: Number(dominio.credito) || 0,
            saldo_atual_dominio: Number(c.saldo_dominio || dominio.saldo_atual) || 0,
            saldo_atual_velit: Number(c.saldo_velit) || 0,
            diferenca: Number(c.diferenca) || 0,
            status: formatStatus(c.status),
          }
        })

        if (mergedData.length === 0) {
          setData(getMockData())
        } else {
          setData(mergedData)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setData(getMockData())
      }
      setLoading(false)
    }

    loadData()
  }, [])

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch =
        item.codigo.toLowerCase().includes(searchLower) ||
        item.nome.toLowerCase().includes(searchLower)
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [data, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'OK') {
      return (
        <Badge className="bg-teal-500 hover:bg-teal-600 text-white font-medium shadow-sm">OK</Badge>
      )
    }
    if (status === 'Divergência') {
      return (
        <Badge className="bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm">
          Divergência
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium shadow-sm text-yellow-950">
        Sem Conta
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Carregando conciliação...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Conciliação de Balancetes
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Conferência detalhada entre os saldos do Domínio e da VELIT.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por código ou nome da conta..."
                className="pl-9 bg-white dark:bg-slate-950 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-sm font-medium text-slate-500 whitespace-nowrap">
                Filtrar Status:
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-950 shadow-sm">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="Divergência">Divergência</SelectItem>
                  <SelectItem value="Sem Conta">Sem Conta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 min-w-[100px]">
                    Código
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 min-w-[130px]">
                    Classificação
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 min-w-[220px]">
                    Nome da Conta
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right min-w-[130px]">
                    Saldo Ant. (Domínio)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right min-w-[120px]">
                    Débito (Domínio)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right min-w-[120px]">
                    Crédito (Domínio)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right min-w-[140px] bg-slate-100/50 dark:bg-slate-800/30">
                    Saldo Atual (Domínio)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right min-w-[140px] bg-slate-100/50 dark:bg-slate-800/30">
                    Saldo Atual (VELIT)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right min-w-[120px]">
                    Diferença
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center min-w-[100px]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <TableRow
                      key={row.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                        {row.codigo}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400">
                        {row.classificacao}
                      </TableCell>
                      <TableCell>
                        <span
                          className="block truncate max-w-[220px] font-medium text-slate-800 dark:text-slate-200"
                          title={row.nome}
                        >
                          {row.nome}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.saldo_anterior_dominio)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.debito_dominio)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.credito_dominio)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap bg-slate-50/30 dark:bg-slate-900/20">
                        {formatCurrency(row.saldo_atual_dominio)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap bg-slate-50/30 dark:bg-slate-900/20">
                        {formatCurrency(row.saldo_atual_velit)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold whitespace-nowrap ${row.diferenca !== 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        {formatCurrency(row.diferenca)}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileX className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-medium">
                          Nenhum registro encontrado para os filtros atuais.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-4">
              <div className="text-sm text-slate-500">
                Mostrando{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                a{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {Math.min(currentPage * itemsPerPage, filteredData.length)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {filteredData.length}
                </span>{' '}
                registros
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  Próximo <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

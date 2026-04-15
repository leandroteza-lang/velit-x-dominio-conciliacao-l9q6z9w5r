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
import { cn } from '@/lib/utils'

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

export default function ConciliacaoBalancetes() {
  const [data, setData] = useState<ConciliacaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

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
          setData([])
          setLoading(false)
          return
        }

        const importId = imports[0].id

        const [{ data: dominios }, { data: velits }, { data: planoContas }] = await Promise.all([
          supabase.from('balancete_dominio').select('*').eq('importacao_id', importId),
          supabase.from('balancete_velit').select('*').eq('importacao_id', importId),
          supabase.from('plano_contas').select('*'),
        ])

        const dominiosMap = new Map(dominios?.map((d: any) => [d.codigo, d]) || [])
        const velitsMap = new Map(velits?.map((v: any) => [v.conta_contabil, v]) || [])
        const planoMap = new Map(planoContas?.map((p: any) => [p.codigo, p]) || [])

        const allCodes = new Set<string>()
        dominios?.forEach((d: any) => {
          if (d.codigo) allCodes.add(d.codigo)
        })
        velits?.forEach((v: any) => {
          if (v.conta_contabil) allCodes.add(v.conta_contabil)
        })

        const mergedData: ConciliacaoRow[] = Array.from(allCodes).map((codigo) => {
          const dominio = dominiosMap.get(codigo) || {}
          const velit = velitsMap.get(codigo) || {}
          const plano = planoMap.get(codigo) || {}

          const saldo_atual_dominio = Number(dominio.saldo_atual) || 0
          const saldo_atual_velit = Number(velit.saldo_atual) || 0
          const diferenca = saldo_atual_dominio - saldo_atual_velit

          let status = 'OK'
          if (!plano.id) {
            status = 'Sem Conta'
          } else if (Math.abs(diferenca) > 0.01) {
            status = 'Divergência'
          }

          const classificacao = plano.classificacao || dominio.classificacao || '-'
          const nome = plano.nome || velit.descricao || '-'

          return {
            id: codigo,
            codigo: codigo,
            classificacao: classificacao,
            nome: nome,
            saldo_anterior_dominio: Number(dominio.saldo_anterior) || 0,
            debito_dominio: Number(dominio.debito) || 0,
            credito_dominio: Number(dominio.credito) || 0,
            saldo_atual_dominio: saldo_atual_dominio,
            saldo_atual_velit: saldo_atual_velit,
            diferenca: diferenca,
            status: status,
          }
        })

        mergedData.sort((a, b) => {
          const cA = a.classificacao !== '-' ? a.classificacao : '999999999'
          const cB = b.classificacao !== '-' ? b.classificacao : '999999999'
          return cA.localeCompare(cB)
        })

        setData(mergedData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setData([])
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

  const getRowStyle = (classificacao: string) => {
    if (!classificacao || classificacao === '-') return ''
    const level = classificacao.split('.').length
    if (level === 1)
      return 'bg-slate-200/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 font-bold'
    if (level === 2)
      return 'bg-slate-100 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800/60 font-semibold'
    if (level === 3)
      return 'bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/40 font-medium'
    return ''
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
                      className={cn(
                        'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50',
                        getRowStyle(row.classificacao),
                      )}
                    >
                      <TableCell className="font-medium">{row.codigo}</TableCell>
                      <TableCell className="opacity-80">{row.classificacao}</TableCell>
                      <TableCell>
                        <span className="block truncate max-w-[220px]" title={row.nome}>
                          {row.nome}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap opacity-80">
                        {formatCurrency(row.saldo_anterior_dominio)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap opacity-80">
                        {formatCurrency(row.debito_dominio)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap opacity-80">
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

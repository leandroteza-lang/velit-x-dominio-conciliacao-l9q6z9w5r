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
  TableFooter,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileX,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ConciliacaoRow = {
  id: string
  codigo: string
  classificacao: string
  nome: string
  saldo_anterior_velit: number
  debito_velit: number
  credito_velit: number
  saldo_atual_velit: number
  saldo_anterior_dominio: number
  debito_dominio: number
  credito_dominio: number
  saldo_atual_dominio: number
  diferenca: number
  status: string
}

const fetchAllPlanoContas = async () => {
  let allData: any[] = []
  let from = 0
  const step = 1000
  while (true) {
    const { data, error } = await supabase
      .from('plano_contas')
      .select('codigo, classificacao, nome, id')
      .range(from, from + step - 1)

    if (error) {
      console.error('Error fetching plano_contas:', error)
      break
    }
    if (data) allData = [...allData, ...data]
    if (!data || data.length < step) break
    from += step
  }
  return allData
}

export default function ConciliacaoBalancetes() {
  const [data, setData] = useState<ConciliacaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [importacoes, setImportacoes] = useState<any[]>([])
  const [selectedImportId, setSelectedImportId] = useState<string>('')
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const { data: importsList } = await supabase
          .from('importacoes')
          .select('id, data_inicio, data_fim, created_at')
          .order('data_inicio', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })

        setImportacoes(importsList || [])
        if (importsList && importsList.length > 0) {
          if (!selectedImportId) setSelectedImportId(importsList[0].id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        setLoading(false)
      }
    }
    fetchPeriods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const loadData = async () => {
      if (!selectedImportId) return
      setLoading(true)
      try {
        const [dominiosRes, velitsRes, planoContas] = await Promise.all([
          supabase.from('balancete_dominio').select('*').eq('importacao_id', selectedImportId),
          supabase.from('balancete_velit').select('*').eq('importacao_id', selectedImportId),
          fetchAllPlanoContas(),
        ])

        const dominiosMap = new Map(
          dominiosRes.data?.map((d: any) => [String(d.codigo || '').trim(), d]) || [],
        )
        const velitsMap = new Map(
          velitsRes.data?.map((v: any) => [String(v.conta_contabil || '').trim(), v]) || [],
        )
        const planoMap = new Map(planoContas.map((p: any) => [String(p.codigo || '').trim(), p]))

        const allCodes = new Set<string>()
        dominiosRes.data?.forEach((d: any) => {
          if (d.codigo) allCodes.add(String(d.codigo).trim())
        })
        velitsRes.data?.forEach((v: any) => {
          if (v.conta_contabil) allCodes.add(String(v.conta_contabil).trim())
        })

        const mergedData: ConciliacaoRow[] = Array.from(allCodes).map((codigo) => {
          const dominio = dominiosMap.get(codigo) || {}
          const velit = velitsMap.get(codigo) || {}
          const plano = planoMap.get(codigo) || {}

          const saldo_anterior_dominio = Number(dominio.saldo_anterior) || 0
          const debito_dominio = Number(dominio.debito) || 0
          const credito_dominio = Number(dominio.credito) || 0
          const saldo_atual_dominio = Number(dominio.saldo_atual) || 0

          const saldo_anterior_velit = Number(velit.saldo_anterior) || 0
          const debito_velit = Number(velit.debito) || 0
          const credito_velit = Number(velit.credito) || 0
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
            saldo_anterior_velit,
            debito_velit,
            credito_velit,
            saldo_atual_velit,
            saldo_anterior_dominio,
            debito_dominio,
            credito_dominio,
            saldo_atual_dominio,
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
  }, [selectedImportId])

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

  const totaisAnaliticos = useMemo(() => {
    const classificacoes = new Set(data.map((d) => d.classificacao))
    const analyticalData = filteredData.filter((row) => {
      if (!row.classificacao || row.classificacao === '-') return true
      for (const c of classificacoes) {
        if (c !== row.classificacao && c.startsWith(row.classificacao + '.')) {
          return false
        }
      }
      return true
    })

    return analyticalData.reduce(
      (acc, row) => ({
        saldo_anterior_velit: acc.saldo_anterior_velit + row.saldo_anterior_velit,
        debito_velit: acc.debito_velit + row.debito_velit,
        credito_velit: acc.credito_velit + row.credito_velit,
        saldo_atual_velit: acc.saldo_atual_velit + row.saldo_atual_velit,
        saldo_anterior_dominio: acc.saldo_anterior_dominio + row.saldo_anterior_dominio,
        debito_dominio: acc.debito_dominio + row.debito_dominio,
        credito_dominio: acc.credito_dominio + row.credito_dominio,
        saldo_atual_dominio: acc.saldo_atual_dominio + row.saldo_atual_dominio,
        diferenca: acc.diferenca + row.diferenca,
      }),
      {
        saldo_anterior_velit: 0,
        debito_velit: 0,
        credito_velit: 0,
        saldo_atual_velit: 0,
        saldo_anterior_dominio: 0,
        debito_dominio: 0,
        credito_dominio: 0,
        saldo_atual_dominio: 0,
        diferenca: 0,
      },
    )
  }, [filteredData, data])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'OK') {
      return (
        <Badge className="bg-teal-500 hover:bg-teal-600 text-white font-medium shadow-sm border-0 text-[10px] py-0 px-1.5 leading-tight h-4">
          OK
        </Badge>
      )
    }
    if (status === 'Divergência') {
      return (
        <Badge className="bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm border-0 text-[10px] py-0 px-1.5 leading-tight h-4">
          Divergência
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium shadow-sm text-yellow-950 border-0 text-[10px] py-0 px-1.5 leading-tight h-4">
        Sem Conta
      </Badge>
    )
  }

  const getRowStyle = (classificacao: string) => {
    if (!classificacao || classificacao === '-')
      return 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300'
    const level = classificacao.split('.').length
    if (level === 1)
      return 'bg-indigo-700 text-white hover:bg-indigo-800 border-b-indigo-800 dark:bg-indigo-900 dark:hover:bg-indigo-800/80 font-bold'
    if (level === 2)
      return 'bg-indigo-600 text-white hover:bg-indigo-700 border-b-indigo-700 dark:bg-indigo-800 dark:hover:bg-indigo-700/80 font-bold'
    if (level === 3)
      return 'bg-blue-500 text-white hover:bg-blue-600 border-b-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600/80 font-semibold'
    if (level === 4)
      return 'bg-blue-200 text-blue-950 hover:bg-blue-300 border-b-blue-300 dark:bg-blue-900/60 dark:text-blue-100 dark:border-b-blue-800 dark:hover:bg-blue-800/50 font-medium'
    return 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
  }

  const isDarkRow = (classificacao: string) => {
    if (!classificacao || classificacao === '-') return false
    return classificacao.split('.').length <= 3
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Carregando conciliação...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full px-2 sm:px-4 py-6 space-y-4 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Conciliação de Balancetes
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Conferência detalhada entre os saldos da VELIT e do Domínio.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center flex-wrap">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por código ou nome da conta..."
                className="pl-9 bg-white dark:bg-slate-950 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">
                  Período:
                </span>
                <Select value={selectedImportId} onValueChange={setSelectedImportId}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-white dark:bg-slate-950 shadow-sm">
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent>
                    {importacoes.map((imp) => {
                      let label = ''
                      if (imp.data_inicio && imp.data_fim) {
                        const start = new Date(imp.data_inicio)
                        const end = new Date(imp.data_fim)

                        const startStr = start.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                        const endStr = end.toLocaleDateString('pt-BR', { timeZone: 'UTC' })

                        const diffMonths =
                          (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
                          (end.getUTCMonth() - start.getUTCMonth()) +
                          1

                        let suffix = ''
                        if (diffMonths === 1) suffix = ' (Mensal)'
                        else if (diffMonths === 2) suffix = ' (Bimestral)'
                        else if (diffMonths === 3) suffix = ' (Trimestral)'
                        else if (diffMonths === 6) suffix = ' (Semestral)'
                        else if (diffMonths === 12) suffix = ' (Anual)'

                        label = `${startStr} a ${endStr}${suffix}`
                      } else {
                        label = `Importação de ${new Date(imp.created_at).toLocaleDateString(
                          'pt-BR',
                        )}`
                      }
                      return (
                        <SelectItem key={imp.id} value={imp.id}>
                          {label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-none">
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="w-full text-[10px] leading-tight table-auto">
              <TableHeader>
                <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                  <TableHead
                    colSpan={3}
                    className="py-1 px-1 h-auto text-center font-bold border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                  >
                    Identificação da Conta
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="py-1 px-1 h-auto text-center font-bold bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-r border-indigo-200 dark:border-indigo-900/50"
                  >
                    VELIT
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="py-1 px-1 h-auto text-center font-bold bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-r border-emerald-200 dark:border-emerald-900/50"
                  >
                    DOMÍNIO
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="py-1 px-1 h-auto text-center font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                  >
                    Análise
                  </TableHead>
                </TableRow>
                <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                  <TableHead className="py-1 px-1 h-auto font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Código
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Classificação
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 max-w-[200px]">
                    Nome da Conta
                  </TableHead>

                  <TableHead className="py-1 px-1 h-auto font-semibold text-indigo-700 dark:text-indigo-300 text-right whitespace-nowrap bg-indigo-50/30 dark:bg-indigo-950/10">
                    Saldo Ant.
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-indigo-700 dark:text-indigo-300 text-right whitespace-nowrap bg-indigo-50/30 dark:bg-indigo-950/10">
                    Débito
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-indigo-700 dark:text-indigo-300 text-right whitespace-nowrap bg-indigo-50/30 dark:bg-indigo-950/10">
                    Crédito
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-indigo-900 dark:text-indigo-200 text-right whitespace-nowrap border-r border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20">
                    Saldo Atual
                  </TableHead>

                  <TableHead className="py-1 px-1 h-auto font-semibold text-emerald-700 dark:text-emerald-300 text-right whitespace-nowrap bg-emerald-50/30 dark:bg-emerald-950/10">
                    Saldo Ant.
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-emerald-700 dark:text-emerald-300 text-right whitespace-nowrap bg-emerald-50/30 dark:bg-emerald-950/10">
                    Débito
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-emerald-700 dark:text-emerald-300 text-right whitespace-nowrap bg-emerald-50/30 dark:bg-emerald-950/10">
                    Crédito
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-emerald-900 dark:text-emerald-200 text-right whitespace-nowrap border-r border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                    Saldo Atual
                  </TableHead>

                  <TableHead className="py-1 px-1 h-auto font-semibold text-slate-700 dark:text-slate-300 text-right whitespace-nowrap">
                    Diferença
                  </TableHead>
                  <TableHead className="py-1 px-1 h-auto font-semibold text-slate-700 dark:text-slate-300 text-center whitespace-nowrap">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn('transition-colors', getRowStyle(row.classificacao))}
                    >
                      <TableCell className="py-0.5 px-1 h-auto font-medium whitespace-nowrap">
                        {row.codigo}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto opacity-90 whitespace-nowrap">
                        {row.classificacao}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto border-r border-slate-200/50 dark:border-slate-800/50">
                        <span
                          className="block truncate max-w-[120px] sm:max-w-[180px]"
                          title={row.nome}
                        >
                          {row.nome}
                        </span>
                      </TableCell>

                      <TableCell className="py-0.5 px-1 h-auto text-right whitespace-nowrap opacity-90 bg-indigo-500/5">
                        {formatCurrency(row.saldo_anterior_velit)}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto text-right whitespace-nowrap opacity-90 bg-indigo-500/5">
                        {formatCurrency(row.debito_velit)}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto text-right whitespace-nowrap opacity-90 bg-indigo-500/5">
                        {formatCurrency(row.credito_velit)}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto text-right font-medium whitespace-nowrap border-r border-indigo-500/20 bg-indigo-500/10">
                        {formatCurrency(row.saldo_atual_velit)}
                      </TableCell>

                      <TableCell className="py-0.5 px-1 h-auto text-right whitespace-nowrap opacity-90 bg-emerald-500/5">
                        {formatCurrency(row.saldo_anterior_dominio)}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto text-right whitespace-nowrap opacity-90 bg-emerald-500/5">
                        {formatCurrency(row.debito_dominio)}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto text-right whitespace-nowrap opacity-90 bg-emerald-500/5">
                        {formatCurrency(row.credito_dominio)}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto text-right font-medium whitespace-nowrap border-r border-emerald-500/20 bg-emerald-500/10">
                        {formatCurrency(row.saldo_atual_dominio)}
                      </TableCell>

                      <TableCell
                        className={cn(
                          'py-0.5 px-1 h-auto text-right font-bold whitespace-nowrap',
                          row.diferenca !== 0
                            ? isDarkRow(row.classificacao)
                              ? 'text-red-300'
                              : 'text-red-600 dark:text-red-400'
                            : '',
                        )}
                      >
                        {formatCurrency(row.diferenca)}
                      </TableCell>
                      <TableCell className="py-0.5 px-1 h-auto text-center whitespace-nowrap">
                        {getStatusBadge(row.status)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={14} className="h-32 text-center">
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
              {paginatedData.length > 0 && (
                <TableFooter className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={3}
                      className="text-right py-2 px-2 text-slate-700 dark:text-slate-300"
                    >
                      Totais (Contas Analíticas):
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20">
                      {formatCurrency(totaisAnaliticos.saldo_anterior_velit)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20">
                      {formatCurrency(totaisAnaliticos.debito_velit)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20">
                      {formatCurrency(totaisAnaliticos.credito_velit)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-indigo-900 dark:text-indigo-200 bg-indigo-100/50 dark:bg-indigo-900/30">
                      {formatCurrency(totaisAnaliticos.saldo_atual_velit)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
                      {formatCurrency(totaisAnaliticos.saldo_anterior_dominio)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
                      {formatCurrency(totaisAnaliticos.debito_dominio)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
                      {formatCurrency(totaisAnaliticos.credito_dominio)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-1 text-emerald-900 dark:text-emerald-200 bg-emerald-100/50 dark:bg-emerald-900/30">
                      {formatCurrency(totaisAnaliticos.saldo_atual_dominio)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right py-2 px-1',
                        totaisAnaliticos.diferenca !== 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-700 dark:text-slate-300',
                      )}
                    >
                      {formatCurrency(totaisAnaliticos.diferenca)}
                    </TableCell>
                    <TableCell className="py-2 px-1"></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {filteredData.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-slate-500">
                <div>
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
                <div className="flex items-center gap-2">
                  <span>Registros por página:</span>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(val) => {
                      setItemsPerPage(Number(val))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-8 text-xs bg-white dark:bg-slate-950 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shadow-sm"
                  title="Primeira Página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4 sm:mr-1" />{' '}
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shadow-sm"
                >
                  <span className="hidden sm:inline">Próximo</span>{' '}
                  <ChevronRight className="w-4 h-4 sm:ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 p-0 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shadow-sm"
                  title="Última Página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
  dif_saldo_anterior: number
  dif_debito: number
  dif_credito: number
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
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
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

          const temDominio = !!dominio.codigo
          const temVelit = !!velit.conta_contabil

          const saldo_anterior_dominio = Number(dominio.saldo_anterior) || 0
          const debito_dominio = Number(dominio.debito) || 0
          const credito_dominio = Number(dominio.credito) || 0
          const saldo_atual_dominio = Number(dominio.saldo_atual) || 0

          const saldo_anterior_velit = Number(velit.saldo_anterior) || 0
          const debito_velit = Number(velit.debito) || 0
          const credito_velit = Number(velit.credito) || 0
          const saldo_atual_velit = Number(velit.saldo_atual) || 0

          const dif_saldo_anterior = saldo_anterior_velit - saldo_anterior_dominio
          const dif_debito = debito_velit - debito_dominio
          const dif_credito = credito_velit - credito_dominio
          const diferenca = saldo_atual_velit - saldo_atual_dominio

          let status = 'OK'
          if (!temDominio && temVelit) {
            status = 'Faltando no Domínio'
          } else if (temDominio && !temVelit) {
            status = 'Faltando no Velit'
          } else if (
            Math.abs(diferenca) > 0.01 ||
            Math.abs(dif_saldo_anterior) > 0.01 ||
            Math.abs(dif_debito) > 0.01 ||
            Math.abs(dif_credito) > 0.01
          ) {
            status = 'Divergência'
          } else if (!plano.id) {
            status = 'Sem Conta'
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
            dif_saldo_anterior,
            dif_debito,
            dif_credito,
            diferenca,
            status,
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
        dif_saldo_anterior: acc.dif_saldo_anterior + row.dif_saldo_anterior,
        dif_debito: acc.dif_debito + row.dif_debito,
        dif_credito: acc.dif_credito + row.dif_credito,
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
        dif_saldo_anterior: 0,
        dif_debito: 0,
        dif_credito: 0,
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
    if (status === 'Faltando no Velit' || status === 'Faltando no Domínio') {
      return (
        <Badge className="bg-rose-700 hover:bg-rose-800 text-white font-medium shadow-sm border-0 text-[10px] py-0 px-1.5 leading-tight h-4">
          {status}
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium shadow-sm text-yellow-950 border-0 text-[10px] py-0 px-1.5 leading-tight h-4">
        Sem Conta
      </Badge>
    )
  }

  const getRowBaseBg = (classificacao: string, status: string, isSelected: boolean) => {
    let bg = ''

    if (
      status === 'Divergência' ||
      status === 'Faltando no Velit' ||
      status === 'Faltando no Domínio'
    ) {
      bg =
        'text-white border-b border-red-950 font-semibold ' +
        (isSelected
          ? 'bg-red-700 dark:bg-red-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
          : 'bg-red-900/90 dark:bg-red-950/80 group-hover:bg-red-800 dark:group-hover:bg-red-900')
      return bg
    }

    if (!classificacao || classificacao === '-') {
      bg =
        'text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 ' +
        (isSelected
          ? 'bg-slate-100 dark:bg-slate-800 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
          : 'bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/70')
      return bg
    }

    const level = classificacao.split('.').length
    if (level === 1) {
      bg =
        'text-white border-b border-indigo-800 dark:border-indigo-700 font-bold ' +
        (isSelected
          ? 'bg-indigo-500 dark:bg-indigo-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
          : 'bg-indigo-700 dark:bg-indigo-900 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-800')
    } else if (level === 2) {
      bg =
        'text-white border-b border-indigo-700 dark:border-indigo-600 font-bold ' +
        (isSelected
          ? 'bg-indigo-400 dark:bg-indigo-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
          : 'bg-indigo-600 dark:bg-indigo-800 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-700')
    } else if (level === 3) {
      bg =
        'text-white border-b border-blue-600 dark:border-blue-500 font-semibold ' +
        (isSelected
          ? 'bg-blue-400 dark:bg-blue-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
          : 'bg-blue-500 dark:bg-blue-700 group-hover:bg-blue-400 dark:group-hover:bg-blue-600')
    } else if (level === 4) {
      bg =
        'border-b border-blue-100 dark:border-blue-800 font-medium ' +
        (isSelected
          ? 'bg-blue-100 text-blue-950 dark:bg-blue-900 dark:text-blue-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
          : 'bg-blue-50 text-blue-950 dark:bg-blue-900/30 dark:text-blue-100 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60')
    } else {
      bg =
        'text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 ' +
        (isSelected
          ? 'bg-slate-100 dark:bg-slate-800 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
          : 'bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/70')
    }

    return bg
  }

  const getDiffCellClass = (
    val: number,
    classificacao: string,
    extraClasses: string,
    isSelected: boolean,
  ) => {
    const isError = Math.abs(val) > 0.01

    let fontWeight = ''
    if (!classificacao || classificacao === '-') {
      fontWeight = 'font-normal'
    } else {
      const level = classificacao.split('.').length
      if (level === 1) fontWeight = 'font-bold'
      else if (level === 2) fontWeight = 'font-bold'
      else if (level === 3) fontWeight = 'font-semibold'
      else if (level === 4) fontWeight = 'font-medium'
    }

    let bgColor = ''
    let borderColor = ''
    if (isError) {
      bgColor = isSelected
        ? 'bg-red-700 dark:bg-red-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
        : 'bg-red-900/90 dark:bg-red-950/90 group-hover:bg-red-800 dark:group-hover:bg-red-900'
      borderColor = 'border-b border-red-950/50 dark:border-red-900/50'
    } else {
      bgColor = isSelected
        ? 'bg-blue-800 dark:bg-blue-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
        : 'bg-blue-900/90 dark:bg-blue-950/90 group-hover:bg-blue-800 dark:group-hover:bg-blue-900'
      borderColor = 'border-b border-blue-950/50 dark:border-blue-900/50'
    }

    return cn(extraClasses, bgColor, 'text-white', fontWeight, borderColor)
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

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
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
                    <SelectItem value="Faltando no Velit">Faltando no Velit</SelectItem>
                    <SelectItem value="Faltando no Domínio">Faltando no Domínio</SelectItem>
                    <SelectItem value="Sem Conta">Sem Conta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-transparent">
          <Table
            wrapperClassName="max-h-[calc(100vh-280px)]"
            className="w-full text-[10px] leading-tight border-separate border-spacing-0 [&_tr]:border-none"
          >
            <TableHeader className="sticky top-0 z-30">
              <TableRow className="bg-transparent hover:bg-transparent border-none">
                <TableHead
                  colSpan={3}
                  className="py-2 px-2 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 rounded-t-xl border-t border-x border-slate-200 dark:border-slate-700"
                >
                  Identificação da Conta
                </TableHead>
                <TableHead className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />
                <TableHead
                  colSpan={4}
                  className="py-2 px-2 text-center font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-t-xl border-t border-x border-indigo-200 dark:border-indigo-800/50"
                >
                  VELIT
                </TableHead>
                <TableHead className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />
                <TableHead
                  colSpan={4}
                  className="py-2 px-2 text-center font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 rounded-t-xl border-t border-x border-emerald-200 dark:border-emerald-800/50"
                >
                  DOMÍNIO
                </TableHead>
                <TableHead className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />
                <TableHead
                  colSpan={5}
                  className="py-2 px-2 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 rounded-t-xl border-t border-x border-slate-200 dark:border-slate-700"
                >
                  Análise de Diferenças (VELIT - DOMÍNIO)
                </TableHead>
              </TableRow>

              <TableRow className="bg-transparent hover:bg-transparent border-none">
                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-l border-b border-slate-200 dark:border-slate-700">
                  Código
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  Classificação
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700">
                  Nome da Conta
                </TableHead>

                <TableHead className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />

                <TableHead className="py-1.5 px-2 font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 border-l border-b border-indigo-200 dark:border-indigo-800/50 text-right">
                  Saldo Ant.
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-800/50 text-right">
                  Débito
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-800/50 text-right">
                  Crédito
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-indigo-900 dark:text-indigo-200 bg-indigo-100/80 dark:bg-indigo-900/40 border-r border-b border-indigo-200 dark:border-indigo-800/50 text-right">
                  Saldo Atual
                </TableHead>

                <TableHead className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />

                <TableHead className="py-1.5 px-2 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 border-l border-b border-emerald-200 dark:border-emerald-800/50 text-right">
                  Saldo Ant.
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/50 text-right">
                  Débito
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/50 text-right">
                  Crédito
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-900/40 border-r border-b border-emerald-200 dark:border-emerald-800/50 text-right">
                  Saldo Atual
                </TableHead>

                <TableHead className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />

                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-l border-b border-slate-200 dark:border-slate-700 text-right">
                  Dif. S. Ant.
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-right">
                  Dif. Déb.
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-right">
                  Dif. Créd.
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-right">
                  Dif. Atual
                </TableHead>
                <TableHead className="py-1.5 px-2 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => {
                  const isSelected = row.id === selectedRowId
                  const baseBg = getRowBaseBg(row.classificacao, row.status, isSelected)
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelectedRowId(isSelected ? null : row.id)}
                      className={cn(
                        'group cursor-pointer border-none bg-transparent hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent transition-all duration-200',
                        isSelected
                          ? 'relative z-10 shadow-[0_0_15px_rgba(0,0,0,0.15)] dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] ring-1 ring-amber-500/50'
                          : '',
                      )}
                    >
                      <TableCell
                        className={cn(
                          'py-1 h-auto font-medium whitespace-nowrap transition-colors',
                          baseBg,
                          isSelected
                            ? 'border-l-4 border-l-amber-500 pl-1 pr-2'
                            : 'border-l border-l-transparent px-2',
                        )}
                      >
                        {row.codigo}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto opacity-90 whitespace-nowrap transition-colors',
                          baseBg,
                        )}
                      >
                        {row.classificacao}
                      </TableCell>
                      <TableCell
                        className={cn('py-1 px-2 h-auto border-r transition-colors', baseBg)}
                      >
                        <span
                          className="block truncate max-w-[120px] sm:max-w-[180px]"
                          title={row.nome}
                        >
                          {row.nome}
                        </span>
                      </TableCell>

                      <TableCell className="w-3 min-w-[12px] max-w-[12px] p-0 bg-transparent border-none shadow-none" />

                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right whitespace-nowrap opacity-90 border-l transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.saldo_anterior_velit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right whitespace-nowrap opacity-90 transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.debito_velit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right whitespace-nowrap opacity-90 transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.credito_velit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right font-medium whitespace-nowrap border-r transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.saldo_atual_velit)}
                      </TableCell>

                      <TableCell className="w-3 min-w-[12px] max-w-[12px] p-0 bg-transparent border-none shadow-none" />

                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right whitespace-nowrap opacity-90 border-l transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.saldo_anterior_dominio)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right whitespace-nowrap opacity-90 transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.debito_dominio)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right whitespace-nowrap opacity-90 transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.credito_dominio)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-right font-medium whitespace-nowrap border-r transition-colors',
                          baseBg,
                        )}
                      >
                        {formatCurrency(row.saldo_atual_dominio)}
                      </TableCell>

                      <TableCell className="w-3 min-w-[12px] max-w-[12px] p-0 bg-transparent border-none shadow-none" />

                      <TableCell
                        className={getDiffCellClass(
                          row.dif_saldo_anterior,
                          row.classificacao,
                          'py-1 px-2 h-auto text-right whitespace-nowrap border-l transition-colors',
                          isSelected,
                        )}
                      >
                        {formatCurrency(row.dif_saldo_anterior)}
                      </TableCell>
                      <TableCell
                        className={getDiffCellClass(
                          row.dif_debito,
                          row.classificacao,
                          'py-1 px-2 h-auto text-right whitespace-nowrap transition-colors',
                          isSelected,
                        )}
                      >
                        {formatCurrency(row.dif_debito)}
                      </TableCell>
                      <TableCell
                        className={getDiffCellClass(
                          row.dif_credito,
                          row.classificacao,
                          'py-1 px-2 h-auto text-right whitespace-nowrap transition-colors',
                          isSelected,
                        )}
                      >
                        {formatCurrency(row.dif_credito)}
                      </TableCell>
                      <TableCell
                        className={getDiffCellClass(
                          row.diferenca,
                          row.classificacao,
                          'py-1 px-2 h-auto text-right whitespace-nowrap transition-colors',
                          isSelected,
                        )}
                      >
                        {formatCurrency(row.diferenca)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 px-2 h-auto text-center whitespace-nowrap border-r transition-colors',
                          baseBg,
                        )}
                      >
                        {getStatusBadge(row.status)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow className="border-none bg-transparent hover:bg-transparent">
                  <TableCell
                    colSpan={19}
                    className="h-32 text-center rounded-b-xl border-x border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  >
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
              <TableFooter className="sticky bottom-0 z-20 bg-transparent border-none">
                <TableRow className="border-none hover:bg-transparent bg-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <TableCell
                    colSpan={3}
                    className="text-right py-3 px-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 rounded-b-xl border-b border-x border-slate-300 dark:border-slate-700"
                  >
                    Totais (Contas Analíticas):
                  </TableCell>

                  <TableCell className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />

                  <TableCell className="text-right py-3 px-2 font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-bl-xl border-b border-l border-indigo-300 dark:border-indigo-800/50">
                    {formatCurrency(totaisAnaliticos.saldo_anterior_velit)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-2 font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 border-b border-indigo-300 dark:border-indigo-800/50">
                    {formatCurrency(totaisAnaliticos.debito_velit)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-2 font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 border-b border-indigo-300 dark:border-indigo-800/50">
                    {formatCurrency(totaisAnaliticos.credito_velit)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-2 font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-900/50 rounded-br-xl border-b border-r border-indigo-300 dark:border-indigo-800/50">
                    {formatCurrency(totaisAnaliticos.saldo_atual_velit)}
                  </TableCell>

                  <TableCell className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />

                  <TableCell className="text-right py-3 px-2 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 rounded-bl-xl border-b border-l border-emerald-300 dark:border-emerald-800/50">
                    {formatCurrency(totaisAnaliticos.saldo_anterior_dominio)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-2 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 border-b border-emerald-300 dark:border-emerald-800/50">
                    {formatCurrency(totaisAnaliticos.debito_dominio)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-2 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 border-b border-emerald-300 dark:border-emerald-800/50">
                    {formatCurrency(totaisAnaliticos.credito_dominio)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-2 font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/50 rounded-br-xl border-b border-r border-emerald-300 dark:border-emerald-800/50">
                    {formatCurrency(totaisAnaliticos.saldo_atual_dominio)}
                  </TableCell>

                  <TableCell className="w-3 min-w-[12px] max-w-[12px] p-0 border-none shadow-none bg-white dark:bg-slate-950" />

                  <TableCell
                    className={cn(
                      'text-right py-3 px-2 font-bold rounded-bl-xl border-b border-l border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80',
                      totaisAnaliticos.dif_saldo_anterior !== 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {formatCurrency(totaisAnaliticos.dif_saldo_anterior)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right py-3 px-2 font-bold border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80',
                      totaisAnaliticos.dif_debito !== 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {formatCurrency(totaisAnaliticos.dif_debito)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right py-3 px-2 font-bold border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80',
                      totaisAnaliticos.dif_credito !== 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {formatCurrency(totaisAnaliticos.dif_credito)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right py-3 px-2 font-bold border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80',
                      totaisAnaliticos.diferenca !== 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {formatCurrency(totaisAnaliticos.diferenca)}
                  </TableCell>
                  <TableCell className="py-3 px-2 rounded-br-xl border-b border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80"></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>

          {filteredData.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-4 mt-4">
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

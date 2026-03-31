import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, Search, Loader2, BarChart2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

type ResumoRow = {
  conta: string
  nome: string
  debito: number
  credito: number
  saldo: number
}

const mockData: ResumoRow[] = [
  { conta: '1.1.01.01', nome: 'Caixa Geral', debito: 15000, credito: 5000, saldo: 10000 },
  {
    conta: '1.1.02.01',
    nome: 'Bancos Conta Movimento',
    debito: 50000,
    credito: 20000,
    saldo: 30000,
  },
  {
    conta: '2.1.01.01',
    nome: 'Fornecedores Nacionais',
    debito: 10000,
    credito: 25000,
    saldo: -15000,
  },
  {
    conta: '3.1.01.01',
    nome: 'Receitas de Prestação de Serviços',
    debito: 0,
    credito: 100000,
    saldo: -100000,
  },
  {
    conta: '4.1.01.01',
    nome: 'Despesas com Salários e Ordenados',
    debito: 30000,
    credito: 0,
    saldo: 30000,
  },
  {
    conta: '4.1.02.01',
    nome: 'Despesas com Encargos Sociais',
    debito: 12000,
    credito: 0,
    saldo: 12000,
  },
]

const chartConfig = {
  debito: {
    label: 'Total Débito',
    color: 'hsl(var(--chart-1))',
  },
  credito: {
    label: 'Total Crédito',
    color: 'hsl(var(--chart-2))',
  },
}

export default function ResumoLancamentos() {
  const [data, setData] = useState<ResumoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchConta, setSearchConta] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: importacoes } = await supabase
          .from('importacoes')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)

        if (!importacoes || importacoes.length === 0) {
          setData(mockData)
          setLoading(false)
          return
        }

        const importacaoId = importacoes[0].id

        const [lancamentosRes, contasRes] = await Promise.all([
          supabase.from('lancamentos_gerados').select('*').eq('importacao_id', importacaoId),
          supabase.from('plano_contas').select('*').eq('importacao_id', importacaoId),
        ])

        const lancamentos = lancamentosRes.data || []
        const contas = contasRes.data || []

        if (lancamentos.length === 0) {
          setData(mockData)
          setLoading(false)
          return
        }

        const contasMap = new Map<string, string>()
        contas.forEach((c) => {
          if (c.codigo) contasMap.set(c.codigo, c.nome || '')
        })

        const resumoMap = new Map<string, ResumoRow>()

        const getRow = (conta: string) => {
          if (!resumoMap.has(conta)) {
            resumoMap.set(conta, {
              conta,
              nome: contasMap.get(conta) || 'Conta não encontrada',
              debito: 0,
              credito: 0,
              saldo: 0,
            })
          }
          return resumoMap.get(conta)!
        }

        lancamentos.forEach((l) => {
          const val = Number(l.valor) || 0
          if (l.conta_debito) {
            const row = getRow(l.conta_debito)
            row.debito += val
          }
          if (l.conta_credito) {
            const row = getRow(l.conta_credito)
            row.credito += val
          }
        })

        const result = Array.from(resumoMap.values()).map((row) => ({
          ...row,
          saldo: row.debito - row.credito,
        }))

        // Sort by conta
        result.sort((a, b) => a.conta.localeCompare(b.conta))

        setData(result)
      } catch (error) {
        console.error(error)
        setData(mockData)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredData = useMemo(() => {
    if (!searchConta) return data
    const query = searchConta.toLowerCase()
    return data.filter(
      (d) => d.conta.toLowerCase().includes(query) || d.nome.toLowerCase().includes(query),
    )
  }, [data, searchConta])

  const exportToCsv = () => {
    const headers = ['Conta', 'Nome', 'Total Débito', 'Total Crédito', 'Saldo']
    const csvContent = [
      headers.join(';'),
      ...filteredData.map((row) =>
        [
          row.conta,
          row.nome,
          row.debito.toFixed(2),
          row.credito.toFixed(2),
          row.saldo.toFixed(2),
        ].join(';'),
      ),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'resumo_lancamentos.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumo de Lançamentos</h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada de débitos e créditos por conta contábil.
          </p>
        </div>
        <Button onClick={exportToCsv} className="gap-2">
          <Download className="h-4 w-4" /> Exportar Resumo
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5 text-primary" />
            Débito vs Crédito por Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[350px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Sem dados para exibir no gráfico.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart data={filteredData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="conta" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `R$ ${val}`} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="debito"
                  fill="var(--color-debito)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Bar
                  dataKey="credito"
                  fill="var(--color-credito)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle className="text-lg">Detalhamento por Conta</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por conta ou nome..."
              className="pl-8"
              value={searchConta}
              onChange={(e) => setSearchConta(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="font-semibold">Conta</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="text-right font-semibold">Total Débito</TableHead>
                    <TableHead className="text-right font-semibold">Total Crédito</TableHead>
                    <TableHead className="text-right font-semibold">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Nenhuma conta encontrada para o filtro atual.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium whitespace-nowrap">{row.conta}</TableCell>
                        <TableCell className="min-w-[200px]">{row.nome}</TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatCurrency(row.debito)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatCurrency(row.credito)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium whitespace-nowrap ${row.saldo > 0 ? 'text-emerald-600 dark:text-emerald-500' : row.saldo < 0 ? 'text-rose-600 dark:text-rose-500' : ''}`}
                        >
                          {formatCurrency(row.saldo)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

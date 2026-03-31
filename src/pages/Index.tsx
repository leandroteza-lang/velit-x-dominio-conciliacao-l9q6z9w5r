import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileUp, CheckCircle2, FileText, Activity, Clock } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'

export default function Dashboard() {
  const [stats, setStats] = useState({
    imports: 0,
    conciliations: 0,
    entries: 0,
  })
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [recentOps, setRecentOps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)

        const [{ count: imports }, { count: conciliations }, { count: entries }] =
          await Promise.all([
            supabase.from('importacoes').select('*', { count: 'exact', head: true }),
            supabase.from('conciliacao_balancetes').select('*', { count: 'exact', head: true }),
            supabase.from('lancamentos_dominio').select('*', { count: 'exact', head: true }),
          ])

        setStats({
          imports: imports || 0,
          conciliations: conciliations || 0,
          entries: entries || 0,
        })

        const { data: recent } = await supabase
          .from('importacoes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)

        if (recent) setRecentOps(recent)

        const sevenDaysAgo = subDays(new Date(), 7).toISOString()
        const { data: allImports } = await supabase
          .from('importacoes')
          .select('created_at')
          .gte('created_at', sevenDaysAgo)

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = subDays(new Date(), 6 - i)
          return {
            date: format(d, 'dd/MM'),
            dateStr: format(d, 'yyyy-MM-dd'),
            quantidade: 0,
          }
        })

        if (allImports) {
          allImports.forEach((imp) => {
            const dateStr = format(new Date(imp.created_at), 'yyyy-MM-dd')
            const day = last7Days.find((d) => d.dateStr === dateStr)
            if (day) day.quantidade++
          })
        }

        setTimelineData(last7Days)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0f172a] p-8 rounded-2xl text-white shadow-lg relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Painel de Conciliação
          </h1>
          <p className="text-slate-300 max-w-2xl text-sm md:text-base">
            Acompanhe o volume de importações, conciliações e a saúde geral do sistema contábil em
            tempo real. Padrão Domínio x VELIT.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10">
          <Button
            asChild
            variant="outline"
            className="bg-transparent text-white border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <Link to="/history">
              <Clock className="mr-2 h-4 w-4" /> Ver Histórico
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md">
            <Link to="/import">
              <FileUp className="mr-2 h-4 w-4" /> Iniciar Importação
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-600 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total de Importações
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
              <FileUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-16 bg-slate-100 animate-pulse rounded"></div>
            ) : (
              <div className="text-3xl font-bold text-slate-900">{stats.imports}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">Arquivos processados na plataforma</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total de Conciliações
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-16 bg-slate-100 animate-pulse rounded"></div>
            ) : (
              <div className="text-3xl font-bold text-slate-900">{stats.conciliations}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">Contas analisadas com sucesso</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Lançamentos Gerados
            </CardTitle>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-16 bg-slate-100 animate-pulse rounded"></div>
            ) : (
              <div className="text-3xl font-bold text-slate-900">{stats.entries}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">Registros prontos para exportação</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Status do Sistema</CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-2xl font-bold text-slate-900">Operacional</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Todos os serviços online e ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-800 font-semibold">Volume de Importações</CardTitle>
            <CardDescription>Quantidade de processos realizados nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400">
                Carregando gráfico...
              </div>
            ) : (
              <ChartContainer
                config={{ quantidade: { label: 'Importações', color: 'hsl(var(--primary))' } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                    />
                    <Bar
                      dataKey="quantidade"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-slate-800 font-semibold">Últimas Operações</CardTitle>
            <CardDescription>Linha do tempo das importações</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            <div className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-slate-200 mt-2 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-50 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentOps.length === 0 ? (
                <div className="text-sm text-center text-slate-500 py-8">
                  Nenhuma operação recente registrada.
                </div>
              ) : (
                recentOps.map((op) => (
                  <div
                    key={op.id}
                    className="relative pl-6 pb-6 border-l border-slate-200 last:border-0 last:pb-0"
                  >
                    <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-sm font-semibold text-slate-800">Nova Importação</span>
                      <time className="text-xs text-slate-500 font-medium whitespace-nowrap ml-2">
                        {format(new Date(op.created_at), 'dd/MM HH:mm')}
                      </time>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {op.id.substring(0, 8)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          op.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : op.status === 'ERROR'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {op.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          {recentOps.length > 0 && (
            <div className="p-4 border-t border-slate-100 mt-auto">
              <Button
                asChild
                variant="ghost"
                className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              >
                <Link to="/history">
                  Ver todo o histórico <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

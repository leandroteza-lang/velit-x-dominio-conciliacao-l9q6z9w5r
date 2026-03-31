import { ReconciliationSummary } from '@/types/reconciliation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, Database, FileText } from 'lucide-react'

interface SummaryCardsProps {
  summary: ReconciliationSummary
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Total Registros Velit
          </CardTitle>
          <Database className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalVelit}</div>
          <p className="text-xs text-slate-500 mt-1">Lidos do arquivo fonte</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Total Registros Domínio
          </CardTitle>
          <FileText className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalDominio}</div>
          <p className="text-xs text-slate-500 mt-1">Lidos do arquivo fonte</p>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Conciliados (Match)
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {summary.matches}
          </div>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Valores idênticos
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Divergências
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {summary.discrepancies}
          </div>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">Requerem atenção</p>
        </CardContent>
      </Card>
    </div>
  )
}

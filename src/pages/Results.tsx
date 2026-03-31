import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReconciliationStore } from '@/stores/useReconciliationStore'
import { SummaryCards } from '@/components/reconciliation/SummaryCards'
import { ResultsTable } from '@/components/reconciliation/ResultsTable'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'

export default function Results() {
  const navigate = useNavigate()
  const { hasData, results, summary, reset } = useReconciliationStore()

  useEffect(() => {
    // Redirect if accessed directly without data
    if (!hasData) {
      navigate('/')
    }
  }, [hasData, navigate])

  if (!hasData || !summary) return null

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-fade-in flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Relatório de Conciliação
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Resumo da comparação entre Velit e Domínio. Clique nas divergências para ver detalhes.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              reset()
              navigate('/')
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nova Conciliação
          </Button>
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Download className="mr-2 h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      <SummaryCards summary={summary} />

      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Detalhamento de Registros
        </h2>
        <ResultsTable data={results} />
      </div>
    </div>
  )
}

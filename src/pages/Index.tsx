import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, FileSpreadsheet, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useReconciliationStore } from '@/stores/useReconciliationStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  title: string
  description: string
  isUploaded: boolean
  onUpload: () => void
  iconColor: string
}

const UploadZone = ({ title, description, isUploaded, onUpload, iconColor }: UploadZoneProps) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 border-2 border-dashed',
        isUploaded
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-900',
        'cursor-pointer',
      )}
      onClick={onUpload}
    >
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          {isUploaded ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-in zoom-in duration-300" />
          ) : (
            <UploadCloud className={cn('h-8 w-8', iconColor)} />
          )}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center pb-6">
        {isUploaded ? (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Arquivo carregado com sucesso
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="h-4 w-4" /> CSV, XLS ou XLSX
            </span>
            <span>Clique para selecionar ou arraste o arquivo</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Index() {
  const navigate = useNavigate()
  const { processData, isProcessing, hasData, reset } = useReconciliationStore()
  const [velitUploaded, setVelitUploaded] = useState(false)
  const [dominioUploaded, setDominioUploaded] = useState(false)

  // Reset store when landing on the upload page
  useEffect(() => {
    reset()
  }, [reset])

  const handleSimulateUpload = (system: 'velit' | 'dominio') => {
    if (system === 'velit') {
      setVelitUploaded(true)
      toast.success('Arquivo do Velit importado com sucesso!')
    } else {
      setDominioUploaded(true)
      toast.success('Arquivo do Domínio importado com sucesso!')
    }
  }

  const handleStartProcess = async () => {
    if (!velitUploaded || !dominioUploaded) {
      toast.error('Por favor, faça o upload de ambos os arquivos antes de continuar.')
      return
    }

    await processData()
    navigate('/results')
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl flex-1 flex flex-col justify-center">
      <div className="text-center mb-12 animate-fade-in-up">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl mb-4">
          Conciliação de Dados
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Faça o upload dos relatórios extraídos do Velit e do Domínio Sistemas para identificar
          divergências automaticamente.
        </p>
      </div>

      <div
        className="grid md:grid-cols-2 gap-8 mb-12 animate-fade-in-up"
        style={{ animationDelay: '100ms' }}
      >
        <UploadZone
          title="Fonte de Dados: Velit"
          description="Selecione o relatório financeiro do Velit"
          isUploaded={velitUploaded}
          onUpload={() => handleSimulateUpload('velit')}
          iconColor="text-blue-500"
        />
        <UploadZone
          title="Fonte de Dados: Domínio"
          description="Selecione o relatório contábil do Domínio"
          isUploaded={dominioUploaded}
          onUpload={() => handleSimulateUpload('dominio')}
          iconColor="text-purple-500"
        />
      </div>

      <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <Button
          size="lg"
          className="h-14 px-8 text-lg w-full md:w-auto"
          disabled={!velitUploaded || !dominioUploaded || isProcessing}
          onClick={handleStartProcess}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processando e Comparando...
            </>
          ) : (
            <>
              Iniciar Conciliação
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>

      {isProcessing && (
        <div className="mt-8 max-w-md mx-auto text-center animate-fade-in">
          <p className="text-sm text-slate-500 animate-pulse">
            Analisando registros, verificando valores e cruzando dados. Isso pode levar alguns
            segundos...
          </p>
        </div>
      )}
    </div>
  )
}

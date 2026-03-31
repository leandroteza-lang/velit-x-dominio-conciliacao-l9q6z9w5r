import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { UploadZone } from '@/components/UploadZone'
import { PreviewTable } from '@/components/PreviewTable'
import { getMockData } from '@/lib/mock-data'
import { toast } from 'sonner'
import { useReconciliationStore } from '@/stores/useReconciliationStore'

const STEPS = [
  {
    id: 1,
    title: 'PASSO 1: Plano de Contas',
    key: 'plano',
    headers: ['Código', 'Classificação', 'Nome', 'Descrição', 'Máscara'],
  },
  {
    id: 2,
    title: 'PASSO 2: Balancete Domínio',
    key: 'balancete_dominio',
    headers: ['Código', 'Classificação', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Atual'],
  },
  {
    id: 3,
    title: 'PASSO 3: Balancete VELIT',
    key: 'balancete_velit',
    headers: ['Conta Contábil', 'Descrição', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Atual'],
  },
  {
    id: 4,
    title: 'PASSO 4: Conciliação',
    key: 'conciliacao',
    headers: ['Conta Contábil', 'Descrição', 'Saldo Domínio', 'Saldo VELIT', 'Diferença', 'Status'],
  },
  {
    id: 5,
    title: 'PASSO 5: Razão Domínio',
    key: 'razao_dominio',
    headers: ['Conta', 'Data', 'Histórico', 'Débito', 'Crédito', 'Saldo'],
  },
  {
    id: 6,
    title: 'PASSO 6: Razão VELIT',
    key: 'razao_velit',
    headers: ['Conta', 'Data', 'Histórico', 'Débito', 'Crédito', 'Saldo'],
  },
]

export default function Index() {
  const [step, setStep] = useState(1)
  const [uploaded, setUploaded] = useState<Record<number, boolean>>({})
  const [isProcessingStep4, setIsProcessingStep4] = useState(false)
  const [hasProcessedStep4, setHasProcessedStep4] = useState(false)

  const navigate = useNavigate()
  const { processData, isProcessing, reset } = useReconciliationStore()

  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    if (step === 4 && !hasProcessedStep4) {
      setIsProcessingStep4(true)
      const timer = setTimeout(() => {
        setIsProcessingStep4(false)
        setHasProcessedStep4(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [step, hasProcessedStep4])

  const currentStep = STEPS[step - 1]
  const progress = (step / STEPS.length) * 100

  const handleUpload = () => {
    setUploaded((prev) => ({ ...prev, [step]: true }))
    toast.success('Arquivo carregado com sucesso!')
  }

  const handleNext = () => {
    if (step < 6) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleConfirm = async () => {
    if (!uploaded[6]) return
    await processData()
    toast.success('Importação confirmada com sucesso!')
    navigate('/results')
  }

  const isStepValid = () => {
    if (step === 4) return hasProcessedStep4 && !isProcessingStep4
    return !!uploaded[step]
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl flex-1 flex flex-col">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Assistente de Importação
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Siga os passos abaixo para fazer o upload e conciliar os dados contábeis entre os sistemas
          Velit e Domínio.
        </p>
      </div>

      <div className="mb-10 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
        <div className="flex mb-12 relative w-full items-start justify-between">
          <div className="absolute top-4 left-0 w-full h-[2px] bg-muted -z-10"></div>
          <div
            className="absolute top-4 left-0 h-[2px] bg-primary transition-all duration-500 -z-10"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          ></div>

          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center bg-background px-1 sm:px-2 z-10">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm ${
                  step === s.id
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : step > s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={`mt-2 text-[10px] sm:text-xs text-center max-w-[80px] sm:max-w-[120px] leading-tight font-medium transition-colors ${
                  step >= s.id ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-400">
            <span>{currentStep.title}</span>
            <span>Step {step} of 6</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="flex-1 shadow-md border-slate-200 dark:border-slate-800 flex flex-col min-h-[400px]">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            <CardDescription>
              {step === 4
                ? 'Analisando os balancetes enviados nos Passos 2 e 3 para encontrar divergências.'
                : `Faça o upload do arquivo correspondente ao ${currentStep.title}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1">
            {step !== 4 ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <UploadZone
                  title={`Upload: ${currentStep.title}`}
                  description={`Selecione o arquivo Excel ou CSV para ${currentStep.title}`}
                  isUploaded={!!uploaded[step]}
                  onUpload={handleUpload}
                />

                {uploaded[step] && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Pré-visualização de Dados (Primeiras 10 linhas)
                    </h3>
                    <div className="overflow-x-auto">
                      <PreviewTable
                        headers={currentStep.headers}
                        data={getMockData(currentStep.key)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {isProcessingStep4 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-300">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                      Cruzando Informações...
                    </h3>
                    <p className="text-slate-500">
                      Comparando as contas contábeis e identificando diferenças de saldo.
                    </p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 p-4 rounded-md mb-6 flex items-start gap-3 border border-emerald-100 dark:border-emerald-900/50">
                      <Check className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-sm">Conciliação Concluída</h4>
                        <p className="text-sm opacity-90">
                          Os dados dos balancetes foram processados com sucesso. Veja o resumo
                          abaixo.
                        </p>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Resumo de Divergências Encontradas
                    </h3>
                    <div className="overflow-x-auto">
                      <PreviewTable
                        headers={currentStep.headers}
                        data={getMockData(currentStep.key)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-8 pt-4">
          <Button
            disabled={step === 1 || isProcessing}
            onClick={handleBack}
            variant="outline"
            size="lg"
            className="w-32"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {step < 6 ? (
            <Button
              disabled={!isStepValid() || isProcessing}
              onClick={handleNext}
              size="lg"
              className="w-32"
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              disabled={
                !(
                  uploaded[1] &&
                  uploaded[2] &&
                  uploaded[3] &&
                  hasProcessedStep4 &&
                  uploaded[5] &&
                  uploaded[6]
                ) || isProcessing
              }
              onClick={handleConfirm}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Confirmar Importação
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

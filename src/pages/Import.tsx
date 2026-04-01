import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Check,
  UploadCloud,
  Eye,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  RefreshCw,
  Database,
  Search,
  RotateCcw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { PreviewTable } from '@/components/PreviewTable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useReconciliationStore } from '@/stores/useReconciliationStore'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const CARDS = [
  {
    step: 1,
    title: 'Plano de Contas',
    description: 'Estrutura de contas contábeis',
    table: 'plano_contas',
    headers: ['Código', 'Classificação', 'Nome', 'Descrição', 'Máscara'],
    columns: ['codigo', 'classificacao', 'nome', 'descricao', 'mascara'],
  },
  {
    step: 2,
    title: 'Balancete Domínio',
    description: 'Saldos do sistema Domínio',
    table: 'balancete_dominio',
    headers: ['Código', 'Classificação', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Atual'],
    columns: ['codigo', 'classificacao', 'saldo_anterior', 'debito', 'credito', 'saldo_atual'],
  },
  {
    step: 3,
    title: 'Balancete VELIT',
    description: 'Saldos do sistema VELIT',
    table: 'balancete_velit',
    headers: ['Conta Contábil', 'Descrição', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Atual'],
    columns: ['conta_contabil', 'descricao', 'saldo_anterior', 'debito', 'credito', 'saldo_atual'],
  },
  {
    step: 5,
    title: 'Razão Domínio',
    description: 'Lançamentos detalhados Domínio',
    table: 'razao_dominio',
    headers: ['Conta', 'Data', 'Histórico', 'Débito', 'Crédito', 'Saldo'],
    columns: ['conta', 'data', 'historico', 'debito', 'credito', 'saldo'],
  },
  {
    step: 6,
    title: 'Razão VELIT',
    description: 'Lançamentos detalhados VELIT',
    table: 'razao_velit',
    headers: ['Conta', 'Data', 'Histórico', 'Débito', 'Crédito', 'Saldo'],
    columns: ['conta', 'data', 'historico', 'debito', 'credito', 'saldo'],
  },
]

export default function ImportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const {
    processData,
    isProcessing,
    uploadFile,
    processConciliacaoBalancetes,
    reset,
    preparePlanoContasImport,
    executePlanoContasImport,
  } = useReconciliationStore()

  const [importacao, setImportacao] = useState<any>(null)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [lastUpdates, setLastUpdates] = useState<Record<number, string>>({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [isProcessingLocal, setIsProcessingLocal] = useState(false)
  const [hasBackup, setHasBackup] = useState(false)
  const [undoDialogOpen, setUndoDialogOpen] = useState(false)
  const [undoProgress, setUndoProgress] = useState<number | null>(null)

  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [previewTitle, setPreviewTitle] = useState('')
  const [fullViewStep, setFullViewStep] = useState<number | null>(null)
  const [fullViewSearch, setFullViewSearch] = useState('')
  const [isLoadingFullView, setIsLoadingFullView] = useState(false)

  const [replaceDialog, setReplaceDialog] = useState<{ open: boolean; step: number | null }>({
    open: false,
    step: null,
  })

  const [pcImportDialog, setPcImportDialog] = useState<{
    open: boolean
    data: any | null
    isProcessing: boolean
  }>({ open: false, data: null, isProcessing: false })

  const [importProgress, setImportProgress] = useState(0)

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    reset()
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchStatus = async () => {
    if (!user) return
    setLoadingCounts(true)
    try {
      const { data: imp } = await supabase
        .from('importacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setImportacao(imp)
      const newCounts: Record<number, number> = {}
      const newUpdates: Record<number, string> = {}

      for (const card of CARDS) {
        let query = supabase
          .from(card.table as any)
          .select('id', { count: 'exact' })
          .limit(1)
        if (card.step === 1) {
          query = query.eq('user_id', user.id)
        } else if (imp) {
          query = query.eq('importacao_id', imp.id)
        } else {
          query = query.eq('importacao_id', '00000000-0000-0000-0000-000000000000') // dummy if no import
        }

        const { count } = await query

        newCounts[card.step] = count || 0
        if (count && count > 0) {
          newUpdates[card.step] = imp?.created_at || new Date().toISOString()
        }
      }
      setCounts(newCounts)
      setLastUpdates(newUpdates)

      const { count: backupCount } = await supabase
        .from('plano_contas_backup' as any)
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .limit(1)
      setHasBackup(!!(backupCount && backupCount > 0))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingCounts(false)
    }
  }

  const handleCardUploadClick = (step: number) => {
    if (step === 1) {
      fileInputRefs.current[step]?.click()
      return
    }
    if (counts[step] > 0) {
      setReplaceDialog({ open: true, step })
    } else {
      fileInputRefs.current[step]?.click()
    }
  }

  const confirmReplace = () => {
    const step = replaceDialog.step
    setReplaceDialog({ open: false, step: null })
    if (step) {
      fileInputRefs.current[step]?.click()
    }
  }

  const onFileChange = async (step: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingLocal(true)
    try {
      if (step === 1) {
        const result = await preparePlanoContasImport(file)
        setPcImportDialog({ open: true, data: result, isProcessing: false })
      } else {
        if (importacao && counts[step] > 0) {
          const card = CARDS.find((c) => c.step === step)
          if (card) {
            await supabase
              .from(card.table as any)
              .delete()
              .eq('importacao_id', importacao.id)
          }
        }

        await uploadFile(step, file)
        toast.success(`Arquivo importado com sucesso!`)
        await fetchStatus()
      }
    } catch (err: any) {
      toast.error('Erro ao importar: ' + err.message)
    } finally {
      setIsProcessingLocal(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const executeCustomPlanoContasImport = async (
    action: 'ADD_NEW' | 'UPDATE_EXISTING' | 'REPLACE_ALL',
    rawData: any[],
  ) => {
    if (!user) throw new Error('Usuário não autenticado')

    setImportProgress(10)

    let currentAccounts: any[] = []
    let from = 0
    const step = 1000
    let fetchMore = true

    while (fetchMore) {
      const { data, error: fetchErr } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('user_id', user.id)
        .range(from, from + step - 1)

      if (fetchErr) throw fetchErr

      if (data && data.length > 0) {
        currentAccounts = [...currentAccounts, ...data]
        from += step
        if (data.length < step) fetchMore = false
      } else {
        fetchMore = false
      }
    }

    setImportProgress(20)

    if (currentAccounts.length > 0) {
      await supabase.from('plano_contas_backup' as any).insert({
        user_id: user.id,
        data: currentAccounts,
      })
    }

    setImportProgress(30)

    const mergeInheritedFields = (newRow: any, existingRow: any) => {
      return {
        ...newRow,
        descricao: existingRow.descricao || newRow.descricao,
        tipo: existingRow.tipo || newRow.tipo,
        natureza: existingRow.natureza || newRow.natureza,
        finalidade: existingRow.finalidade || newRow.finalidade,
        nivel_tipo: existingRow.nivel_tipo || newRow.nivel_tipo,
      }
    }

    let toInsert: any[] = []

    if (action === 'REPLACE_ALL') {
      toInsert = rawData.map((row) => {
        const existing = currentAccounts.find(
          (c) =>
            (c.codigo && c.codigo === row.codigo) ||
            (c.classificacao && c.classificacao === row.classificacao),
        )
        const merged = existing ? mergeInheritedFields(row, existing) : row
        return {
          ...merged,
          user_id: user.id,
        }
      })
      await supabase.from('plano_contas').delete().eq('user_id', user.id)
    } else if (action === 'UPDATE_EXISTING') {
      const untouched = currentAccounts.filter((c) => {
        return !rawData.some(
          (row) =>
            (c.codigo && c.codigo === row.codigo) ||
            (c.classificacao && c.classificacao === row.classificacao),
        )
      })

      const updatedAndNew = rawData.map((row) => {
        const existing = currentAccounts.find(
          (c) =>
            (c.codigo && c.codigo === row.codigo) ||
            (c.classificacao && c.classificacao === row.classificacao),
        )
        const merged = existing ? mergeInheritedFields(row, existing) : row
        return {
          ...merged,
          user_id: user.id,
        }
      })

      toInsert = [...untouched, ...updatedAndNew]
      await supabase.from('plano_contas').delete().eq('user_id', user.id)
    } else if (action === 'ADD_NEW') {
      toInsert = rawData
        .filter((row) => {
          const existing = currentAccounts.find(
            (c) =>
              (c.codigo && c.codigo === row.codigo) ||
              (c.classificacao && c.classificacao === row.classificacao),
          )
          return !existing
        })
        .map((row) => ({ ...row, user_id: user.id }))
    }

    toInsert = toInsert.map((item) => {
      const obj = { ...item }
      delete obj.id
      return obj
    })

    setImportProgress(40)

    const total = toInsert.length
    for (let i = 0; i < total; i += 500) {
      const chunk = toInsert.slice(i, i + 500)
      const { error: insErr } = await supabase.from('plano_contas').insert(chunk)
      if (insErr) throw insErr

      const p = 40 + Math.round(((i + chunk.length) / total) * 60)
      setImportProgress(p > 100 ? 100 : p)
    }

    setImportProgress(100)
  }

  const handlePcImportAction = async (action: 'ADD_NEW' | 'UPDATE_EXISTING' | 'REPLACE_ALL') => {
    if (!pcImportDialog.data) return
    setPcImportDialog((prev) => ({ ...prev, isProcessing: true }))
    try {
      await executeCustomPlanoContasImport(action, pcImportDialog.data.rawData)
      toast.success('Plano de Contas atualizado com sucesso!')
      setPcImportDialog({ open: false, data: null, isProcessing: false })
      await fetchStatus()
    } catch (err: any) {
      toast.error('Erro ao atualizar Plano de Contas: ' + err.message)
      setPcImportDialog((prev) => ({ ...prev, isProcessing: false }))
    }
  }

  const handleUndoImport = async () => {
    if (!user) return
    setIsProcessingLocal(true)
    setUndoProgress(0)
    try {
      setUndoProgress(10)
      const { data: backups, error: fetchErr } = await supabase
        .from('plano_contas_backup' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('backup_date', { ascending: false })
        .limit(1)

      if (fetchErr) throw fetchErr

      if (!backups || backups.length === 0) {
        toast.error('Nenhum backup encontrado para desfazer.')
        setUndoDialogOpen(false)
        setUndoProgress(null)
        return
      }

      const latestBackup = backups[0]
      const oldData = latestBackup.data

      setUndoProgress(20)

      await supabase.from('plano_contas').delete().eq('user_id', user.id)

      setUndoProgress(40)

      const total = oldData.length
      for (let i = 0; i < total; i += 500) {
        const chunk = oldData.slice(i, i + 500)
        const { error: insErr } = await supabase.from('plano_contas').insert(chunk)
        if (insErr) throw insErr

        const p = 40 + Math.round(((i + chunk.length) / total) * 50)
        setUndoProgress(p > 90 ? 90 : p)
      }

      await supabase
        .from('plano_contas_backup' as any)
        .delete()
        .eq('id', latestBackup.id)

      setUndoProgress(100)
      toast.success('Importação desfeita com sucesso! Plano de Contas restaurado.')
      await fetchStatus()

      setTimeout(() => {
        setUndoDialogOpen(false)
        setUndoProgress(null)
      }, 500)
    } catch (err: any) {
      toast.error('Erro ao desfazer importação: ' + err.message)
      setUndoDialogOpen(false)
      setUndoProgress(null)
    } finally {
      setIsProcessingLocal(false)
    }
  }

  const fetchFullData = async (step: number, search: string) => {
    if (!user) return
    const card = CARDS.find((c) => c.step === step)
    if (!card) return

    setIsLoadingFullView(true)
    try {
      let query = supabase
        .from(card.table as any)
        .select(card.columns.join(','))
        .limit(1000)

      if (step === 1) {
        query = query.eq('user_id', user.id)
      } else if (importacao) {
        query = query.eq('importacao_id', importacao.id)
      } else {
        query = query.eq('importacao_id', '00000000-0000-0000-0000-000000000000')
      }

      if (search) {
        const textColumns = card.columns.filter((c) =>
          [
            'conta_contabil',
            'descricao',
            'codigo',
            'classificacao',
            'conta',
            'historico',
            'nome',
          ].includes(c),
        )
        if (textColumns.length > 0) {
          const orQuery = textColumns.map((c) => `${c}.ilike.%${search}%`).join(',')
          query = query.or(orQuery)
        }
      }

      const { data } = await query

      const mappedData = (data || []).map((row: any) => {
        const newObj: any = {}
        card.columns.forEach((col) => {
          newObj[col] = row[col]
        })
        return newObj
      })

      setPreviewData(mappedData)
    } catch (err: any) {
      toast.error('Erro ao carregar dados: ' + err.message)
    } finally {
      setIsLoadingFullView(false)
    }
  }

  useEffect(() => {
    if (fullViewStep !== null && previewModalOpen) {
      const timer = setTimeout(() => {
        fetchFullData(fullViewStep, fullViewSearch)
      }, 500)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullViewSearch, fullViewStep, previewModalOpen])

  const handleViewData = (step: number) => {
    if (step === 1) {
      navigate('/cadastros/plano-contas')
      return
    }

    const card = CARDS.find((c) => c.step === step)
    if (!card) return

    setPreviewTitle(`Dados Atuais: ${card.title}`)
    setPreviewHeaders(card.headers)
    setFullViewStep(step)
    setFullViewSearch('')
    setPreviewData([])
    setPreviewModalOpen(true)
  }

  const canConciliate =
    Object.keys(counts).length > 0 && CARDS.every((c) => (counts[c.step] || 0) > 0)
  const isBusy = isProcessing || isProcessingLocal || loadingCounts

  const handleGenerateConciliation = async () => {
    setIsProcessingLocal(true)
    try {
      if (counts[2] > 0 && counts[3] > 0) {
        await processConciliacaoBalancetes()
      }
      await processData()
      toast.success('Conciliação gerada com sucesso!')
      navigate('/results')
    } catch (err: any) {
      toast.error('Erro ao processar conciliação: ' + err.message)
    } finally {
      setIsProcessingLocal(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl flex-1 flex flex-col animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Dashboard de Gestão de Dados
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Importe e monitore os arquivos contábeis necessários para a conciliação. O sistema
            indicará quais arquivos já estão presentes na base.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {CARDS.map((card) => {
          const count = counts[card.step] || 0
          const hasData = count > 0
          const updateDate = lastUpdates[card.step]

          return (
            <Card
              key={card.step}
              className={cn(
                'transition-all duration-300 flex flex-col',
                hasData
                  ? 'border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/20 shadow-sm hover:shadow-md'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300',
              )}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet
                    className={cn('w-5 h-5', hasData ? 'text-emerald-500' : 'text-slate-400')}
                  />
                  {card.title}
                </CardTitle>
                <CardDescription className="line-clamp-1">{card.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="flex items-center min-h-[40px]">
                  {loadingCounts ? (
                    <Skeleton className="h-10 w-full rounded-md" />
                  ) : hasData ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {count.toLocaleString('pt-BR')} registros na base
                      </span>
                      {updateDate && (
                        <span className="text-xs text-muted-foreground mt-1 ml-7">
                          Atualizado em{' '}
                          {format(new Date(updateDate), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-500 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Pendente
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-0 flex gap-2 mt-auto">
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,.txt"
                  ref={(el) => (fileInputRefs.current[card.step] = el)}
                  onChange={(e) => onFileChange(card.step, e)}
                />
                <Button
                  variant={hasData ? 'outline' : 'default'}
                  className="flex-1"
                  onClick={() => handleCardUploadClick(card.step)}
                  disabled={isBusy}
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {hasData && card.step !== 1 ? 'Substituir' : 'Importar'}
                </Button>
                {hasData && (
                  <Button
                    variant="secondary"
                    className={cn(card.step === 1 ? 'flex-1' : 'w-12 px-0')}
                    onClick={() => handleViewData(card.step)}
                    title="Ver dados atuais"
                    disabled={isBusy}
                  >
                    <Eye className={cn('w-4 h-4', card.step === 1 ? 'mr-2' : '')} />
                    {card.step === 1 ? 'Ver Plano' : ''}
                  </Button>
                )}
                {card.step === 1 && hasBackup && (
                  <Button
                    variant="outline"
                    className="w-12 px-0 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/30"
                    onClick={() => setUndoDialogOpen(true)}
                    title="Desfazer Última Importação"
                    disabled={isBusy}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div
        className={cn(
          'mt-auto flex flex-col sm:flex-row items-center justify-between p-6 rounded-xl border transition-colors duration-500',
          canConciliate
            ? 'bg-primary/5 border-primary/20 dark:bg-primary/10'
            : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800',
        )}
      >
        <div className="text-center sm:text-left mb-4 sm:mb-0">
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
            Pronto para conciliar?
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {canConciliate
              ? 'Todos os arquivos essenciais estão carregados. Você já pode iniciar o processamento.'
              : 'Importe todos os arquivos pendentes para liberar a conciliação global.'}
          </p>
        </div>
        <Button
          size="lg"
          className={cn(
            'min-w-[200px] shadow-sm',
            canConciliate && !isBusy
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : '',
          )}
          disabled={!canConciliate || isBusy}
          onClick={handleGenerateConciliation}
        >
          {isBusy ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" /> Gerar Conciliação Global
            </>
          )}
        </Button>
      </div>

      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desfazer Última Importação?</DialogTitle>
            <DialogDescription>
              Isso apagará o Plano de Contas atual e restaurará os dados exatos da última versão
              antes da sua importação mais recente. Deseja continuar?
            </DialogDescription>
          </DialogHeader>

          {undoProgress !== null && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Restaurando backup...</span>
                <span>{undoProgress}%</span>
              </div>
              <Progress value={undoProgress} />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUndoDialogOpen(false)}
              disabled={undoProgress !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleUndoImport}
              disabled={isProcessingLocal || undoProgress !== null}
            >
              {isProcessingLocal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sim, Restaurar Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={replaceDialog.open}
        onOpenChange={(o) => !o && setReplaceDialog({ open: false, step: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir Dados Existentes?</DialogTitle>
            <DialogDescription>
              Já existem{' '}
              {replaceDialog.step ? counts[replaceDialog.step]?.toLocaleString('pt-BR') : 0}{' '}
              registros na base para este tipo de arquivo. Ao importar um novo, os dados atuais
              serão apagados e substituídos. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceDialog({ open: false, step: null })}>
              Cancelar
            </Button>
            <Button variant="default" onClick={confirmReplace}>
              Sim, Substituir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pcImportDialog.open}
        onOpenChange={(o) =>
          !pcImportDialog.isProcessing && setPcImportDialog((prev) => ({ ...prev, open: o }))
        }
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Importação do Plano de Contas</DialogTitle>
            <DialogDescription>
              Analisamos o seu arquivo. Encontramos{' '}
              <strong>{pcImportDialog.data?.newAccounts?.length || 0} contas novas</strong> e{' '}
              <strong>
                {pcImportDialog.data?.existingAccounts?.length || 0} contas que já existem
              </strong>{' '}
              na base. Como deseja prosseguir?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1"
              onClick={() => handlePcImportAction('ADD_NEW')}
              disabled={pcImportDialog.isProcessing}
            >
              <span className="font-semibold text-primary">Adicionar apenas as novas</span>
              <span className="font-normal text-xs text-muted-foreground whitespace-normal text-left">
                Contas que já existem serão ignoradas. Suas descrições e propriedades manuais serão
                mantidas intactas.
              </span>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1"
              onClick={() => handlePcImportAction('UPDATE_EXISTING')}
              disabled={pcImportDialog.isProcessing}
            >
              <span className="font-semibold text-amber-600">
                Atualizar existentes e adicionar novas
              </span>
              <span className="font-normal text-xs text-muted-foreground whitespace-normal text-left">
                Atualiza os nomes e classificações das contas existentes, mas mantém as propriedades
                (Tipo, Natureza, Finalidade). Adiciona as contas novas.
              </span>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
              onClick={() => handlePcImportAction('REPLACE_ALL')}
              disabled={pcImportDialog.isProcessing}
            >
              <span className="font-semibold text-red-600">Substituir todo o plano</span>
              <span className="font-normal text-xs text-muted-foreground whitespace-normal text-left">
                Apaga todas as contas atuais (incluindo descrições manuais) e importa as contas do
                arquivo.
              </span>
            </Button>
          </div>

          {pcImportDialog.isProcessing && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processando importação...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPcImportDialog((prev) => ({ ...prev, open: false }))}
              disabled={pcImportDialog.isProcessing}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewModalOpen}
        onOpenChange={(open) => {
          setPreviewModalOpen(open)
          if (!open) setFullViewStep(null)
        }}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>
              Visualize os dados cadastrados na base para este arquivo. Exibindo até 1000 registros.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 mt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar registros..."
                className="pl-9"
                value={fullViewSearch}
                onChange={(e) => setFullViewSearch(e.target.value)}
              />
            </div>
            {isLoadingFullView && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
          </div>
          <div className="flex-1 overflow-auto mt-4 border rounded-md">
            {isLoadingFullView && previewData.length === 0 ? (
              <div className="p-8 flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : fullViewStep === 1 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#003366] hover:bg-[#003366]">
                    {previewHeaders.map((h, i) => (
                      <TableHead
                        key={i}
                        className="text-white font-bold text-center border border-slate-700"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => {
                    const niveisConta = (row.classificacao || '').split('.').length
                    const niveisMascara = (row.mascara || '').split('.').length
                    const isHighlighted = niveisConta <= niveisMascara - 1

                    return (
                      <TableRow
                        key={i}
                        className={cn(
                          isHighlighted
                            ? 'bg-[#003366] text-white hover:bg-[#004080]'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        )}
                      >
                        {CARDS.find((c) => c.step === 1)?.columns.map((col, j) => (
                          <TableCell
                            key={j}
                            className={cn(
                              'border border-slate-200 dark:border-slate-800',
                              col === 'codigo' && 'text-center',
                            )}
                          >
                            {row[col]}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                  {previewData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={previewHeaders.length}
                        className="text-center py-8 text-slate-500"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <PreviewTable headers={previewHeaders} data={previewData} />
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setPreviewModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

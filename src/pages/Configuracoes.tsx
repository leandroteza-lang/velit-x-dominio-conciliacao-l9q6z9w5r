import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Settings, Save, Trash2, FileClock, FolderOpen, Loader2, Download } from 'lucide-react'

type UserSettings = {
  id?: string
  user_id?: string
  export_directory: string
  csv_separator: string
  date_format: string
  number_format: string
}

type ExportHistory = {
  id: string
  file_name: string
  export_date: string
  type: string
  records_count: number
}

export default function Configuracoes() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const [settings, setSettings] = useState<UserSettings>({
    export_directory: '',
    csv_separator: ';',
    date_format: 'DD/MM/YYYY',
    number_format: 'pt-BR',
  })
  const [history, setHistory] = useState<ExportHistory[]>([])

  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const [settingsRes, historyRes] = await Promise.all([
          supabase
            .from('user_settings' as any)
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('export_history' as any)
            .select('*')
            .eq('user_id', user.id)
            .order('export_date', { ascending: false }),
        ])

        if (settingsRes.data) {
          setSettings({
            export_directory: settingsRes.data.export_directory || '',
            csv_separator: settingsRes.data.csv_separator || ';',
            date_format: settingsRes.data.date_format || 'DD/MM/YYYY',
            number_format: settingsRes.data.number_format || 'pt-BR',
          })
        }
        if (historyRes.data) {
          setHistory(historyRes.data)
        }
      } catch (error) {
        console.error('Error loading config:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('user_settings' as any).upsert(
        {
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )

      if (error) throw error

      toast({
        title: 'Configurações salvas',
        description: 'Suas preferências foram atualizadas com sucesso.',
      })
    } catch (error) {
      console.error('Save error', error)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearHistory = async () => {
    if (!user) return
    setIsClearing(true)
    try {
      const { error } = await supabase
        .from('export_history' as any)
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setHistory([])
      toast({
        title: 'Histórico limpo',
        description: 'Todos os registros de exportação foram removidos.',
      })
    } catch (error) {
      console.error('Clear error', error)
      toast({
        title: 'Erro ao limpar',
        description: 'Não foi possível limpar o histórico.',
        variant: 'destructive',
      })
    } finally {
      setIsClearing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Configurações
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gerencie suas preferências de exportação e visualize o histórico de arquivos gerados.
        </p>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Exportação
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileClock className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Exportação</CardTitle>
              <CardDescription>
                Configure como os arquivos serão gerados pelo sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="directory">Diretório Padrão</Label>
                  <Input
                    id="directory"
                    value={settings.export_directory}
                    onChange={(e) => setSettings({ ...settings, export_directory: e.target.value })}
                    placeholder="Ex: C:\Exportacoes\"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este caminho poderá ser utilizado como prefixo nos nomes dos arquivos gerados.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="separator">Separador de Colunas (CSV/TXT)</Label>
                    <Select
                      value={settings.csv_separator}
                      onValueChange={(v) => setSettings({ ...settings, csv_separator: v })}
                    >
                      <SelectTrigger id="separator">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=";">Ponto-e-vírgula (;)</SelectItem>
                        <SelectItem value=",">Vírgula (,)</SelectItem>
                        <SelectItem value="\t">Tabulação (Tab)</SelectItem>
                        <SelectItem value="|">Pipe (|)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="date_format">Formato de Datas</Label>
                    <Select
                      value={settings.date_format}
                      onValueChange={(v) => setSettings({ ...settings, date_format: v })}
                    >
                      <SelectTrigger id="date_format">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="number_format">Formato de Números</Label>
                    <Select
                      value={settings.number_format}
                      onValueChange={(v) => setSettings({ ...settings, number_format: v })}
                    >
                      <SelectTrigger id="number_format">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">1.234,56 (Brasil)</SelectItem>
                        <SelectItem value="en-US">1,234.56 (EUA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6 mt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Preferências
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <div className="space-y-1">
                <CardTitle>Histórico de Arquivos Gerados</CardTitle>
                <CardDescription>
                  Registro de todas as exportações realizadas nesta conta.
                </CardDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    size="sm"
                    disabled={history.length === 0 || isClearing}
                  >
                    {isClearing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Limpar Histórico
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todo o registro de arquivos exportados será
                      apagado permanentemente. Os arquivos que você já baixou não serão afetados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearHistory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, limpar histórico
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Registros</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                          Nenhum registro de exportação encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <Download className="w-4 h-4 text-slate-400" />
                            {item.file_name}
                          </TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell className="text-right">{item.records_count}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {new Date(item.export_date).toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

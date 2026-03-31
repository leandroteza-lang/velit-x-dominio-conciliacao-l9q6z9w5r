import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('importacoes')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setHistory(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleUndo = async (id: string) => {
    if (
      !confirm(
        'Deseja realmente desfazer esta importação? Todos os dados vinculados a ela serão apagados e essa ação não pode ser desfeita.',
      )
    )
      return

    setDeletingId(id)
    try {
      const { error } = await supabase.from('importacoes').delete().eq('id', id)

      if (error) throw error

      toast.success('Importação desfeita com sucesso!')
      setHistory(history.filter((h) => h.id !== id))
    } catch (err: any) {
      toast.error('Erro ao desfazer importação: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl flex-1 flex flex-col animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          Histórico de Operações
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Acompanhe o registro de todas as importações e conciliações realizadas no sistema.
        </p>
      </div>

      <Card className="flex-1 shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
          <CardTitle>Todas as Importações</CardTitle>
          <CardDescription>
            Lista completa de registros ordenados pela data de criação
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] px-6">Data</TableHead>
                <TableHead>Identificador (ID)</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium px-6">
                      {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono">{item.id}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {item.user_id ? item.user_id.substring(0, 8) + '...' : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'ERROR'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleUndo(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Desfazer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

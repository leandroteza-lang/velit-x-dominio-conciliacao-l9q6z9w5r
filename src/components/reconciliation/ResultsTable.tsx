import { useState, useMemo } from 'react'
import { ComparisonRecord, ComparisonStatus } from '@/types/reconciliation'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { StatusBadge } from './StatusBadge'
import { MismatchDetailSheet } from './MismatchDetailSheet'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, FilterX } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ResultsTableProps {
  data: ComparisonRecord[]
}

export function ResultsTable({ data }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ComparisonStatus | 'ALL'>('ALL')
  const [selectedRecord, setSelectedRecord] = useState<ComparisonRecord | null>(null)

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.date.includes(searchTerm)
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [data, searchTerm, statusFilter])

  const handleRowClick = (record: ComparisonRecord) => {
    if (record.status !== 'MATCHED') {
      setSelectedRecord(record)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por descrição ou data..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value="MATCHED">Conciliados</SelectItem>
              <SelectItem value="MISMATCH">Divergentes</SelectItem>
              <SelectItem value="MISSING_VELIT">Faltando no Velit</SelectItem>
              <SelectItem value="MISSING_DOMINIO">Faltando no Domínio</SelectItem>
            </SelectContent>
          </Select>
          {(searchTerm || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
              }}
              title="Limpar Filtros"
            >
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <Table wrapperClassName="max-h-[calc(100vh-250px)]">
          <TableHeader className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-950 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <TableRow>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Velit</TableHead>
              <TableHead className="text-right">Domínio</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  Nenhum registro encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((record) => (
                <TableRow
                  key={record.id}
                  onClick={() => handleRowClick(record)}
                  className={cn(
                    'transition-colors',
                    record.status !== 'MATCHED'
                      ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : '',
                  )}
                >
                  <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                    {formatDate(record.date)}
                  </TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(record.velitValue)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(record.dominioValue)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold',
                      record.difference !== 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400',
                    )}
                  >
                    {record.difference !== 0 ? formatCurrency(record.difference) : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MismatchDetailSheet record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  )
}

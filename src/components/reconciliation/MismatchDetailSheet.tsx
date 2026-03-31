import { ComparisonRecord } from '@/types/reconciliation'
import { formatCurrency, formatDate } from '@/lib/formatters'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { StatusBadge } from './StatusBadge'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, Info } from 'lucide-react'

interface MismatchDetailSheetProps {
  record: ComparisonRecord | null
  onClose: () => void
}

export function MismatchDetailSheet({ record, onClose }: MismatchDetailSheetProps) {
  if (!record) return null

  return (
    <Sheet open={!!record} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <SheetTitle>Detalhes da Divergência</SheetTitle>
            <StatusBadge status={record.status} />
          </div>
          <SheetDescription>Análise detalhada do registro selecionado.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* General Info */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-500">Data da Transação</p>
              <p className="text-base">{formatDate(record.date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Descrição</p>
              <p className="text-base font-medium">{record.description}</p>
            </div>
          </div>

          <Separator />

          {/* Comparison */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Comparação de Valores
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                  Valor Velit
                </p>
                <p className="text-xl font-semibold">
                  {record.velitValue !== null ? (
                    formatCurrency(record.velitValue)
                  ) : (
                    <span className="text-slate-400 italic">Não encontrado</span>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-lg border border-purple-100 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-950/20">
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                  Valor Domínio
                </p>
                <p className="text-xl font-semibold">
                  {record.dominioValue !== null ? (
                    formatCurrency(record.dominioValue)
                  ) : (
                    <span className="text-slate-400 italic">Não encontrado</span>
                  )}
                </p>
              </div>
            </div>

            {record.difference !== 0 && (
              <div className="mt-4 p-4 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    Diferença Encontrada
                  </p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-500">
                    {formatCurrency(Math.abs(record.difference))}
                  </p>
                </div>
                <Info className="h-8 w-8 text-rose-300" />
              </div>
            )}
          </div>

          <Separator />

          {/* Action or Recommendation */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Recomendação
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {record.status === 'MISMATCH' &&
                'Verifique se houve algum desconto, taxa ou juros aplicados apenas em um dos sistemas.'}
              {record.status === 'MISSING_VELIT' &&
                'Este lançamento consta no Domínio mas não foi encontrado no relatório do Velit. Verifique se a exportação incluiu este período/categoria.'}
              {record.status === 'MISSING_DOMINIO' &&
                'Este lançamento consta no Velit mas não foi importado/lançado no Domínio. Recomendado criar o lançamento contábil.'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

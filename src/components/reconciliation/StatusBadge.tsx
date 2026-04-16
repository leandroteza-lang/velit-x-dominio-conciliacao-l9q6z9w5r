import { Badge } from '@/components/ui/badge'
import { ComparisonStatus } from '@/types/reconciliation'
import { Check, X, AlertCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: ComparisonStatus }) {
  switch (status) {
    case 'MATCHED':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 gap-1 font-medium"
        >
          <Check className="w-3 h-3" /> Conciliado
        </Badge>
      )
    case 'MISMATCH':
      return (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 gap-1 font-medium"
        >
          <AlertCircle className="w-3 h-3" /> Divergente
        </Badge>
      )
    case 'MISSING_VELIT':
      return (
        <Badge
          variant="outline"
          className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 gap-1 font-medium"
        >
          <X className="w-3 h-3" /> Sem lctos no Velit
        </Badge>
      )
    case 'MISSING_DOMINIO':
      return (
        <Badge
          variant="outline"
          className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 gap-1 font-medium"
        >
          <HelpCircle className="w-3 h-3" /> Sem lctos no Dominio
        </Badge>
      )
    default:
      return <Badge>{status}</Badge>
  }
}

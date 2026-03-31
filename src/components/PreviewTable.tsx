import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface PreviewTableProps {
  headers: string[]
  data: string[][]
}

export const PreviewTable = ({ headers, data }: PreviewTableProps) => {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
          <TableRow className="hover:bg-transparent">
            {headers.map((h, i) => (
              <TableHead
                key={i}
                className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow
              key={i}
              className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
            >
              {row.map((cell, j) => {
                if (cell === 'OK') {
                  return (
                    <TableCell key={j}>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 font-medium border-0"
                      >
                        OK
                      </Badge>
                    </TableCell>
                  )
                }
                if (cell === 'Divergência') {
                  return (
                    <TableCell key={j}>
                      <Badge variant="destructive" className="font-medium">
                        Divergência
                      </Badge>
                    </TableCell>
                  )
                }
                if (cell === 'Sem Conta') {
                  return (
                    <TableCell key={j}>
                      <Badge
                        variant="outline"
                        className="text-orange-600 border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400 font-medium"
                      >
                        Sem Conta
                      </Badge>
                    </TableCell>
                  )
                }
                return (
                  <TableCell
                    key={j}
                    className="whitespace-nowrap text-slate-600 dark:text-slate-400"
                  >
                    {cell}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

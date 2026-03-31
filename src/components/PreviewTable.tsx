import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PreviewTableProps {
  headers: string[]
  data: any[]
}

export function PreviewTable({ headers, data }: PreviewTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground border rounded-md bg-muted/20">
        Nenhum dado disponível para visualização.
      </div>
    )
  }

  return (
    <div className="border rounded-md bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i} className="whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => {
            // Remove DB specific internal columns before mapping to array
            const { id, importacao_id, ...rest } = row
            const values = Object.values(rest)
            return (
              <TableRow key={i}>
                {values.map((val: any, j) => (
                  <TableCell key={j} className="whitespace-nowrap">
                    {val !== null && val !== undefined ? String(val) : '-'}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

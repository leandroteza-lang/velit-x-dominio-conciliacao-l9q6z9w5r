import { UploadCloud, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  title: string
  description: string
  isUploaded: boolean
  onUpload: () => void
  iconColor?: string
}

export const UploadZone = ({
  title,
  description,
  isUploaded,
  onUpload,
  iconColor = 'text-primary',
}: UploadZoneProps) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 border-2 border-dashed',
        isUploaded
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-primary/50 dark:hover:bg-slate-900',
        'cursor-pointer w-full max-w-2xl mx-auto',
      )}
      onClick={onUpload}
    >
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 transition-colors">
          {isUploaded ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-in zoom-in duration-300" />
          ) : (
            <UploadCloud className={cn('h-8 w-8', iconColor)} />
          )}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center pb-8">
        {isUploaded ? (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in">
            Arquivo carregado e validado com sucesso
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <FileSpreadsheet className="h-4 w-4" /> CSV, XLS ou XLSX
            </span>
            <span>Clique para selecionar ou arraste e solte o arquivo aqui</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

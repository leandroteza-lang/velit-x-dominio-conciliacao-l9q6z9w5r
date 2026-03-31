import { useRef } from 'react'
import { UploadCloud } from 'lucide-react'

interface UploadZoneProps {
  title: string
  description: string
  isUploaded: boolean
  onUpload: (file: File) => void
}

export function UploadZone({ title, description, isUploaded, onUpload }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isUploaded ? 'border-emerald-500 bg-emerald-500/5' : 'border-muted hover:border-primary/50'}`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls,.txt"
      />
      <UploadCloud
        className={`mx-auto h-12 w-12 mb-4 transition-colors ${isUploaded ? 'text-emerald-500' : 'text-muted-foreground'}`}
      />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {isUploaded && (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-4">
          Arquivo processado com sucesso
        </p>
      )}
    </div>
  )
}

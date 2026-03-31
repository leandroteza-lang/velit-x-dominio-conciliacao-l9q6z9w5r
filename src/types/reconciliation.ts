export type ComparisonStatus = 'MATCHED' | 'MISMATCH' | 'MISSING_VELIT' | 'MISSING_DOMINIO'

export interface ComparisonRecord {
  id: string
  date: string
  description: string
  velitValue: number | null
  dominioValue: number | null
  difference: number
  status: ComparisonStatus
}

export interface ReconciliationSummary {
  totalVelit: number
  totalDominio: number
  matches: number
  discrepancies: number
}

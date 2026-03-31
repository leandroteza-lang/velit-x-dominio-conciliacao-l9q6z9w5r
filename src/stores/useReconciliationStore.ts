import { create } from 'zustand'
import { ComparisonRecord, ReconciliationSummary } from '@/types/reconciliation'

interface ReconciliationStore {
  isProcessing: boolean
  hasData: boolean
  results: ComparisonRecord[]
  summary: ReconciliationSummary | null
  processData: () => Promise<void>
  reset: () => void
}

const generateMockData = () => {
  const mockResults: ComparisonRecord[] = []
  let velitCount = 0
  let dominioCount = 0
  let matchCount = 0
  let discrepancyCount = 0

  const addRecord = (base: Partial<ComparisonRecord>, status: ComparisonRecord['status']) => {
    const record: ComparisonRecord = {
      id: Math.random().toString(36).substring(7),
      date: base.date || '2023-10-01',
      description: base.description || 'Sample Transaction',
      velitValue: base.velitValue ?? null,
      dominioValue: base.dominioValue ?? null,
      difference: (base.velitValue || 0) - (base.dominioValue || 0),
      status,
    }
    mockResults.push(record)
    if (record.velitValue !== null) velitCount++
    if (record.dominioValue !== null) dominioCount++
    if (status === 'MATCHED') matchCount++
    else discrepancyCount++
  }

  // Generate Matches
  for (let i = 1; i <= 15; i++) {
    const val = 100 * i + 50.25
    addRecord(
      {
        date: `2023-10-${i.toString().padStart(2, '0')}`,
        description: `Faturamento NF-${1000 + i}`,
        velitValue: val,
        dominioValue: val,
      },
      'MATCHED',
    )
  }

  // Generate Mismatches
  addRecord(
    {
      date: '2023-10-05',
      description: 'Taxa Administrativa',
      velitValue: 1500.0,
      dominioValue: 150.0,
    },
    'MISMATCH',
  )
  addRecord(
    {
      date: '2023-10-12',
      description: 'Pagamento Fornecedor X',
      velitValue: 3450.5,
      dominioValue: 3450.0,
    },
    'MISMATCH',
  )
  addRecord(
    {
      date: '2023-10-18',
      description: 'Serviços Prestados',
      velitValue: 890.0,
      dominioValue: 980.0,
    },
    'MISMATCH',
  )

  // Generate Missing in Velit
  addRecord(
    {
      date: '2023-10-08',
      description: 'Ajuste Manual Domínio',
      velitValue: null,
      dominioValue: 450.0,
    },
    'MISSING_VELIT',
  )
  addRecord(
    {
      date: '2023-10-22',
      description: 'Estorno Não Lançado',
      velitValue: null,
      dominioValue: -120.0,
    },
    'MISSING_VELIT',
  )

  // Generate Missing in Domínio
  addRecord(
    {
      date: '2023-10-15',
      description: 'Venda Dinheiro PDV',
      velitValue: 320.0,
      dominioValue: null,
    },
    'MISSING_DOMINIO',
  )
  addRecord(
    {
      date: '2023-10-25',
      description: 'Recebimento PIX Avulso',
      velitValue: 150.0,
      dominioValue: null,
    },
    'MISSING_DOMINIO',
  )

  return {
    results: mockResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    summary: {
      totalVelit: velitCount,
      totalDominio: dominioCount,
      matches: matchCount,
      discrepancies: discrepancyCount,
    },
  }
}

export const useReconciliationStore = create<ReconciliationStore>((set) => ({
  isProcessing: false,
  hasData: false,
  results: [],
  summary: null,
  processData: async () => {
    set({ isProcessing: true })
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const data = generateMockData()
    set({
      isProcessing: false,
      hasData: true,
      results: data.results,
      summary: data.summary,
    })
  },
  reset: () => set({ isProcessing: false, hasData: false, results: [], summary: null }),
}))

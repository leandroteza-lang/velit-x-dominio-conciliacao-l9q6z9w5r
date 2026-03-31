export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR').format(date)
  } catch (error) {
    return dateString
  }
}

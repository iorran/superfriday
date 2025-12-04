import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export interface FinancesData {
  totalIncome: number
  pendingToAccountant: number
  sentToClient: number
  sentToAccountant: number
  byClient: Array<{ name: string; amount: number }>
  byMonth: Array<{ month: string; amount: number }>
  byYear: Array<{ year: number; amount: number }>
}

async function getFinances(): Promise<FinancesData> {
  const response = await fetch('/api/finances')
  if (!response.ok) {
    throw new Error('Failed to fetch finances')
  }
  return response.json()
}

export function useFinances() {
  return useQuery({
    queryKey: queryKeys.finances.all(),
    queryFn: getFinances,
  })
}


import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/shared/query-keys'

export interface FinancesData {
  totalIncome: number
  pendingToAccountant: number
  sentToClient: number
  sentToAccountant: number
  byClient: Array<{ name: string; amount: number }>
  byMonth: Array<{ month: string; amount: number }>
  byYear: Array<{ year: number; amount: number }>
}

const getFinances = async (): Promise<FinancesData> => {
  const response = await fetch('/api/finances')
  if (!response.ok) {
    throw new Error('Failed to fetch finances')
  }
  return response.json()
}

export const useFinances = () => {
  return useQuery({
    queryKey: queryKeys.finances.all(),
    queryFn: getFinances,
  })
}


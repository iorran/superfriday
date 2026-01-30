'use client'

import { useFinances } from '@/hooks/use-finances'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, DollarSign, Clock, Send } from 'lucide-react'
import { formatCurrency } from '@/lib/shared/utils'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4']

const FinancesPage = () => {
  const { data: finances, isLoading } = useFinances()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!finances) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Erro ao carregar dados financeiros</p>
      </div>
    )
  }

  // Format month data for better display
  const formattedMonthData = finances.byMonth.map((item) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('pt-PT', {
      month: 'short',
      year: 'numeric',
    }),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Finanças</h1>
        <p className="text-muted-foreground">
          Visão geral das suas receitas e análises financeiras
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finances.totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as invoices criadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviado ao Cliente</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finances.sentToClient)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((finances.sentToClient / finances.totalIncome) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente Contador</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(finances.pendingToAccountant)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enviado ao cliente, aguardando contador
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviado ao Contador</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(finances.sentToAccountant)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Processo completo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Amount by Client */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={finances.byClient.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: unknown) => {
                    if (typeof value === 'number') {
                      return formatCurrency(value)
                    }
                    return formatCurrency(0)
                  }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Amount by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formattedMonthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="monthLabel"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: unknown) => {
                    if (typeof value === 'number') {
                      return formatCurrency(value)
                    }
                    return formatCurrency(0)
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Amount by Year */}
        <Card>
          <CardHeader>
            <CardTitle>Receita Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={finances.byYear}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: unknown) => {
                    if (typeof value === 'number') {
                      return formatCurrency(value)
                    }
                    return formatCurrency(0)
                  }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Pendente Contador',
                      value: finances.pendingToAccountant,
                    },
                    {
                      name: 'Enviado ao Contador',
                      value: finances.sentToAccountant,
                    },
                    {
                      name: 'Não Enviado',
                      value: Math.max(0, finances.totalIncome - finances.sentToClient),
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Pendente Contador', value: finances.pendingToAccountant },
                    { name: 'Enviado ao Contador', value: finances.sentToAccountant },
                    { name: 'Não Enviado', value: Math.max(0, finances.totalIncome - finances.sentToClient) },
                  ].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => {
                    if (typeof value === 'number') {
                      return formatCurrency(value)
                    }
                    return formatCurrency(0)
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FinancesPage

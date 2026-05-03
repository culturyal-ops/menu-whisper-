interface Stat {
  label: string
  value: string | number
  change: string
  trend: 'up' | 'down'
}

interface StatsGridProps {
  stats: {
    todayOrders: number
    revenue: string
    avgOrderValue: string
    guestSatisfaction: number
  }
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statCards = [
    {
      label: 'Total Orders Today',
      value: stats.todayOrders,
      change: '↑ 23% vs yesterday',
      trend: 'up' as const
    },
    {
      label: 'Revenue Today',
      value: `₹${stats.revenue}`,
      change: '↑ 18% vs yesterday',
      trend: 'up' as const
    },
    {
      label: 'Avg Order Value',
      value: `₹${stats.avgOrderValue}`,
      change: '↑ 12%',
      trend: 'up' as const
    },
    {
      label: 'Guest Satisfaction',
      value: stats.guestSatisfaction,
      change: '↑ 0.2 stars',
      trend: 'up' as const
    }
  ]

  return (
    <div className="grid grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="stat-card">
          <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
          <p className="text-3xl font-bold mb-2">{stat.value}</p>
          <p className={`text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {stat.change}
          </p>
        </div>
      ))}
    </div>
  )
}

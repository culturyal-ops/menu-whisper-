import Sidebar from '@/components/Sidebar'
import StatsGrid from '@/components/StatsGrid'
import OrdersTable from '@/components/OrdersTable'
import { getDashboardData } from '@/lib/api'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-gray-500 mt-1">The Leela, Kovalam</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">AI Concierge Live</span>
              </div>
              
              <button className="btn-secondary">
                View QR Code
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <StatsGrid stats={data.stats} />

          {/* Recent Orders */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Orders</h2>
              <button className="text-primary hover:underline">View All</button>
            </div>
            
            <OrdersTable orders={data.recentOrders} />
          </div>

          {/* Quick Insights */}
          <div className="mt-8 grid grid-cols-2 gap-6">
            <div className="stat-card">
              <h3 className="font-semibold mb-2">Most Ordered Dish Today</h3>
              <p className="text-2xl font-bold">Dry-Aged Lamb Rack</p>
              <p className="text-gray-500 text-sm mt-1">34 orders</p>
            </div>
            
            <div className="stat-card">
              <h3 className="font-semibold mb-2">Peak Order Time</h3>
              <p className="text-2xl font-bold">8:00 PM — 9:30 PM</p>
              <p className="text-gray-500 text-sm mt-1">67 orders in this window</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

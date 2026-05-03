export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const stats = [
    { label: 'Total Orders Today', value: 127, change: '↑ 23%', color: 'bg-blue-50 text-blue-700' },
    { label: 'Revenue Today', value: '₹3.2L', change: '↑ 18%', color: 'bg-green-50 text-green-700' },
    { label: 'Avg Order Value', value: '₹2,520', change: '↑ 12%', color: 'bg-purple-50 text-purple-700' },
    { label: 'Guest Satisfaction', value: '4.9 ★', change: '↑ 0.2', color: 'bg-amber-50 text-amber-700' },
  ]

  const orders = [
    { id: 'MW-2847', table: '12', items: 'Lamb Rack, Wine', status: 'preparing', time: '2 min ago', total: '₹4,200' },
    { id: 'MW-2846', table: '7', items: 'Grilled Sea Bass, Salad', status: 'confirmed', time: '8 min ago', total: '₹2,800' },
    { id: 'MW-2845', table: '3', items: 'Tasting Menu (2 pax)', status: 'preparing', time: '15 min ago', total: '₹8,500' },
    { id: 'MW-2844', table: '9', items: 'Ribeye Steak, Dessert', status: 'completed', time: '32 min ago', total: '₹3,600' },
    { id: 'MW-2843', table: '5', items: 'Burrata, Pasta, Wine', status: 'completed', time: '48 min ago', total: '₹4,100' },
  ]

  const statusColors: Record<string, string> = {
    preparing: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', background: '#111827', color: 'white', padding: '24px 16px', flexShrink: 0 }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>MENU WHISPER</h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>The Leela, Kovalam</p>
        </div>
        {[
          { label: '📊 Dashboard', href: '/' },
          { label: '📋 Orders', href: '/orders' },
          { label: '💬 Conversations', href: '/conversations' },
          { label: '🍽️ Menu', href: '/menu' },
          { label: '👥 Guests', href: '/guests' },
          { label: '📈 Analytics', href: '/analytics' },
          { label: '⚙️ Settings', href: '/settings' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              padding: '10px 12px',
              borderRadius: '8px',
              color: '#d1d5db',
              textDecoration: 'none',
              marginBottom: '4px',
              fontSize: '14px',
            }}
          >
            {item.label}
          </a>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Dashboard</h1>
              <p style={{ color: '#6b7280', marginTop: '4px' }}>The Leela, Kovalam</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '8px 16px', borderRadius: '8px' }}>
              <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
              <span style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>AI Concierge Live</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {stats.map((stat) => (
              <div key={stat.label} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }}>{stat.label}</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px' }}>{stat.value}</p>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '999px', background: '#f0fdf4', color: '#15803d' }}>{stat.change}</span>
              </div>
            ))}
          </div>

          {/* Orders Table */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Recent Orders</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Order ID', 'Table', 'Items', 'Status', 'Time', 'Amount'].map((h) => (
                    <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500' }}>#{order.id}</td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>Table {order.table}</td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{order.items}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '500' }}
                        className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>{order.time}</td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500' }}>{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

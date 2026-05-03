const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function getDashboardData() {
  // Mock data for now - replace with actual API call
  return {
    stats: {
      todayOrders: 127,
      revenue: '3.2L',
      avgOrderValue: '2,520',
      guestSatisfaction: 4.9
    },
    recentOrders: [
      {
        id: 'MW-2847',
        table_number: '12',
        items: [{ name: 'Lamb Rack' }, { name: 'Wine (Malbec)' }],
        status: 'preparing',
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        total: 4200
      },
      {
        id: 'MW-2846',
        table_number: '7',
        items: [{ name: 'Grilled Sea Bass' }, { name: 'Salad' }],
        status: 'confirmed',
        created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        total: 2800
      },
      {
        id: 'MW-2845',
        table_number: '3',
        items: [{ name: 'Tasting Menu (2 pax)' }],
        status: 'preparing',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        total: 8500
      },
      {
        id: 'MW-2844',
        table_number: '9',
        items: [{ name: 'Ribeye Steak' }, { name: 'Dessert' }],
        status: 'completed',
        created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        total: 3600
      },
      {
        id: 'MW-2843',
        table_number: '5',
        items: [{ name: 'Burrata' }, { name: 'Pasta' }, { name: 'Wine' }],
        status: 'completed',
        created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
        total: 4100
      }
    ]
  }
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  
  return response.json()
}

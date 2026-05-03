import { formatDistanceToNow } from 'date-fns'

interface Order {
  id: string
  table_number: string
  items: any[]
  status: string
  created_at: string
  total: number
}

interface OrdersTableProps {
  orders: Order[]
}

export default function OrdersTable({ orders }: OrdersTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium">#{order.id.slice(0, 8)}</td>
              <td className="px-6 py-4 text-sm">Table {order.table_number}</td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {order.items.map((item: any) => item.name).join(', ')}
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </td>
              <td className="px-6 py-4 text-sm font-medium">₹{order.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

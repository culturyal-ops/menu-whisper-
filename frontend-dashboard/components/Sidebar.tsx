'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Dashboard', icon: '📊', href: '/' },
    { label: 'Orders', icon: '📋', href: '/orders' },
    { label: 'Conversations', icon: '💬', href: '/conversations' },
    { label: 'Menu', icon: '🍽️', href: '/menu' },
    { label: 'Guests', icon: '👥', href: '/guests' },
    { label: 'Analytics', icon: '📈', href: '/analytics' },
    { label: 'Settings', icon: '⚙️', href: '/settings' },
    { label: 'Integrations', icon: '🔌', href: '/integrations' },
  ]

  return (
    <aside className="w-64 bg-dark text-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">MENU WHISPER</h1>
        <p className="text-sm text-gray-400 mt-1">The Leela, Kovalam</p>
      </div>

      <nav className="space-y-1">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Main</div>
        {navItems.slice(0, 3).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              pathname === item.href
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-6">Content</div>
        {navItems.slice(3, 6).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              pathname === item.href
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-6">System</div>
        {navItems.slice(6).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              pathname === item.href
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

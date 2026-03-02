import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Campaigns', icon: '📊' },
  { to: '/agent', label: 'AI Agent', icon: '🤖' },
  { to: '/bidding', label: 'Live Bidding', icon: '⚡' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
];

export default function Layout() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white tracking-tight">
            <span className="text-indigo-400">Ad</span>Pulse
          </h1>
          <p className="text-xs text-gray-500 mt-1">Real-Time Ad Platform</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-600">API: localhost:3001</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-950 p-6">
        <Outlet />
      </main>
    </div>
  );
}

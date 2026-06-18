import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Code2,
  CircleDollarSign,
  CheckSquare,
  CalendarClock,
  Calendar,
  Megaphone,
  GraduationCap,
  Settings2,
  X
} from 'lucide-react';

export default function Sidebar({ user, currentPage, setCurrentPage, onLogout, isOpen, onClose }) {
  const hasAccess = (moduleName) => {
    if (user.role === 'SuperAdmin') return true;
    const perms = user.permissions || {};
    return perms[moduleName]?.view === true;
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredModule: null },
    { id: 'sales', label: 'Sales Module', icon: TrendingUp, requiredModule: 'sales' },
    { id: 'development', label: 'Development', icon: Code2, requiredModule: 'development' },
    { id: 'accounts', label: 'Accounts', icon: CircleDollarSign, requiredModule: 'accounts' },
    { id: 'tasks', label: 'Work Tracking', icon: CheckSquare, requiredModule: 'development' },
    { id: 'attendance', label: 'Attendance', icon: CalendarClock, requiredModule: 'attendance' },
    { id: 'scheduler', label: 'Scheduler', icon: Calendar, requiredModule: 'scheduler' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, requiredModule: 'marketing' },
    { id: 'learning', label: 'Learning Tab', icon: GraduationCap, requiredModule: 'learning' },
    { id: 'settings', label: 'Settings', icon: Settings2, requiredModule: 'settings' }
  ];

  const handleNavClick = (id) => {
    setCurrentPage(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Overlay backdrop for mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`crm-sidebar ${isOpen ? 'mobile-open' : ''}`} style={{ position: 'relative' }}>
        {/* Mobile close button */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>

        <div className="sidebar-brand">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hyperwrike">
            <rect className="logo-bar" x="3" y="30" width="7" height="14" rx="2"/>
            <rect className="logo-bar" x="13" y="24" width="7" height="20" rx="2"/>
            <rect className="logo-bar" x="23" y="16" width="7" height="28" rx="2"/>
            <path className="logo-trend" d="M4 35 L41 10" strokeLinecap="round"/>
            <circle className="logo-node" cx="41.5" cy="9.5" r="4"/>
          </svg>
          <div className="brand-details">
            <h1>HyperCRM</h1>
            <span>Operations Portal</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-name" title={user.name}>{user.name}</div>
          <div className="user-role">
            {user.role === 'SuperAdmin' ? 'CEO / Root Admin' : (user.designation || user.role)}
          </div>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(item => {
            if (item.requiredModule && !hasAccess(item.requiredModule)) return null;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleNavClick(item.id)}
              >
                <Icon />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

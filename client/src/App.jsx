import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardHome from './components/DashboardHome';
import SalesModule from './components/SalesModule';
import DevelopmentModule from './components/DevelopmentModule';
import AccountsModule from './components/AccountsModule';
import WorkTrackingModule from './components/WorkTrackingModule';
import AttendanceModule from './components/AttendanceModule';
import SchedulerModule from './components/SchedulerModule';
import MarketingModule from './components/MarketingModule';
import LearningModule from './components/LearningModule';
import SettingsModule from './components/SettingsModule';
import { Bell, Plus, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  // Password Reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Toast feedback
  const [toast, setToast] = useState(null);

  // In-app notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Global Project Modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [modalClients, setModalClients] = useState([]);
  const [modalStaff, setModalStaff] = useState([]);
  const [projectForm, setProjectForm] = useState({
    name: '',
    client_id: '',
    current_phase: 'Phase 1: Setup',
    status: 'In Progress',
    target_go_live: '',
    start_date: new Date().toISOString().split('T')[0],
    pm_id: '',
    lead_dev_id: ''
  });

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check if token exists on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch notifications periodically
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(setNotifications)
      .catch(err => console.error(err));
  };

  // Fetch clients and staff when global project modal opens
  useEffect(() => {
    if (!showProjectModal) return;
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch('/api/clients', { headers })
      .then(res => res.json())
      .then(setModalClients);

    fetch('/api/users', { headers })
      .then(res => res.json())
      .then(data => setModalStaff(data.filter(u => u.role !== 'ClientPortal')));
  }, [showProjectModal]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setLoginError(data.error);
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          if (data.user.needsPasswordChange) {
            setUser(data.user);
            setShowPasswordReset(true);
          } else {
            setUser(data.user);
            showToast(`Logged in successfully. Welcome ${data.user.name}!`);
          }
        }
      })
      .catch(() => setLoginError('Server connection failed.'));
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Password reset complete. Operations unlocked.');
          setShowPasswordReset(false);
          // Update local session
          const updatedUser = { ...user, needsPasswordChange: false };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      });
  };

  const handleCreateProjectSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          showToast(data.error, 'error');
        } else {
          showToast('New Project successfully initialized');
          setShowProjectModal(false);
          setProjectForm({
            name: '',
            client_id: '',
            current_phase: 'Phase 1: Setup',
            status: 'In Progress',
            target_go_live: '',
            start_date: new Date().toISOString().split('T')[0],
            pm_id: '',
            lead_dev_id: ''
          });
          // Refresh current screen by reloading data or forcing state update
          if (currentPage === 'dashboard' || currentPage === 'development') {
            window.location.reload(); // Quick refresh to update tables
          }
        }
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('dashboard');
    setCredentials({ username: '', password: '' });
  };

  const handleMarkNotifRead = () => {
    const token = localStorage.getItem('token');
    fetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(() => {
        fetchNotifications();
        showToast('All notifications marked as read');
      });
  };

  const unreadCount = notifications.filter(n => n.read_status === 0).length;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardHome user={user} setCurrentPage={setCurrentPage} triggerAddProject={() => setShowProjectModal(true)} />;
      case 'sales':
        return <SalesModule user={user} showToast={showToast} triggerAddProject={() => setShowProjectModal(true)} />;
      case 'development':
        return <DevelopmentModule user={user} showToast={showToast} triggerAddProject={() => setShowProjectModal(true)} />;
      case 'accounts':
        return <AccountsModule user={user} showToast={showToast} />;
      case 'tasks':
        return <WorkTrackingModule user={user} showToast={showToast} />;
      case 'attendance':
        return <AttendanceModule user={user} showToast={showToast} />;
      case 'scheduler':
        return <SchedulerModule user={user} showToast={showToast} />;
      case 'marketing':
        return <MarketingModule user={user} showToast={showToast} />;
      case 'learning':
        return <LearningModule user={user} showToast={showToast} />;
      case 'settings':
        return <SettingsModule user={user} showToast={showToast} />;
      default:
        return <DashboardHome user={user} setCurrentPage={setCurrentPage} triggerAddProject={() => setShowProjectModal(true)} />;
    }
  };

  const getPageTitle = () => {
    const mappings = {
      dashboard: 'HyperCRM Dashboard',
      sales: 'Sales & Client Tracking',
      development: 'Client Delivery & Projects',
      accounts: 'Financial Ledger & Accounts',
      tasks: 'Work Task Engine Board',
      attendance: 'Attendance Console',
      scheduler: 'Calendar Meeting Scheduler',
      marketing: 'Marketing Content Engine',
      learning: 'Skill Development Tab',
      settings: 'Operational Settings'
    };
    return mappings[currentPage] || 'HyperCRM';
  };

  const isClient = user?.role === 'ClientPortal';
  const hasProjectWritePermission = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.designation === 'Project Manager' || user.permissions?.development?.create === true);

  // --- RENDER PORTALS ---
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect className="logo-bar" x="3" y="30" width="7" height="14" rx="2" fill="#15203A"/>
              <rect className="logo-bar" x="13" y="24" width="7" height="20" rx="2" fill="#15203A"/>
              <rect className="logo-bar" x="23" y="16" width="7" height="28" rx="2" fill="#15203A"/>
              <path className="logo-trend" d="M4 35 L41 10" stroke="#A6E635" strokeWidth="2.8" strokeLinecap="round"/>
              <circle className="logo-node" cx="41.5" cy="9.5" r="4" fill="#A6E635"/>
            </svg>
            <h2>HyperCRM</h2>
            <p>AI Voice &amp; Automation solutions</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Peri"
                value={credentials.username} 
                onChange={e => setCredentials({...credentials, username: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={credentials.password} 
                onChange={e => setCredentials({...credentials, password: e.target.value})} 
              />
            </div>
            {loginError && <p style={{ color: 'var(--alert)', fontSize: '12px', marginBottom: '15px' }}>{loginError}</p>}
            <button className="btn primary" style={{ width: '100%', padding: '12px' }}>Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-layout">
      {/* Sidebar Menu */}
      <Sidebar 
        user={user} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onLogout={handleLogout} 
      />

      {/* Main Container */}
      <main className="crm-main">
        {/* Nav header */}
        <header className="crm-navbar">
          <div className="navbar-title">{getPageTitle()}</div>
          <div className="navbar-actions">
            
            {/* Global Project Creator Button (Visible Everywhere) */}
            {!isClient && hasProjectWritePermission && (
              <button 
                className="btn primary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setShowProjectModal(true)}
              >
                <Plus size={14} /> New Project
              </button>
            )}

            {/* Notification Bell Dropdown */}
            <div className="notification-bell" onClick={() => setShowNotifPanel(!showNotifPanel)}>
              <Bell />
              {unreadCount > 0 && <span className="bell-badge"></span>}

              {showNotifPanel && (
                <div className="notification-panel" onClick={e => e.stopPropagation()}>
                  <div className="panel-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && <button onClick={handleMarkNotifRead}>Mark all as read</button>}
                  </div>
                  <div className="notification-list">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`notification-item ${notif.read_status === 0 ? 'unread' : ''}`}>
                        <div>{notif.message}</div>
                        <div className="time">{new Date(notif.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="empty-notif">No new alerts.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Logged as: <strong style={{ color: 'var(--text-main)' }}>{user.name}</strong>
            </div>
          </div>
        </header>

        {/* Content Page viewport */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderPage()}
        </div>
      </main>

      {/* Toast popup */}
      {toast && (
        <div className={`toast-msg ${toast.type === 'error' ? 'error' : ''}`}>
          {toast.message}
        </div>
      )}

      {/* FORCE PASSWORD RESET MODAL */}
      {showPasswordReset && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '380px' }}>
            <div className="modal-title" style={{ color: 'var(--gold-bright)' }}>🔒 First Login Password Reset Required</div>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className="form-group">
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '15px', lineHeight: '1.45' }}>
                  Hi Peri! You are logging in using the root seed credentials for the first time. For security, please define a new password to unlock your SuperAdmin operations.
                </p>
                <label>Define New Password</label>
                <input 
                  type="password" 
                  required 
                  minLength="6"
                  placeholder="Minimum 6 characters" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} 
                />
              </div>
              <button className="btn gold" style={{ width: '100%' }}>Update Password &amp; Unlock CRM</button>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL CREATE PROJECT MODAL (ACCESSIBLE EVERYWHERE) */}
      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--lime-bright)' }}>
                Initialize New Client Project
              </h3>
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setShowProjectModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProjectSubmit}>
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. AI Appointment Booking telephonics"
                  value={projectForm.name} 
                  onChange={e => setProjectForm({...projectForm, name: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label>Link Client Account</label>
                <select 
                  required
                  value={projectForm.client_id}
                  onChange={e => setProjectForm({...projectForm, client_id: e.target.value})}
                >
                  <option value="">Select client company...</option>
                  {modalClients.map(c => (
                    <option key={c.id} value={c.id}>{c.company} ({c.name})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Current Phase</label>
                  <input 
                    type="text" 
                    value={projectForm.current_phase} 
                    onChange={e => setProjectForm({...projectForm, current_phase: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={projectForm.status} 
                    onChange={e => setProjectForm({...projectForm, status: e.target.value})}
                  >
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Blocked</option>
                    <option>Done</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    value={projectForm.start_date} 
                    onChange={e => setProjectForm({...projectForm, start_date: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Target Go-Live</label>
                  <input 
                    type="date" 
                    required
                    value={projectForm.target_go_live} 
                    onChange={e => setProjectForm({...projectForm, target_go_live: e.target.value})} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Project Manager (PM)</label>
                  <select 
                    required
                    value={projectForm.pm_id}
                    onChange={e => setProjectForm({...projectForm, pm_id: e.target.value})}
                  >
                    <option value="">Select PM...</option>
                    {modalStaff.filter(u => u.designation === 'Project Manager' || u.role === 'SuperAdmin').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Lead Developer</label>
                  <select 
                    required
                    value={projectForm.lead_dev_id}
                    onChange={e => setProjectForm({...projectForm, lead_dev_id: e.target.value})}
                  >
                    <option value="">Select Lead...</option>
                    {modalStaff.filter(u => u.designation === 'Lead Developer' || u.designation === 'Junior Developer').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setShowProjectModal(false)}>
                  Cancel
                </button>
                <button className="btn primary">
                  Initialize Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

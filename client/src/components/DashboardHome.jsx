import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  Clock, 
  BookOpen, 
  FileText, 
  Activity, 
  CheckCircle2,
  Plus
} from 'lucide-react';

export default function DashboardHome({ user, setCurrentPage, triggerAddProject }) {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    todayExpenses: 0,
    activeClients: 0,
    salesCount: 0,
    openIssues: 0,
    upcomingMeetingsCount: 0,
    attendanceToday: 'Present'
  });

  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clientData, setClientData] = useState(null);

  // Dynamic states for leads, client documents, and approvals
  const [leads, setLeads] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch projects
    fetch('/api/projects', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setProjects(data);
        if (user.role === 'ClientPortal' && data.length > 0) {
          setClientData(data[0]);
        }
      });

    // Fetch meetings
    fetch('/api/meetings', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const today = new Date().toISOString().split('T')[0];
        const todayMeetings = data.filter(m => m.datetime.startsWith(today));
        setMeetings(todayMeetings.slice(0, 5));
        
        setStats(prev => ({
          ...prev,
          upcomingMeetingsCount: data.filter(m => new Date(m.datetime) >= new Date()).length
        }));
      });

    // Fetch tasks
    fetch('/api/tasks', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const active = data.filter(t => t.status !== 'Done');
        setTasks(active.slice(0, 5));
        
        const pendingCount = data.filter(t => t.approved === 0).length;
        setPendingApprovalsCount(pendingCount);
      });

    // Fetch documents for Client
    if (user.role === 'ClientPortal') {
      fetch('/api/documents', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(setDocuments);
    }

    // Fetch leads for Sales or Admin
    if (user.department === 'Sales' || user.role === 'SuperAdmin' || user.role === 'Admin') {
      fetch('/api/leads', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          setLeads(data);
          
          const closedDeals = data.filter(l => l.status === 'Converted').length;
          setStats(prev => ({
            ...prev,
            salesCount: closedDeals
          }));
        });
    }

    // Load financial and user count stats if Admin/SuperAdmin
    if (user.role === 'SuperAdmin' || user.role === 'Admin') {
      Promise.all([
        fetch('/api/revenue', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/expenses', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/clients', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/tasks', { headers }).then(r => r.ok ? r.json() : [])
      ]).then(([revList, expList, clientsList, taskList]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const todayRev = (revList || []).filter(r => r.date === todayStr).reduce((sum, r) => sum + r.amount, 0);
        const monthRev = (revList || []).reduce((sum, r) => sum + r.amount, 0);
        const totalExp = (expList || []).reduce((sum, e) => sum + e.amount, 0);
        
        const openBugs = (taskList || []).filter(t => t.status !== 'Done' && t.priority === 'Critical').length;

        // Group revenue by last 3 months
        const now = new Date();
        const chartData = [];
        for (let i = 2; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          chartData.push({
            name: d.toLocaleString('en-US', { month: 'long' }),
            monthNum: d.getMonth(),
            yearNum: d.getFullYear(),
            amount: 0
          });
        }
        
        (revList || []).forEach(r => {
          if (!r.date) return;
          const rd = new Date(r.date);
          const rm = rd.getMonth();
          const ry = rd.getFullYear();
          const mObj = chartData.find(m => m.monthNum === rm && m.yearNum === ry);
          if (mObj) {
            mObj.amount += r.amount;
          }
        });
        setMonthlyRevenueData(chartData);

        setStats(prev => ({
          ...prev,
          todayRevenue: todayRev,
          monthRevenue: monthRev,
          todayExpenses: totalExp,
          activeClients: (clientsList || []).length,
          openIssues: openBugs,
        }));
      }).catch(err => console.error(err));
    }
  }, [user]);

  // Format currency values helper
  const fmt = (val) => {
    return val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  };

  // --- 1. ROOT / ADMIN DASHBOARD ---
  const renderAdminDashboard = () => (
    <div>
      {/* Metric Cards Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Month Revenue</span>
          <div className="metric-value">{fmt(stats.monthRevenue)}</div>
          <div className="metric-diff positive">
            <TrendingUp size={14} />
            <span>Live system revenue</span>
          </div>
        </div>

        <div className="metric-card gold">
          <span className="metric-label">Operational Expenses</span>
          <div className="metric-value">{fmt(stats.todayExpenses)}</div>
          <div className="metric-diff negative">
            <span>Aggregated payroll &amp; tools</span>
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Net Profit</span>
          <div className="metric-value" style={{ color: 'var(--lime-bright)' }}>
            {fmt(stats.monthRevenue - stats.todayExpenses)}
          </div>
          <div className="metric-diff positive">
            <TrendingUp size={14} />
            <span>Profit Margin: {Math.max(0, Math.round(((stats.monthRevenue - stats.todayExpenses) / (stats.monthRevenue || 1)) * 100))}%</span>
          </div>
        </div>

        <div className="metric-card gold">
          <span className="metric-label">Active Clients</span>
          <div className="metric-value">{stats.activeClients}</div>
          <div className="metric-diff positive">
            <span>Global accounts ledger</span>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* CSS Chart and Projects list */}
        <div className="panel-card">
          <div className="panel-card-title">Revenue &amp; Profit Trends</div>
          <div style={{ display: 'flex', gap: '30px', height: '180px', alignItems: 'flex-end', padding: '15px 0' }}>
            {monthlyRevenueData.map((m, idx) => {
              const maxAmount = Math.max(...monthlyRevenueData.map(d => d.amount), 1);
              const pctHeight = Math.max(10, Math.round((m.amount / maxAmount) * 100));
              const isCurrent = idx === monthlyRevenueData.length - 1;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{ 
                    width: '35px', 
                    height: `${pctHeight}%`, 
                    backgroundColor: isCurrent ? 'var(--lime-bright)' : 'rgba(166, 230, 53, 0.4)', 
                    borderRadius: '4px 4px 0 0',
                    position: 'relative'
                  }}>
                    {m.amount > 0 && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '-20px', 
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '9.5px', 
                        color: 'var(--lime-bright)',
                        whiteSpace: 'nowrap'
                      }}>{fmt(m.amount)}</div>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    marginTop: '6px', 
                    color: isCurrent ? 'var(--lime-bright)' : 'var(--text-muted)',
                    fontWeight: isCurrent ? 600 : 400
                  }}>{m.name}</span>
                </div>
              );
            })}
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <div className="panel-card-title" style={{ fontSize: '12.5px', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Active Delivery Status</span>
              {user.role !== 'ClientPortal' && (
                <button className="btn primary" style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={triggerAddProject}>
                  <Plus size={12} /> New Project
                </button>
              )}
            </div>
            <div className="crm-table-wrapper">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>PM</th>
                    <th>Timeline Phase</th>
                    <th>Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length > 0 ? projects.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.pm_name || 'Karthik PM'}</td>
                      <td><span className="badge warning">{p.current_phase || 'Phase 1'}</span></td>
                      <td className="mono">{p.progress_percent || 0}%</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No active projects recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel-card" style={{ margin: 0 }}>
            <div className="panel-card-title gold">Today's Schedule</div>
            {meetings.length > 0 ? meetings.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <Clock size={16} style={{ color: 'var(--gold-bright)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{m.title}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {new Date(m.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({m.duration} mins)
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '20px 0', textSelf: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                No meetings scheduled for today.
              </div>
            )}
          </div>
          
          <div className="panel-card" style={{ margin: 0 }}>
            <div className="panel-card-title">Critical System Alerts</div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: stats.openIssues > 0 ? '#ff5274' : 'var(--lime-bright)' }}>
              <AlertCircle size={20} />
              <div style={{ fontSize: '13px' }}>
                {stats.openIssues > 0 ? `${stats.openIssues} Critical Escalation Triggered` : 'All project deliverables on track.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- 2. SALES TEAM DASHBOARD ---
  const renderSalesDashboard = () => {
    const activeLeadsCount = leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;
    const closedDealsCount = leads.filter(l => l.status === 'Converted').length;

    const getMainLeadChannel = () => {
      if (leads.length === 0) return '—';
      const channels = {};
      leads.forEach(l => {
        if (l.channel) {
          channels[l.channel] = (channels[l.channel] || 0) + 1;
        }
      });
      let maxChan = '—';
      let maxVal = -1;
      Object.entries(channels).forEach(([chan, val]) => {
        if (val > maxVal) {
          maxChan = chan;
          maxVal = val;
        }
      });
      return maxChan;
    };

    const mainChannel = getMainLeadChannel();

    return (
      <div>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Deals Closed (Month)</span>
            <div className="metric-value">{closedDealsCount.toString().padStart(2, '0')}</div>
            <div className="metric-diff positive">
              <span>Closed status leads</span>
            </div>
          </div>
          <div className="metric-card gold">
            <span className="metric-label">Leads Active</span>
            <div className="metric-value">{activeLeadsCount.toString().padStart(2, '0')}</div>
            <div className="metric-diff positive">
              <span>Leads requiring follow-up</span>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Main Lead Channel</span>
            <div className="metric-value" style={{ fontSize: '18px', fontFamily: 'var(--font-label)', textTransform: 'uppercase', height: '39px', display: 'flex', alignItems: 'center' }}>
              {mainChannel}
            </div>
            <div className="metric-diff positive">
              <span>Highest volume channel</span>
            </div>
          </div>
        </div>

        <div className="dashboard-row">
          <div className="panel-card">
            <div className="panel-card-title">Lead Pipeline &amp; Activity Log</div>
            <div className="crm-table-wrapper">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Lead Name</th>
                    <th>Source Channel</th>
                    <th>Follow Up Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length > 0 ? leads.map(l => (
                    <tr key={l.id}>
                      <td>{l.name} {l.business_name ? `(${l.business_name})` : ''}</td>
                      <td className="mono" style={{ textTransform: 'capitalize' }}>{l.channel}</td>
                      <td className="mono">{l.follow_up_date || '—'}</td>
                      <td>
                        <span className={`badge ${l.status === 'New' ? 'info' : l.status === 'Converted' ? 'success' : 'warning'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0' }}>No active leads in pipeline.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <button className="btn primary" style={{ marginTop: '20px' }} onClick={() => setCurrentPage('sales')}>
              Open Sales Module
            </button>
          </div>
          
          <div className="panel-card">
            <div className="panel-card-title gold">Doc-Gen Quick Actions</div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '15px' }}>
              Generate Proposals, Contracts, or Scope of Work documents immediately using raw client descriptions.
            </p>
            <button className="btn gold" onClick={() => setCurrentPage('sales')}>
              + Generate Documents
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- 3. DEVELOPMENT / PM DASHBOARD ---
  const renderDevDashboard = () => (
    <div>
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Assigned Projects</span>
          <div className="metric-value">{projects.length}</div>
        </div>
        <div className="metric-card gold">
          <span className="metric-label">My Active Tasks</span>
          <div className="metric-value">{tasks.length}</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Team Task Approvals Pending</span>
          <div className="metric-value" style={{ color: 'var(--gold-bright)' }}>{pendingApprovalsCount.toString().padStart(2, '0')}</div>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="panel-card">
          <div className="panel-card-title">My Tasks Checklist</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justify: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="checkbox" style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Project: {t.project_name}</div>
                  </div>
                </div>
                <span className={`badge ${t.priority === 'High' || t.priority === 'Critical' ? 'danger' : 'warning'}`}>{t.priority}</span>
              </div>
            ))}
            {tasks.length === 0 && (
              <div style={{ padding: '20px 0', color: 'var(--text-dim)', textAlign: 'center' }}>
                You have no outstanding tasks!
              </div>
            )}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-title gold">Group Chat &amp; Discussions</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Collaborate with your project team, PMs, and designers in project-scoped chat channels.
          </p>
          <button className="btn secondary" onClick={() => setCurrentPage('development')}>
            Go to Project Rooms
          </button>
        </div>
      </div>
    </div>
  );

  // --- 4. CLIENT PORTAL DASHBOARD ---
  const renderClientDashboard = () => (
    <div>
      <div className="panel-card">
        <div className="panel-card-title">Project Delivery Status: {clientData?.name || 'My Project'}</div>
        
        {clientData ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span>Overall Completion Progress</span>
              <span className="mono" style={{ color: 'var(--lime-bright)', fontWeight: 600 }}>{clientData.progress_percent}%</span>
            </div>
            
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden', marginBottom: '25px' }}>
              <div style={{ width: `${clientData.progress_percent}%`, height: '100%', backgroundColor: 'var(--lime-bright)' }}></div>
            </div>

            <div className="metrics-grid" style={{ marginBottom: '25px' }}>
              <div className="metric-card">
                <span className="metric-label">Current Phase</span>
                <div className="metric-value" style={{ fontSize: '16px', fontFamily: 'var(--font-label)', margin: '10px 0' }}>
                  {clientData.current_phase || 'Environment Setup'}
                </div>
              </div>
              <div className="metric-card gold">
                <span className="metric-label">Target Go-Live</span>
                <div className="metric-value" style={{ fontSize: '16px', fontFamily: 'var(--font-mono)', margin: '10px 0' }}>
                  {clientData.target_go_live || '—'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px 0', textSelf: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
            No active project logged for this account.
          </div>
        )}
      </div>

      <div className="dashboard-row">
        <div className="panel-card">
          <div className="panel-card-title">My Documents Archive</div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Access all generated invoices, contracts, proposals, and scope of work documents.
          </p>
          
          <div className="crm-table-wrapper">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Doc Type</th>
                  <th>Reference Number</th>
                  <th>Issued Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.length > 0 ? documents.map(d => (
                  <tr key={d.id}>
                    <td style={{ textTransform: 'capitalize' }}>{d.type}</td>
                    <td className="mono">{d.reference_no}</td>
                    <td className="mono">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <button className="btn secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setCurrentPage('sales')}>
                        View / Print
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0' }}>No documents archived.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-title gold">Support &amp; Inquiries</div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Need adjustments to your product scope, or have questions about operational logs?
            <br /><br />
            Contact us at:
            <br />
            <a href="mailto:hello@hyperwrike.com" style={{ fontWeight: 600 }}>hello@hyperwrike.com</a>
          </p>
        </div>
      </div>
    </div>
  );

  // Selector mapping
  const renderBody = () => {
    switch (user.role) {
      case 'SuperAdmin':
      case 'Admin':
        return renderAdminDashboard();
      case 'ClientPortal':
        return renderClientDashboard();
      default:
        // PM, Lead dev, junior dev, sales exec, marketing
        if (user.department === 'Sales') {
          return renderSalesDashboard();
        } else {
          return renderDevDashboard();
        }
    }
  };

  return (
    <div className="crm-page-container">
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800 }}>
          Welcome back, {user.name}!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          HyperCRM operations console. System is fully operational.
        </p>
      </div>
      
      {renderBody()}
    </div>
  );
}

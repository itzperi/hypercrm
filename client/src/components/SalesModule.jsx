import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  UserPlus, 
  Search, 
  AlertCircle, 
  Send, 
  Zap,
  Calendar,
  CheckSquare,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import DocumentGenerator from './DocumentGenerator';

export default function SalesModule({ user, showToast, triggerAddProject }) {
  const [activeTab, setActiveTab] = useState('revenue');
  
  // States
  const [revenue, setRevenue] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Editing states
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editingLead, setEditingLead] = useState(null);

  // Document Generator state
  const [activeDocData, setActiveDocData] = useState(null);

  // Form inputs
  const [briefText, setBriefText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

  // Revenue form
  const [revForm, setRevForm] = useState({ amount: '', date: '', client_id: '', payment_method: 'Bank Transfer', invoice_ref: '', source: 'recurring' });
  // Expense form
  const [expForm, setExpForm] = useState({ amount: '', date: '', category: 'tools/software', paid_to: '' });
  // Client form
  const [clientForm, setClientForm] = useState({ name: '', company: '', country: 'India', status: 'Lead', account_owner_id: '', address: '', setup_fee: '', recurring_fee: '', contract_ref: '', start_date: '' });
  // Lead form
  const [leadForm, setLeadForm] = useState({ name: '', business_name: '', email: '', phone: '', channel: 'referral', follow_up_date: '', owner_id: '' });
  // Lead Log action
  const [selectedLeadForLog, setSelectedLeadForLog] = useState(null);
  const [activityInput, setActivityInput] = useState({ outcome: 'spoke today', action: '', next_follow_up: '' });

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    fetch('/api/revenue', { headers }).then(res => res.ok ? res.json() : []).then(data => setRevenue(Array.isArray(data) ? data : []));
    fetch('/api/expenses', { headers }).then(res => res.ok ? res.json() : []).then(data => setExpenses(Array.isArray(data) ? data : []));
    fetch('/api/clients', { headers }).then(res => res.ok ? res.json() : []).then(data => setClients(Array.isArray(data) ? data : []));
    fetch('/api/leads', { headers }).then(res => res.ok ? res.json() : []).then(data => setLeads(Array.isArray(data) ? data : []));
    fetch('/api/users', { headers }).then(res => res.ok ? res.json() : []).then(data => setEmployees(Array.isArray(data) ? data.filter(u => u.role !== 'ClientPortal') : []));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute rollups
  const totalRevVal = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalExpVal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevVal - totalExpVal;

  const fmt = (val) => {
    const isNegative = val < 0;
    const formatted = Math.abs(val).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    return `${isNegative ? '-' : ''}${formatted}`;
  };

  const handleRevenueSubmit = (e) => {
    e.preventDefault();
    fetch('/api/revenue', {
      method: 'POST',
      headers,
      body: JSON.stringify(revForm)
    }).then(res => res.json()).then(data => {
      if (data.error) showToast(data.error, 'error');
      else {
        showToast('Revenue recorded successfully');
        loadData();
        setRevForm({ amount: '', date: '', client_id: '', payment_method: 'Bank Transfer', invoice_ref: '', source: 'recurring' });
      }
    });
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    fetch('/api/expenses', {
      method: 'POST',
      headers,
      body: JSON.stringify(expForm)
    }).then(res => res.json()).then(data => {
      if (data.error) showToast(data.error, 'error');
      else {
        showToast('Expense recorded successfully');
        loadData();
        setExpForm({ amount: '', date: '', category: 'tools/software', paid_to: '' });
      }
    });
  };

  const handleClientSubmit = (e) => {
    e.preventDefault();
    fetch('/api/clients', {
      method: 'POST',
      headers,
      body: JSON.stringify(clientForm)
    }).then(res => res.json()).then(data => {
      if (data.error) showToast(data.error, 'error');
      else {
        showToast(`Client created! Username: ${data.portalUsername}, Password: ${data.portalPassword}`);
        loadData();
        setClientForm({ name: '', company: '', country: 'India', status: 'Lead', account_owner_id: '', address: '', setup_fee: '', recurring_fee: '', contract_ref: '', start_date: '' });
      }
    });
  };

  const handleLeadSubmit = (e) => {
    e.preventDefault();
    fetch('/api/leads', {
      method: 'POST',
      headers,
      body: JSON.stringify(leadForm)
    }).then(res => res.json()).then(data => {
      if (data.error) showToast(data.error, 'error');
      else {
        showToast('New lead created');
        loadData();
        setLeadForm({ name: '', business_name: '', email: '', phone: '', channel: 'referral', follow_up_date: '', owner_id: '' });
      }
    });
  };

  const handleDeleteRevenue = (id) => {
    if (!window.confirm("Delete this revenue entry?")) return;
    fetch(`/api/revenue/${id}`, { method: 'DELETE', headers })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Revenue record deleted");
          loadData();
        }
      });
  };

  const handleEditRevenueSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/revenue/${editingRevenue.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingRevenue)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Revenue record updated");
          setEditingRevenue(null);
          loadData();
        }
      });
  };

  const handleDeleteExpense = (id) => {
    if (!window.confirm("Delete this expense entry?")) return;
    fetch(`/api/expenses/${id}`, { method: 'DELETE', headers })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Expense record deleted");
          loadData();
        }
      });
  };

  const handleEditExpenseSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/expenses/${editingExpense.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingExpense)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Expense record updated");
          setEditingExpense(null);
          loadData();
        }
      });
  };

  const handleDeleteClient = (id) => {
    if (!window.confirm("Delete this client and their portal user?")) return;
    fetch(`/api/clients/${id}`, { method: 'DELETE', headers })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Client deleted successfully");
          loadData();
        }
      });
  };

  const handleEditClientSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/clients/${editingClient.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingClient)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Client details updated");
          setEditingClient(null);
          loadData();
        }
      });
  };

  const handleDeleteLead = (id) => {
    if (!window.confirm("Delete this lead?")) return;
    fetch(`/api/leads/${id}`, { method: 'DELETE', headers })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Lead deleted");
          loadData();
        }
      });
  };

  const handleEditLeadSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/leads/${editingLead.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingLead)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Lead details updated");
          setEditingLead(null);
          loadData();
        }
      });
  };

  const handleLeadLogSubmit = (e) => {
    e.preventDefault();
    const updatedLogs = [...(selectedLeadForLog.activity_log || []), {
      date: new Date().toISOString().split('T')[0],
      ...activityInput
    }];
    
    // Update lead status if outcome converted
    let updatedStatus = selectedLeadForLog.status;
    if (activityInput.outcome === 'converted') {
      updatedStatus = 'Converted';
      // Auto-insert into clients list
      fetch('/api/clients', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: selectedLeadForLog.name,
          company: selectedLeadForLog.business_name,
          country: 'India',
          status: 'Lead',
          account_owner_id: selectedLeadForLog.owner_id
        })
      });
    } else if (activityInput.outcome === 'lost') {
      updatedStatus = 'Lost';
    }

    fetch(`/api/leads/${selectedLeadForLog.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...selectedLeadForLog,
        status: updatedStatus,
        follow_up_date: activityInput.next_follow_up || selectedLeadForLog.follow_up_date,
        activity_log: updatedLogs
      })
    }).then(res => res.json()).then(data => {
      if (data.error) showToast(data.error, 'error');
      else {
        showToast('Lead activity log added');
        loadData();
        setSelectedLeadForLog(null);
      }
    });
  };

  const handleExtractBrief = () => {
    if (!briefText.trim()) return;
    setParsing(true);
    fetch('/api/ai/extract', {
      method: 'POST',
      headers,
      body: JSON.stringify({ briefText })
    })
      .then(res => res.json())
      .then(data => {
        setParsing(false);
        if (data.error) showToast(data.error, 'error');
        else {
          setParsedResult(data);
          showToast('Text parsed successfully!');
        }
      })
      .catch(() => {
        setParsing(false);
        showToast('Text extraction failed', 'error');
      });
  };

  const handleOpenDocGenerator = () => {
    if (!parsedResult) return;
    
    // Formulate variables matching App.jsx expected format in propgen
    const initialCode = parsedResult.clientName.substring(0,3).toUpperCase();
    const currentYear = new Date().getFullYear();
    const formatted = {
      client: {
        name: parsedResult.clientName,
        company: parsedResult.businessType,
        address: parsedResult.complianceNotes,
        gstin: '',
        logoDataUrl: ''
      },
      project: {
        title: parsedResult.products.join(' + '),
        overview: briefText,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        validDays: '15',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      deliverables: parsedResult.deliverables || [''],
      timeline: parsedResult.phasedRollout || [{ phase: 'Phase 1', detail: 'General Scope' }],
      lineItems: [
        { desc: 'AI Platform Implementation (Setup)', qty: 1, rate: parsedResult.setupFee },
        { desc: `${parsedResult.products.join(' + ')} Monthly Operation`, qty: 1, rate: parsedResult.monthlyFee }
      ],
      commercials: {
        currency: parsedResult.currency || '$',
        gstEnabled: parsedResult.currency === '₹',
        gstRate: '18',
        advancePct: '50',
        paymentNote: `Governed by ${parsedResult.governingLaw}. Setup fee due upfront, recurring maintenance at ${parsedResult.monthlyFee}/month.`,
        showPricing: true
      },
      contract: {
        term: '12 months',
        noticeDays: parsedResult.cancellationTerms.match(/\d+/) ? parsedResult.cancellationTerms.match(/\d+/)[0] : '30',
        latePct: '1.5',
        governingLaw: parsedResult.governingLaw,
        jurisdiction: parsedResult.governingLaw
      }
    };

    setActiveDocData(formatted);
  };

  if (activeDocData) {
    return (
      <div className="crm-page-container">
        <button className="btn secondary" style={{ marginBottom: '15px' }} onClick={() => {
          setActiveDocData(null);
          setBriefText('');
          setParsedResult(null);
        }}>
          &larr; Back to Sales Module
        </button>
        <DocumentGenerator initialData={activeDocData} user={user} showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="crm-page-container">
      <div className="crm-tabs">
        <button className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>Ledger &amp; Financials</button>
        <button className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')}>Client Tracking</button>
        <button className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`} onClick={() => setActiveTab('leads')}>Leads Pipeline</button>
        <button className={`tab-btn ${activeTab === 'docgen' ? 'active' : ''}`} onClick={() => setActiveTab('docgen')}>AI Document Auto-Gen</button>
      </div>

      {/* --- TAB: LEDGER --- */}
      {activeTab === 'revenue' && (
        <div>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Total Revenue</span>
              <div className="metric-value" style={{ color: 'var(--lime-bright)' }}>{fmt(totalRevVal)}</div>
            </div>
            <div className="metric-card gold">
              <span className="metric-label">Total Expenses</span>
              <div className="metric-value" style={{ color: 'var(--alert)' }}>{fmt(-totalExpVal)}</div>
            </div>
            <div className="metric-card">
              <span className="metric-label">Net Operating P&amp;L</span>
              <div className="metric-value" style={{ color: netProfit >= 0 ? 'var(--lime-bright)' : 'var(--alert)' }}>
                {fmt(netProfit)}
              </div>
            </div>
          </div>

          <div className="dashboard-row">
            <div>
              <div className="panel-card">
                <div className="panel-card-title">Daily Revenue Log</div>
                <div className="crm-table-wrapper" style={{ maxHeight: '250px' }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Invoice Ref</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.map(r => (
                        <tr key={r.id}>
                          <td className="mono">{r.date}</td>
                          <td>{r.client_company || 'Direct'}</td>
                          <td className="mono">{r.invoice_ref || '—'}</td>
                          <td>{r.payment_method}</td>
                          <td className="amount">{fmt(r.amount)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn secondary" style={{ padding: '2px 6px' }} onClick={() => setEditingRevenue(r)}>
                                <Edit size={12} />
                              </button>
                              <button className="btn danger" style={{ padding: '2px 6px' }} onClick={() => handleDeleteRevenue(r.id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-card-title gold">Expense Entries Log</div>
                <div className="crm-table-wrapper" style={{ maxHeight: '250px' }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Paid To</th>
                        <th>Recorded By</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(e => (
                        <tr key={e.id}>
                          <td className="mono">{e.date}</td>
                          <td><span className="badge warning">{e.category}</span></td>
                          <td>{e.paid_to}</td>
                          <td>{e.recorder_name}</td>
                          <td className="amount" style={{ color: 'var(--alert)' }}>{fmt(-e.amount)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn secondary" style={{ padding: '2px 6px' }} onClick={() => setEditingExpense(e)}>
                                <Edit size={12} />
                              </button>
                              <button className="btn danger" style={{ padding: '2px 6px' }} onClick={() => handleDeleteExpense(e.id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <div className="panel-card">
                <div className="panel-card-title">Log Daily Revenue</div>
                <form onSubmit={handleRevenueSubmit}>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" required value={revForm.amount} onChange={e => setRevForm({...revForm, amount: parseFloat(e.target.value)})} min="0" step="any" />
                  </div>
                  <div className="form-group">
                    <label>Payment Date</label>
                    <input type="date" required value={revForm.date} onChange={e => setRevForm({...revForm, date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Client Reference</label>
                    <select value={revForm.client_id} onChange={e => setRevForm({...revForm, client_id: e.target.value})}>
                      <option value="">No Client (Direct Sale)</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company} ({c.name})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={revForm.payment_method} onChange={e => setRevForm({...revForm, payment_method: e.target.value})}>
                      <option>Bank Transfer</option>
                      <option>Stripe</option>
                      <option>UPI</option>
                      <option>Cash</option>
                    </select>
                  </div>
                  <button className="btn primary" style={{ width: '100%' }}>Log Revenue</button>
                </form>
              </div>

              <div className="panel-card">
                <div className="panel-card-title gold">Log Operational Expense</div>
                <form onSubmit={handleExpenseSubmit}>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" required value={expForm.amount} onChange={e => setExpForm({...expForm, amount: parseFloat(e.target.value)})} min="0" step="any" />
                  </div>
                  <div className="form-group">
                    <label>Date Paid</label>
                    <input type="date" required value={expForm.date} onChange={e => setExpForm({...expForm, date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value})}>
                      <option value="salary">Salary Payment</option>
                      <option value="tools/software">Tools &amp; Software</option>
                      <option value="hosting">Hosting/Server Infra</option>
                      <option value="marketing spend">Marketing Spend</option>
                      <option value="office">Office &amp; Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Paid To / Vendor</label>
                    <input type="text" value={expForm.paid_to} onChange={e => setExpForm({...expForm, paid_to: e.target.value})} />
                  </div>
                  <button className="btn gold" style={{ width: '100%' }}>Log Expense</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: CLIENT TRACKING --- */}
      {activeTab === 'clients' && (
        <div className="dashboard-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="panel-card">
              <div className="panel-card-title">Active Clients Matrix</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {clients.map(c => (
                  <div key={c.id} className="kanban-card" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="user-name" style={{ fontSize: '15px' }}>{c.company}</span>
                      <span className={`badge ${c.health === 'on-track' ? 'success' : 'danger'}`}>{c.health}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12.5px' }}>
                      <strong>Contact:</strong> {c.name} · {c.country}
                    </p>
                    <div style={{ margin: '8px 0', borderBottom: '1.5px solid rgba(255,255,255,0.03)' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Setup: {fmt(c.setup_fee)}</span>
                      <span>Recurring: {fmt(c.recurring_fee)}/mo</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginTop: '6px', color: 'var(--lime-bright)' }}>
                      <span>SOW: {c.contract_ref || 'HW-CC-PRM'}</span>
                      <span>Start: {c.start_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                      <button className="btn secondary" style={{ padding: '2px 6px' }} onClick={() => setEditingClient(c)}>
                        <Edit size={11} />
                      </button>
                      <button className="btn danger" style={{ padding: '2px 6px' }} onClick={() => handleDeleteClient(c.id)}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="panel-card">
              <div className="panel-card-title gold">Add Client Account</div>
              <form onSubmit={handleClientSubmit}>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input type="text" required value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Business Name / Company</label>
                  <input type="text" value={clientForm.company} onChange={e => setClientForm({...clientForm, company: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <select value={clientForm.country} onChange={e => setClientForm({...clientForm, country: e.target.value})}>
                    <option>India</option>
                    <option>US</option>
                    <option>UK</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Account Status</label>
                  <select value={clientForm.status} onChange={e => setClientForm({...clientForm, status: e.target.value})}>
                    <option>Lead</option>
                    <option>Proposal Sent</option>
                    <option>Contract Signed</option>
                    <option>Active</option>
                    <option>Paused</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Setup Fee (₹)</label>
                    <input type="number" value={clientForm.setup_fee} onChange={e => setClientForm({...clientForm, setup_fee: parseFloat(e.target.value)})} min="0" step="any" />
                  </div>
                  <div className="form-group">
                    <label>Monthly Fee (₹)</label>
                    <input type="number" value={clientForm.recurring_fee} onChange={e => setClientForm({...clientForm, recurring_fee: parseFloat(e.target.value)})} min="0" step="any" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Account Owner (Staff)</label>
                  <select value={clientForm.account_owner_id} onChange={e => setClientForm({...clientForm, account_owner_id: e.target.value})}>
                    <option value="">Unassigned</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <button className="btn gold" style={{ width: '100%' }}>Create Client &amp; Portal</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: LEADS --- */}
      {activeTab === 'leads' && (
        <div className="dashboard-row">
          <div>
            <div className="panel-card">
              <div className="panel-card-title">Sales Lead Board</div>
              <div className="crm-table-wrapper">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Lead Source</th>
                      <th>Follow Up Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id}>
                        <td>{lead.name}</td>
                        <td>{lead.business_name}</td>
                        <td className="mono">{lead.channel}</td>
                        <td className="mono">{lead.follow_up_date || '—'}</td>
                        <td>
                          <span className={`badge ${lead.status === 'New' ? 'info' : lead.status === 'Converted' ? 'success' : 'warning'}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setSelectedLeadForLog(lead)}>
                              Log Activity
                            </button>
                            <button className="btn secondary" style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }} onClick={() => setEditingLead(lead)}>
                              <Edit size={11} />
                            </button>
                            <button className="btn danger" style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }} onClick={() => handleDeleteLead(lead.id)}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="panel-card">
              <div className="panel-card-title gold">New Lead Entry</div>
              <form onSubmit={handleLeadSubmit}>
                <div className="form-group">
                  <label>Lead Contact Name</label>
                  <input type="text" required value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Business Name</label>
                  <input type="text" value={leadForm.business_name} onChange={e => setLeadForm({...leadForm, business_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Lead Source Channel</label>
                  <select value={leadForm.channel} onChange={e => setLeadForm({...leadForm, channel: e.target.value})}>
                    <option value="referral">Referral</option>
                    <option value="outbound">Outbound (Scraping/Cold)</option>
                    <option value="inbound web">Inbound Web Website</option>
                    <option value="partner">Channel Partner</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Follow-up Date</label>
                  <input type="date" value={leadForm.follow_up_date} onChange={e => setLeadForm({...leadForm, follow_up_date: e.target.value})} />
                </div>
                <button className="btn gold" style={{ width: '100%' }}>Register Lead</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: DOCUMENT AUTO-GEN --- */}
      {activeTab === 'docgen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
          <div className="panel-card">
            <div className="panel-card-title">Paste Freeform Brief</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginBottom: '15px' }}>
              Paste requirements and client commercial notes. The AI engine will parse governing laws, pricing matrices, rollouts, and exclusions automatically.
            </p>
            <div className="form-group">
              <textarea 
                rows="10" 
                placeholder="e.g. Dr. Parma, family physician clinic, USA, wants LeadHunter + ReputationGuard, setup ₹800, monthly ₹299, governing law client's state, 30-day cancellation..."
                value={briefText}
                onChange={e => setBriefText(e.target.value)}
              />
            </div>
            <button 
              className="btn primary" 
              style={{ width: '100%', padding: '12px' }} 
              disabled={parsing || !briefText.trim()}
              onClick={handleExtractBrief}
            >
              {parsing ? 'Parsing Brief with AI...' : 'Run Brief Parser Extraction'}
            </button>
          </div>

          <div className="panel-card">
            <div className="panel-card-title gold">AI Parsed Extraction Matrix</div>
            {parsedResult ? (
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div><strong>Client:</strong> {parsedResult.clientName} ({parsedResult.businessType})</div>
                <div><strong>Location / Law:</strong> {parsedResult.country} / {parsedResult.governingLaw}</div>
                <div><strong>Setup / Monthly Fees:</strong> {parsedResult.currency}{parsedResult.setupFee} / {parsedResult.currency}{parsedResult.monthlyFee} per month</div>
                <div><strong>Cancellation Notice:</strong> {parsedResult.cancellationTerms}</div>
                
                <div style={{ borderBottom: '1px solid var(--border-color)', margin: '8px 0' }}></div>
                
                <div>
                  <strong>Extracted Products:</strong>
                  <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                    {parsedResult.products.map((p,i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>

                <div>
                  <strong>Phased Rollout SUGGESTED Plan:</strong>
                  <ul style={{ paddingLeft: '20px', marginTop: '4px', color: 'var(--text-muted)' }}>
                    {parsedResult.phasedRollout.map((pr,i) => <li key={i}><strong>{pr.phase}:</strong> {pr.detail}</li>)}
                  </ul>
                </div>

                <button className="btn gold" style={{ marginTop: '15px', width: '100%' }} onClick={handleOpenDocGenerator}>
                  Launch Document Generator Suite &rarr;
                </button>
              </div>
            ) : (
              <div style={{ padding: '50px 0', textSelf: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
                No brief parsed yet. Enter info on the left and run AI extraction.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DIALOG: LEAD LOG ACTIVITY --- */}
      {selectedLeadForLog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Log Activity: {selectedLeadForLog.name}</div>
            <form onSubmit={handleLeadLogSubmit}>
              <div className="form-group">
                <label>Call/Contact Outcome</label>
                <select value={activityInput.outcome} onChange={e => setActivityInput({...activityInput, outcome: e.target.value})}>
                  <option value="spoke today">Spoke Today (Interested)</option>
                  <option value="no answer">No Answer / Left Voicemail</option>
                  <option value="callback requested">Callback Requested</option>
                  <option value="converted">Converted (Close Deal)</option>
                  <option value="lost">Lost Deal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Detailed Activity Summary (Notes)</label>
                <textarea required rows="4" value={activityInput.action} onChange={e => setActivityInput({...activityInput, action: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Next Follow-up Date (Optional)</label>
                <input type="date" value={activityInput.next_follow_up} onChange={e => setActivityInput({...activityInput, next_follow_up: e.target.value})} />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setSelectedLeadForLog(null)}>Cancel</button>
                <button className="btn primary">Submit Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT REVENUE MODAL */}
      {editingRevenue && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-title">Edit Revenue Record</div>
            <form onSubmit={handleEditRevenueSubmit}>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input 
                  type="number" 
                  required 
                  value={editingRevenue.amount} 
                  onChange={e => setEditingRevenue({...editingRevenue, amount: parseFloat(e.target.value)})}
                  min="0"
                  step="any"
                />
              </div>
              <div className="form-group">
                <label>Payment Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingRevenue.date} 
                  onChange={e => setEditingRevenue({...editingRevenue, date: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Client Reference</label>
                <select 
                  value={editingRevenue.client_id || ''} 
                  onChange={e => setEditingRevenue({...editingRevenue, client_id: e.target.value || null})}
                >
                  <option value="">No Client (Direct Sale)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company} ({c.name})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select 
                  value={editingRevenue.payment_method} 
                  onChange={e => setEditingRevenue({...editingRevenue, payment_method: e.target.value})}
                >
                  <option>Bank Transfer</option>
                  <option>Stripe</option>
                  <option>UPI</option>
                  <option>Cash</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingRevenue(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL */}
      {editingExpense && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-title gold">Edit Expense Record</div>
            <form onSubmit={handleEditExpenseSubmit}>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input 
                  type="number" 
                  required 
                  value={editingExpense.amount} 
                  onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value)})}
                  min="0"
                  step="any"
                />
              </div>
              <div className="form-group">
                <label>Date Paid</label>
                <input 
                  type="date" 
                  required 
                  value={editingExpense.date} 
                  onChange={e => setEditingExpense({...editingExpense, date: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={editingExpense.category} 
                  onChange={e => setEditingExpense({...editingExpense, category: e.target.value})}
                >
                  <option value="salary">Salary Payment</option>
                  <option value="tools/software">Tools &amp; Software</option>
                  <option value="hosting">Hosting/Server Infra</option>
                  <option value="marketing spend">Marketing Spend</option>
                  <option value="office">Office &amp; Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Paid To / Vendor</label>
                <input 
                  type="text" 
                  value={editingExpense.paid_to || ''} 
                  onChange={e => setEditingExpense({...editingExpense, paid_to: e.target.value})} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingExpense(null)}>Cancel</button>
                <button className="btn gold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {editingClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title gold">Edit Client Details</div>
            <form onSubmit={handleEditClientSubmit}>
              <div className="form-group">
                <label>Contact Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingClient.name} 
                  onChange={e => setEditingClient({...editingClient, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Business Name / Company</label>
                <input 
                  type="text" 
                  value={editingClient.company || ''} 
                  onChange={e => setEditingClient({...editingClient, company: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <select 
                  value={editingClient.country} 
                  onChange={e => setEditingClient({...editingClient, country: e.target.value})}
                >
                  <option>India</option>
                  <option>US</option>
                  <option>UK</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Account Status</label>
                <select 
                  value={editingClient.status} 
                  onChange={e => setEditingClient({...editingClient, status: e.target.value})}
                >
                  <option>Lead</option>
                  <option>Proposal Sent</option>
                  <option>Contract Signed</option>
                  <option>Active</option>
                  <option>Paused</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Setup Fee (₹)</label>
                  <input 
                    type="number" 
                    value={editingClient.setup_fee || 0} 
                    onChange={e => setEditingClient({...editingClient, setup_fee: parseFloat(e.target.value)})}
                    min="0"
                    step="any"
                  />
                </div>
                <div className="form-group">
                  <label>Monthly Fee (₹)</label>
                  <input 
                    type="number" 
                    value={editingClient.recurring_fee || 0} 
                    onChange={e => setEditingClient({...editingClient, recurring_fee: parseFloat(e.target.value)})}
                    min="0"
                    step="any"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Account Owner (Staff)</label>
                <select 
                  value={editingClient.account_owner_id || ''} 
                  onChange={e => setEditingClient({...editingClient, account_owner_id: e.target.value || null})}
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingClient(null)}>Cancel</button>
                <button className="btn gold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LEAD MODAL */}
      {editingLead && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-title gold">Edit Sales Lead</div>
            <form onSubmit={handleEditLeadSubmit}>
              <div className="form-group">
                <label>Lead Contact Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingLead.name} 
                  onChange={e => setEditingLead({...editingLead, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Business Name</label>
                <input 
                  type="text" 
                  value={editingLead.business_name || ''} 
                  onChange={e => setEditingLead({...editingLead, business_name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Lead Source Channel</label>
                <select 
                  value={editingLead.channel} 
                  onChange={e => setEditingLead({...editingLead, channel: e.target.value})}
                >
                  <option value="referral">Referral</option>
                  <option value="outbound">Outbound (Scraping/Cold)</option>
                  <option value="inbound web">Inbound Web Website</option>
                  <option value="partner">Channel Partner</option>
                </select>
              </div>
              <div className="form-group">
                <label>Follow-up Date</label>
                <input 
                  type="date" 
                  value={editingLead.follow_up_date || ''} 
                  onChange={e => setEditingLead({...editingLead, follow_up_date: e.target.value})} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingLead(null)}>Cancel</button>
                <button className="btn gold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

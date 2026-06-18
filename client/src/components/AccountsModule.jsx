import React, { useState, useEffect } from 'react';
import { CircleDollarSign, Landmark, TrendingUp, Wallet, Plus, Edit, Trash2 } from 'lucide-react';

export default function AccountsModule({ user, showToast }) {
  const [activeTab, setActiveTab] = useState('statement');
  
  const [revenue, setRevenue] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [revForm, setRevForm] = useState({ amount: '', date: '', client_id: '', payment_method: 'Bank Transfer', invoice_ref: '', source: 'recurring' });
  const [expForm, setExpForm] = useState({ amount: '', date: '', category: 'tools/software', paid_to: '' });

  // Editing states
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    return Promise.all([
      fetch('/api/revenue', { headers }).then(res => res.ok ? res.json() : []),
      fetch('/api/expenses', { headers }).then(res => res.ok ? res.json() : []),
      fetch('/api/clients', { headers }).then(res => res.ok ? res.json() : []),
      fetch('/api/users', { headers }).then(res => res.ok ? res.json() : [])
    ]).then(([revData, expData, clientData, userData]) => {
      setRevenue(Array.isArray(revData) ? revData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
      setEmployees(Array.isArray(userData) ? userData.filter(u => u.role !== 'ClientPortal') : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (val) => {
    const isNegative = val < 0;
    const formatted = Math.abs(val).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    return `${isNegative ? '-' : ''}${formatted}`;
  };

  const handleRevenueSubmit = (e) => {
    e.preventDefault();
    if (revForm.amount < 0) {
      showToast('Amount cannot be negative', 'error');
      return;
    }
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

  const handleEditRevenueSubmit = (e) => {
    e.preventDefault();
    if (editingRevenue.amount < 0) {
      showToast('Amount cannot be negative', 'error');
      return;
    }
    fetch(`/api/revenue/${editingRevenue.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingRevenue)
    }).then(res => res.json()).then(data => {
      if (data.error) showToast(data.error, 'error');
      else {
        showToast('Revenue record updated');
        setEditingRevenue(null);
        loadData();
      }
    });
  };

  const handleDeleteRevenue = (id) => {
    if (!window.confirm('Delete this revenue entry?')) return;
    fetch(`/api/revenue/${id}`, { method: 'DELETE', headers })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Revenue record deleted');
          loadData();
        }
      });
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (expForm.amount < 0) {
      showToast('Amount cannot be negative', 'error');
      return;
    }
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

  const handleEditExpenseSubmit = (e) => {
    e.preventDefault();
    if (editingExpense.amount < 0) {
      showToast('Amount cannot be negative', 'error');
      return;
    }
    fetch(`/api/expenses/${editingExpense.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingExpense)
    }).then(res => res.json()).then(data => {
      if (data.error) showToast(data.error, 'error');
      else {
        showToast('Expense record updated');
        setEditingExpense(null);
        loadData();
      }
    });
  };

  const handleDeleteExpense = (id) => {
    if (!window.confirm('Delete this expense entry?')) return;
    fetch(`/api/expenses/${id}`, { method: 'DELETE', headers })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Expense record deleted');
          loadData();
        }
      });
  };

  // Financial aggregates
  const totalRev = revenue.reduce((sum, r) => sum + r.amount, 0);
  const ledgerExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Payroll aggregate: Monthly salaries
  const monthlyPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const totalExp = ledgerExpenses + monthlyPayroll;
  const netProfit = totalRev - totalExp;

  // Breakdown expenses by category
  const categories = {
    'Salary Payroll': monthlyPayroll,
    'Tools & Software': expenses.filter(e => e.category === 'tools/software').reduce((sum, e) => sum + e.amount, 0),
    'Hosting & Infrastructure': expenses.filter(e => e.category === 'hosting').reduce((sum, e) => sum + e.amount, 0),
    'Marketing Spend': expenses.filter(e => e.category === 'marketing spend').reduce((sum, e) => sum + e.amount, 0),
    'Office & Admin': expenses.filter(e => e.category === 'office').reduce((sum, e) => sum + e.amount, 0),
  };

  const computeClientProfitability = () => {
    const clientsMap = {};
    revenue.forEach(r => {
      if (r.client_company) {
        if (!clientsMap[r.client_company]) {
          clientsMap[r.client_company] = { company: r.client_company, collected: 0, allocatedCost: 150 };
        }
        clientsMap[r.client_company].collected += r.amount;
      }
    });
    return Object.values(clientsMap);
  };

  const clientProfitability = computeClientProfitability();

  if (loading) {
    return (
      <div className="crm-page-container" style={{ textAlign: 'center', padding: '50px 0' }}>
        Loading financial summaries...
      </div>
    );
  }

  return (
    <div className="crm-page-container">
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>Accounts &amp; Ledger Statement</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Company financial summary, payroll records, and P&amp;L projections.
          </p>
        </div>
      </div>

      <div className="crm-tabs" style={{ marginBottom: '20px' }}>
        <button className={`tab-btn ${activeTab === 'statement' ? 'active' : ''}`} onClick={() => setActiveTab('statement')}>
          P&amp;L Statement
        </button>
        <button className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>
          Revenue Transactions
        </button>
        <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
          Expense Transactions
        </button>
      </div>

      {/* TAB: STATEMENT */}
      {activeTab === 'statement' && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Total Revenue</span>
              <div className="metric-value" style={{ color: 'var(--lime-bright)' }}>
                {fmt(totalRev)}
              </div>
              <div className="metric-diff positive">
                <span>Live from sales tracker</span>
              </div>
            </div>

            <div className="metric-card gold">
              <span className="metric-label">Total Expenses (Incl. Payroll)</span>
              <div className="metric-value" style={{ color: 'var(--alert)' }}>
                {fmt(-totalExp)}
              </div>
              <div className="metric-diff negative">
                <span>Monthly Payroll: {fmt(monthlyPayroll)}</span>
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Net Profit Margin</span>
              <div className="metric-value" style={{ color: netProfit >= 0 ? 'var(--lime-bright)' : 'var(--alert)' }}>
                {fmt(netProfit)}
              </div>
            </div>
          </div>

          <div className="dashboard-row">
            {/* P&L Statement breakdown */}
            <div className="panel-card">
              <div className="panel-card-title">Profit &amp; Loss Statement (P&amp;L)</div>
              
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Financial Item</th>
                    <th className="num">Monthly Ledger Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Gross Operating Revenue</strong></td>
                    <td className="amount" style={{ textAlign: 'right' }}>{fmt(totalRev)}</td>
                  </tr>
                  <tr style={{ borderBottom: '2.5px solid var(--border-color)' }}>
                    <td style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>Setup &amp; Recurring Agent Fees</td>
                    <td className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(totalRev)}</td>
                  </tr>
                  
                  <tr>
                    <td><strong>Gross Operating Expenses</strong></td>
                    <td className="amount" style={{ textAlign: 'right', color: 'var(--alert)' }}>{fmt(-totalExp)}</td>
                  </tr>
                  {Object.entries(categories).map(([cat, val]) => (
                    <tr key={cat}>
                      <td style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>{cat}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(-val)}</td>
                    </tr>
                  ))}
                  
                  <tr className="total" style={{ borderTop: '2px solid var(--lime-bright)' }}>
                    <td style={{ fontWeight: 700 }}>NET STATEMENT P&amp;L PROFIT</td>
                    <td className="amount" style={{ textAlign: 'right', color: netProfit >= 0 ? 'var(--lime-bright)' : 'var(--alert)', fontWeight: 700 }}>
                      {fmt(netProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Salaries payroll list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="panel-card" style={{ margin: 0 }}>
                <div className="panel-card-title gold">Monthly Salary Payroll Rollups</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {employees.map(emp => (
                    <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{emp.name}</div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.designation}</span>
                      </div>
                      <span className="mono" style={{ fontWeight: 600 }}>{fmt(emp.salary)}/mo</span>
                    </div>
                  ))}
                  {employees.length === 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>No employees logged.</span>
                  )}
                </div>
              </div>

              <div className="panel-card" style={{ margin: 0 }}>
                <div className="panel-card-title">Per-Client Profitability (ROI)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clientProfitability.map(cp => (
                    <div key={cp.company} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{cp.company}</div>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Flat allocated cost: {fmt(cp.allocatedCost)}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ color: 'var(--lime-bright)', fontWeight: 600 }}>Collected: {fmt(cp.collected)}</div>
                        <span style={{ fontSize: '10px', color: 'var(--lime-bright)' }}>ROI: +{Math.round(((cp.collected - cp.allocatedCost) / cp.allocatedCost) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                  {clientProfitability.length === 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>No client revenues logged.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB: REVENUE */}
      {activeTab === 'revenue' && (
        <div className="dashboard-row" style={{ gridTemplateColumns: '2fr 1.2fr', alignItems: 'flex-start' }}>
          <div className="panel-card">
            <div className="panel-card-title">Daily Revenue Log</div>
            <div className="crm-table-wrapper" style={{ maxHeight: '450px' }}>
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
                      <td className="amount" style={{ color: 'var(--lime-bright)' }}>{fmt(r.amount)}</td>
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
                  {revenue.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No revenue entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
        </div>
      )}

      {/* TAB: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="dashboard-row" style={{ gridTemplateColumns: '2fr 1.2fr', alignItems: 'flex-start' }}>
          <div className="panel-card">
            <div className="panel-card-title gold">Expense Entries Log</div>
            <div className="crm-table-wrapper" style={{ maxHeight: '450px' }}>
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
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No expense entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
      )}

      {/* EDIT REVENUE MODAL */}
      {editingRevenue && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Edit Revenue Transaction</div>
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
          <div className="modal-content">
            <div className="modal-title">Edit Expense Transaction</div>
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
                  value={editingExpense.paid_to} 
                  onChange={e => setEditingExpense({...editingExpense, paid_to: e.target.value})} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingExpense(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

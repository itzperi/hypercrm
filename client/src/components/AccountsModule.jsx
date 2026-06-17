import React, { useState, useEffect } from 'react';
import { CircleDollarSign, Landmark, TrendingUp, Wallet } from 'lucide-react';

export default function AccountsModule() {
  const [revenue, setRevenue] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/revenue', { headers }).then(res => res.ok ? res.json() : []),
      fetch('/api/expenses', { headers }).then(res => res.ok ? res.json() : []),
      fetch('/api/users', { headers }).then(res => res.ok ? res.json() : [])
    ]).then(([revData, expData, userData]) => {
      setRevenue(Array.isArray(revData) ? revData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      setEmployees(Array.isArray(userData) ? userData.filter(u => u.role !== 'ClientPortal') : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

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

  // Client-level profitability: Setup fee + recurring vs. allocated staff loaded cost (sum of dev salary allocations)
  const computeClientProfitability = () => {
    const clients = {};
    revenue.forEach(r => {
      if (r.client_company) {
        if (!clients[r.client_company]) {
          clients[r.client_company] = { company: r.client_company, collected: 0, allocatedCost: 150 }; // flat allocated server/PM cost fallback
        }
        clients[r.client_company].collected += r.amount;
      }
    });

    return Object.values(clients);
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
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>Accounts &amp; Ledger Statement</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
          Company financial summary, payroll records, and P&amp;L projections.
        </p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Revenue</span>
          <div className="metric-value" style={{ color: 'var(--lime-bright)' }}>
            ${totalRev.toLocaleString()}
          </div>
          <div className="metric-diff positive">
            <span>Live from sales tracker</span>
          </div>
        </div>

        <div className="metric-card gold">
          <span className="metric-label">Total Expenses (Incl. Payroll)</span>
          <div className="metric-value" style={{ color: 'var(--alert)' }}>
            -${totalExp.toLocaleString()}
          </div>
          <div className="metric-diff negative">
            <span>Monthly Payroll: ${monthlyPayroll.toLocaleString()}</span>
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Net Profit Margin</span>
          <div className="metric-value" style={{ color: netProfit >= 0 ? 'var(--lime-bright)' : 'var(--alert)' }}>
            ${netProfit.toLocaleString()}
          </div>
          <div className="metric-diff positive">
            <span>Profit margin: {Math.max(0, Math.round((netProfit / (totalRev || 1)) * 100))}%</span>
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
                <td className="amount" style={{ textAlign: 'right' }}>${totalRev.toLocaleString()}</td>
              </tr>
              <tr style={{ borderBottom: '2.5px solid var(--border-color)' }}>
                <td style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>Setup &amp; Recurring Agent Fees</td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>${totalRev.toLocaleString()}</td>
              </tr>
              
              <tr>
                <td><strong>Gross Operating Expenses</strong></td>
                <td className="amount" style={{ textAlign: 'right', color: 'var(--alert)' }}>-${totalExp.toLocaleString()}</td>
              </tr>
              {Object.entries(categories).map(([cat, val]) => (
                <tr key={cat}>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>{cat}</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-${val.toLocaleString()}</td>
                </tr>
              ))}
              
              <tr className="total" style={{ borderTop: '2px solid var(--lime-bright)' }}>
                <td style={{ fontWeight: 700 }}>NET STATEMENT P&amp;L PROFIT</td>
                <td className="amount" style={{ textAlign: 'right', color: netProfit >= 0 ? 'var(--lime-bright)' : 'var(--alert)', fontWeight: 700 }}>
                  ${netProfit.toLocaleString()}
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
                  <span className="mono" style={{ fontWeight: 600 }}>${emp.salary.toLocaleString()}/mo</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card" style={{ margin: 0 }}>
            <div className="panel-card-title">Per-Client Profitability (ROI)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {clientProfitability.map(cp => (
                <div key={cp.company} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cp.company}</div>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Flat allocated cost: ${cp.allocatedCost}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ color: 'var(--lime-bright)', fontWeight: 600 }}>Collected: ${cp.collected}</div>
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
    </div>
  );
}

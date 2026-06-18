import React, { useState, useEffect } from 'react';
import { Settings, UserPlus, ShieldAlert, Key, Trash2, Edit } from 'lucide-react';

export default function SettingsModule({ user, showToast }) {
  const [activeTab, setActiveTab] = useState('permissions');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Roles mapping
  const roles = [
    { k: 'Admin', label: 'Operations Admin' },
    { k: 'PM', label: 'Project Manager' },
    { k: 'LeadDeveloper', label: 'Lead Developer' },
    { k: 'JuniorDeveloper', label: 'Junior Developer' },
    { k: 'SalesExecutive', label: 'Sales Executive' },
    { k: 'MarketingExecutive', label: 'Marketing Executive' },
    { k: 'ClientPortal', label: 'Client Portal View' }
  ];

  const modules = ['sales', 'development', 'accounts', 'attendance', 'scheduler', 'marketing', 'learning', 'settings'];
  const actions = ['view', 'create', 'edit', 'delete', 'approve'];

  const [selectedRole, setSelectedRole] = useState('JuniorDeveloper');
  const [matrix, setMatrix] = useState({});

  // Employee creation state
  const [employees, setEmployees] = useState([]);
  const [empForm, setEmpForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'Employee',
    designation: 'Junior Developer',
    department: 'Development',
    salary: 40000,
    reporting_manager_id: ''
  });

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    fetch('/api/users', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setEmployees(list.filter(u => u.role !== 'ClientPortal'));
        
        // Find default permissions for selected role from user accounts list
        const matched = list.find(u => u.role === selectedRole || u.designation === selectedRole || (selectedRole === 'JuniorDeveloper' && u.designation === 'Junior Developer') || (selectedRole === 'LeadDeveloper' && u.designation === 'Lead Developer') || (selectedRole === 'SalesExecutive' && u.designation === 'Sales Executive') || (selectedRole === 'MarketingExecutive' && u.designation === 'Marketing Executive') || (selectedRole === 'PM' && u.designation === 'Project Manager'));
        if (matched && matched.permissions) {
          setMatrix(matched.permissions);
        }
      });
  };

  useEffect(() => {
    loadData();
  }, [selectedRole]);

  const handleSystemReset = () => {
    fetch('/api/system/reset', {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          showToast(data.error, 'error');
        } else {
          showToast(data.message);
          setShowResetConfirm(false);
          setResetConfirmText('');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      })
      .catch(() => showToast('Failed to reset system database', 'error'));
  };

  const handleDeleteEmployee = (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Employee deleted successfully");
          loadData();
        }
      });
  };

  const handleEditEmployeeSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/users/${editingEmployee.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingEmployee)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast("Employee profile updated successfully");
          setEditingEmployee(null);
          loadData();
        }
      });
  };

  const handleToggle = (mod, act) => {
    const updated = { ...matrix };
    if (!updated[mod]) {
      updated[mod] = { view: false, create: false, edit: false, delete: false, approve: false };
    }
    updated[mod][act] = !updated[mod][act];
    setMatrix(updated);
  };

  const handleSavePermissions = () => {
    // Map simplified dropdown key to DB role template
    let dbRole = 'Employee';
    if (selectedRole === 'Admin') dbRole = 'Admin';
    if (selectedRole === 'ClientPortal') dbRole = 'ClientPortal';

    fetch(`/api/settings/permissions/${dbRole}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ permissions: matrix })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast(`Permission matrix templates applied to all active ${selectedRole} accounts.`);
          loadData();
        }
      });
  };

  const handleRegisterEmployee = (e) => {
    e.preventDefault();
    
    // Map role type based on designation
    let dbRole = 'Employee';
    if (empForm.designation === 'Operations Admin') dbRole = 'Admin';

    // Get default permission template
    const matched = employees.find(u => u.designation === empForm.designation || u.role === dbRole);
    const defaultPerms = matched ? matched.permissions : {};

    fetch('/api/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...empForm,
        role: dbRole,
        permissions: defaultPerms
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast(`Employee account registered successfully!`);
          loadData();
          setEmpForm({ username: '', password: '', name: '', role: 'Employee', designation: 'Junior Developer', department: 'Development', salary: 40000, reporting_manager_id: '' });
        }
      });
  };

  return (
    <div className="crm-page-container">
      <div className="crm-tabs">
        <button className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => setActiveTab('permissions')}><ShieldAlert size={14} /> Permissions Matrix</button>
        <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}><UserPlus size={14} /> Employee Directory</button>
        {user.role === 'SuperAdmin' && (
          <button className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}><Settings size={14} /> System Database</button>
        )}
      </div>

      {/* --- SUBTAB: PERMISSIONS MATRIX --- */}
      {activeTab === 'permissions' && (
        <div className="panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div className="panel-card-title" style={{ border: 'none', margin: 0 }}>Operational Permission Matrix</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginTop: '2px' }}>
                Alter feature module scopes. Changes apply as middleware rules immediately.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <label style={{ margin: 0 }}>Configure Role Template:</label>
              <select style={{ width: '180px' }} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                {roles.map(r => <option key={r.k} value={r.k}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="crm-table-wrapper" style={{ marginBottom: '20px' }}>
            <table className="crm-table permissions-matrix-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Module Interface</th>
                  <th>View</th>
                  <th>Create</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Approve</th>
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => {
                  const modPerms = matrix[mod] || { view: false, create: false, edit: false, delete: false, approve: false };
                  return (
                    <tr key={mod}>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{mod} Module</td>
                      {actions.map(act => (
                        <td key={act}>
                          <input 
                            type="checkbox" 
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            checked={modPerms[act] === true}
                            onChange={() => handleToggle(mod, act)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button className="btn primary" onClick={handleSavePermissions}>
            Apply Changes to Database Matrix
          </button>
        </div>
      )}

      {/* --- SUBTAB: EMPLOYEES --- */}
      {activeTab === 'employees' && (
        <div className="dashboard-row">
          <div>
            <div className="panel-card">
              <div className="panel-card-title">Employee Registry Ledger</div>
              <div className="crm-table-wrapper">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Designation</th>
                      <th>Department</th>
                      {user.role === 'SuperAdmin' && <th>Monthly Salary</th>}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td>{emp.name}</td>
                        <td className="mono">{emp.username}</td>
                        <td>{emp.designation}</td>
                        <td><span className="badge info">{emp.department}</span></td>
                        {user.role === 'SuperAdmin' && <td className="amount">₹{emp.salary.toLocaleString('en-IN')}</td>}
                        <td>
                          {emp.username !== 'Peri' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn secondary" 
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => handleEditEmployeeClick(emp)}
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                className="btn danger" 
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => handleDeleteEmployee(emp.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
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
              <div className="panel-card-title gold">+ Register Staff Profile</div>
              <form onSubmit={handleRegisterEmployee}>
                <div className="form-group">
                  <label>Full Employee Name</label>
                  <input type="text" required value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Login Username</label>
                  <input type="text" required value={empForm.username} onChange={e => setEmpForm({...empForm, username: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Initial Login Password</label>
                  <input type="password" required value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Designation Role</label>
                    <select value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value, department: e.target.value.includes('Developer') ? 'Development' : e.target.value.includes('Sales') ? 'Sales' : 'Marketing'})}>
                      <option>Junior Developer</option>
                      <option>Lead Developer</option>
                      <option>Project Manager</option>
                      <option>Sales Executive</option>
                      <option>Marketing Executive</option>
                      <option>Operations Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input type="text" readOnly value={empForm.department} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Reporting Manager</label>
                  <select value={empForm.reporting_manager_id} onChange={e => setEmpForm({...empForm, reporting_manager_id: e.target.value})}>
                    <option value="">No manager (Reports directly to CEO)</option>
                    {employees.filter(u => u.designation.includes('Lead') || u.designation.includes('Manager') || u.role === 'SuperAdmin').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Starting Base Salary (₹)</label>
                  <input type="number" required min="0" value={empForm.salary} onChange={e => setEmpForm({...empForm, salary: parseFloat(e.target.value)})} />
                </div>
                <button className="btn gold" style={{ width: '100%' }}>Register Employee</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB: SYSTEM RESET --- */}
      {activeTab === 'system' && user.role === 'SuperAdmin' && (
        <div className="panel-card" style={{ border: '1px solid var(--alert)' }}>
          <div className="panel-card-title" style={{ color: 'var(--alert)' }}>
            System Database Reset (Danger Zone)
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '20px', lineHeight: '1.6' }}>
            Warning: Performing a system reset will permanently delete all logs, projects, tasks, attendance lists, leaves, documents, revenues, expenses, clients, and all user accounts (excluding your CEO/Root account <strong>Peri</strong>). This action cannot be undone.
          </p>
          
          <button className="btn danger" onClick={() => setShowResetConfirm(true)} style={{ padding: '10px 20px' }}>
            Reset System Database
          </button>
        </div>
      )}

      {/* EDIT EMPLOYEE PROFILE MODAL */}
      {editingEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Employee Profile: {editingEmployee.name}</div>
            <form onSubmit={handleEditEmployeeSubmit}>
              <div className="form-group">
                <label>Full Employee Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingEmployee.name} 
                  onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Designation Role</label>
                  <select 
                    value={editingEmployee.designation} 
                    onChange={e => setEditingEmployee({
                      ...editingEmployee, 
                      designation: e.target.value, 
                      department: e.target.value.includes('Developer') ? 'Development' : e.target.value.includes('Sales') ? 'Sales' : 'Marketing',
                      role: e.target.value === 'Operations Admin' ? 'Admin' : 'Employee'
                    })}
                  >
                    <option>Junior Developer</option>
                    <option>Lead Developer</option>
                    <option>Project Manager</option>
                    <option>Sales Executive</option>
                    <option>Marketing Executive</option>
                    <option>Operations Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" readOnly value={editingEmployee.department || ''} />
                </div>
              </div>
              <div className="form-group">
                <label>Reporting Manager</label>
                <select 
                  value={editingEmployee.reporting_manager_id || ''} 
                  onChange={e => setEditingEmployee({...editingEmployee, reporting_manager_id: e.target.value || null})}
                >
                  <option value="">No manager (Reports directly to CEO)</option>
                  {employees.filter(u => u.id !== editingEmployee.id && (u.designation.includes('Lead') || u.designation.includes('Manager') || u.role === 'SuperAdmin')).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                  ))}
                </select>
              </div>
              {user.role === 'SuperAdmin' && (
                <div className="form-group">
                  <label>Monthly Salary (₹)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    value={editingEmployee.salary || 0} 
                    onChange={e => setEditingEmployee({...editingEmployee, salary: parseFloat(e.target.value)})} 
                  />
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingEmployee(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SYSTEM RESET DOUBLE-CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-title" style={{ color: 'var(--alert)' }}>⚠️ Confirm Full System Reset</div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px', lineHeight: '1.45' }}>
              To verify that you want to delete all database entries and start completely fresh with only the <strong>Peri</strong> profile, please type <strong>RESET</strong> in the input field below:
            </p>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Type RESET here"
                value={resetConfirmText}
                onChange={e => setResetConfirmText(e.target.value)}
                style={{ border: '1px solid var(--alert)' }}
              />
            </div>
            <div className="form-actions">
              <button className="btn secondary" onClick={() => { setShowResetConfirm(false); setResetConfirmText(''); }}>Cancel</button>
              <button 
                className="btn danger" 
                disabled={resetConfirmText !== 'RESET'}
                onClick={handleSystemReset}
              >
                Perform Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

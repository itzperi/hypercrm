import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Inbox, PlaneTakeoff, Edit, Trash2, Plus } from 'lucide-react';

export default function AttendanceModule({ user, showToast }) {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);

  const [rightTab, setRightTab] = useState('attendance'); // 'attendance' or 'leaves'

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' });

  // Manual Attendance Form
  const [addAttendanceForm, setAddAttendanceForm] = useState({ user_id: '', date: '', clock_in: '', clock_out: '', status: 'Present' });

  // Modals & Editing states
  const [addingAttendance, setAddingAttendance] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const isAdmin = (user.role === 'SuperAdmin' || user.role === 'Admin');

  const loadData = () => {
    fetch('/api/attendance', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setAttendance(list);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRec = list.find(r => r.user_id === user.id && r.date === todayStr);
        if (todayRec) {
          setCurrentRecord(todayRec);
          setClockedIn(!!todayRec.clock_in && !todayRec.clock_out);
        } else {
          setCurrentRecord(null);
          setClockedIn(false);
        }
      });

    fetch('/api/leaves', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setLeaves(Array.isArray(data) ? data : []));

    if (isAdmin) {
      fetch('/api/users', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setEmployees(Array.isArray(data) ? data.filter(u => u.role !== 'ClientPortal') : []));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClockIn = () => {
    fetch('/api/attendance/clock-in', {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast(`Clocked In successfully! Log status: ${data.status}`);
          loadData();
        }
      });
  };

  const handleClockOut = () => {
    fetch('/api/attendance/clock-out', {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Clocked Out successfully!');
          loadData();
        }
      });
  };

  const handleLeaveRequestSubmit = (e) => {
    e.preventDefault();
    fetch('/api/leaves', {
      method: 'POST',
      headers,
      body: JSON.stringify(leaveForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Leave request submitted successfully');
          loadData();
          setLeaveForm({ start_date: '', end_date: '', reason: '' });
        }
      });
  };

  const handleApproveLeave = (leaveId, status) => {
    fetch(`/api/leaves/${leaveId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast(`Leave request ${status}`);
          loadData();
        }
      });
  };

  const handleEditLeaveSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/leaves/${editingLeave.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingLeave)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Leave request updated successfully');
          setEditingLeave(null);
          loadData();
        }
      });
  };

  const handleDeleteLeave = (id) => {
    if (!window.confirm("Are you sure you want to delete this leave request?")) return;
    fetch(`/api/leaves/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Leave request deleted');
          loadData();
        }
      });
  };

  const handleAddAttendanceSubmit = (e) => {
    e.preventDefault();
    fetch('/api/attendance', {
      method: 'POST',
      headers,
      body: JSON.stringify(addAttendanceForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Attendance logged successfully');
          setAddAttendanceForm({ user_id: '', date: '', clock_in: '', clock_out: '', status: 'Present' });
          setAddingAttendance(false);
          loadData();
        }
      });
  };

  const handleEditAttendanceSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/attendance/${editingAttendance.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingAttendance)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Attendance log updated successfully');
          setEditingAttendance(null);
          loadData();
        }
      });
  };

  const handleDeleteAttendance = (id) => {
    if (!window.confirm("Are you sure you want to delete this attendance log?")) return;
    fetch(`/api/attendance/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Attendance log deleted');
          loadData();
        }
      });
  };

  return (
    <div className="crm-page-container">
      <div className="dashboard-row" style={{ gridTemplateColumns: '1.2fr 2fr', gap: '25px' }}>
        
        {/* LEFT COLUMN: Clocking & Request leave */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel-card clocking-panel">
            <div className="panel-card-title" style={{ border: 'none', margin: 0 }}>Operational Shift Logging</div>
            <div className="clocking-status">Shift Hours: 9:00 AM – 4:30 PM</div>
            <div className="clocking-time">
              {currentRecord?.clock_in ? currentRecord.clock_in : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
            
            {clockedIn ? (
              <button className="btn danger" style={{ width: '100%', padding: '12px' }} onClick={handleClockOut}>
                <Clock size={16} /> Clock Out (End Shift)
              </button>
            ) : (
              <button className="btn primary" style={{ width: '100%', padding: '12px' }} disabled={!!currentRecord?.clock_out} onClick={handleClockIn}>
                <Clock size={16} /> {currentRecord?.clock_out ? 'Shift Ended Today' : 'Clock In (Start Shift)'}
              </button>
            )}

            {currentRecord?.status && (
              <div style={{ marginTop: '12px' }}>
                Status Today: <span className={`badge ${currentRecord.status === 'Present' ? 'success' : 'warning'}`}>{currentRecord.status}</span>
              </div>
            )}
          </div>

          <div className="panel-card">
            <div className="panel-card-title gold">Submit Leave Request</div>
            <form onSubmit={handleLeaveRequestSubmit}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" required value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" required value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Reason for Leave</label>
                <textarea required rows="3" placeholder="Medical, vacation, etc." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
              </div>
              <button className="btn gold" style={{ width: '100%' }}>Submit Request</button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: History / Approvals */}
        <div>
          {isAdmin && (
            <div className="panel-card" style={{ marginBottom: '20px' }}>
              <div className="panel-card-title">Pending Leave Requests Approval</div>
              <div className="crm-table-wrapper" style={{ maxHeight: '200px' }}>
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.filter(l => l.status === 'Pending').map(l => (
                      <tr key={l.id}>
                        <td>{l.user_name} ({l.designation})</td>
                        <td className="mono" style={{ fontSize: '11px' }}>{l.start_date} to {l.end_date}</td>
                        <td>{l.reason}</td>
                        <td><span className="badge warning">Pending</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApproveLeave(l.id, 'Approved')}>Approve</button>
                            <button className="btn danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApproveLeave(l.id, 'Rejected')}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {leaves.filter(l => l.status === 'Pending').length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0' }}>No pending leave approvals.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="panel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div className="crm-tabs" style={{ border: 'none', margin: 0, padding: 0 }}>
                <button className={`tab-btn ${rightTab === 'attendance' ? 'active' : ''}`} onClick={() => setRightTab('attendance')}>
                  Attendance Register
                </button>
                <button className={`tab-btn ${rightTab === 'leaves' ? 'active' : ''}`} onClick={() => setRightTab('leaves')}>
                  Leave Requests Tracker
                </button>
              </div>
              {isAdmin && rightTab === 'attendance' && (
                <button 
                  className="btn primary" 
                  style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    setAddAttendanceForm({ user_id: employees[0]?.id || '', date: new Date().toISOString().split('T')[0], clock_in: '09:00', clock_out: '16:30', status: 'Present' });
                    setAddingAttendance(true);
                  }}
                >
                  <Plus size={12} /> Log Manual
                </button>
              )}
            </div>

            {rightTab === 'attendance' ? (
              <div className="crm-table-wrapper" style={{ maxHeight: '400px' }}>
                <table className="crm-table">
                  <thead>
                    <tr>
                      {isAdmin && <th>Employee</th>}
                      <th>Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Status</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a.id}>
                        {isAdmin && <td>{a.name || user.name}</td>}
                        <td className="mono">{a.date}</td>
                        <td className="mono">{a.clock_in || '—'}</td>
                        <td className="mono">{a.clock_out || '—'}</td>
                        <td>
                          <span className={`badge ${a.status === 'Present' ? 'success' : a.status === 'Leave' ? 'info' : 'warning'}`}>
                            {a.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn secondary" 
                                style={{ padding: '4px 6px', fontSize: '11px' }}
                                onClick={() => setEditingAttendance(a)}
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                className="btn danger" 
                                style={{ padding: '4px 6px', fontSize: '11px' }}
                                onClick={() => handleDeleteAttendance(a.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No attendance logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="crm-table-wrapper" style={{ maxHeight: '400px' }}>
                <table className="crm-table">
                  <thead>
                    <tr>
                      {isAdmin && <th>Employee</th>}
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(l => (
                      <tr key={l.id}>
                        {isAdmin && <td>{l.user_name || user.name}</td>}
                        <td className="mono" style={{ fontSize: '11.5px' }}>{l.start_date} to {l.end_date}</td>
                        <td>{l.reason}</td>
                        <td>
                          <span className={`badge ${l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td>
                          {(isAdmin || l.status === 'Pending') ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn secondary" 
                                style={{ padding: '4px 6px', fontSize: '11px' }}
                                onClick={() => setEditingLeave(l)}
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                className="btn danger" 
                                style={{ padding: '4px 6px', fontSize: '11px' }}
                                onClick={() => handleDeleteLeave(l.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                    {leaves.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No leave records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* LOG MANUAL ATTENDANCE MODAL */}
      {addingAttendance && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Log Manual Attendance</div>
            <form onSubmit={handleAddAttendanceSubmit}>
              <div className="form-group">
                <label>Select Employee</label>
                <select 
                  required
                  value={addAttendanceForm.user_id} 
                  onChange={e => setAddAttendanceForm({...addAttendanceForm, user_id: e.target.value})}
                >
                  <option value="">Choose employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  required 
                  value={addAttendanceForm.date} 
                  onChange={e => setAddAttendanceForm({...addAttendanceForm, date: e.target.value})} 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Clock In Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 09:00:00"
                    value={addAttendanceForm.clock_in} 
                    onChange={e => setAddAttendanceForm({...addAttendanceForm, clock_in: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Clock Out Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 16:30:00"
                    value={addAttendanceForm.clock_out} 
                    onChange={e => setAddAttendanceForm({...addAttendanceForm, clock_out: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={addAttendanceForm.status} 
                  onChange={e => setAddAttendanceForm({...addAttendanceForm, status: e.target.value})}
                >
                  <option>Present</option>
                  <option>Half-day</option>
                  <option>Absent</option>
                  <option>Leave</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setAddingAttendance(false)}>Cancel</button>
                <button className="btn primary">Submit Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ATTENDANCE LOG MODAL */}
      {editingAttendance && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Attendance Log</div>
            <form onSubmit={handleEditAttendanceSubmit}>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingAttendance.date || ''} 
                  onChange={e => setEditingAttendance({...editingAttendance, date: e.target.value})} 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Clock In Time</label>
                  <input 
                    type="text" 
                    value={editingAttendance.clock_in || ''} 
                    onChange={e => setEditingAttendance({...editingAttendance, clock_in: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Clock Out Time</label>
                  <input 
                    type="text" 
                    value={editingAttendance.clock_out || ''} 
                    onChange={e => setEditingAttendance({...editingAttendance, clock_out: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={editingAttendance.status || 'Present'} 
                  onChange={e => setEditingAttendance({...editingAttendance, status: e.target.value})}
                >
                  <option>Present</option>
                  <option>Half-day</option>
                  <option>Absent</option>
                  <option>Leave</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingAttendance(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LEAVE REQUEST MODAL */}
      {editingLeave && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Leave Request</div>
            <form onSubmit={handleEditLeaveSubmit}>
              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingLeave.start_date || ''} 
                  onChange={e => setEditingLeave({...editingLeave, start_date: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingLeave.end_date || ''} 
                  onChange={e => setEditingLeave({...editingLeave, end_date: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Reason for Leave</label>
                <textarea 
                  required 
                  rows="3" 
                  value={editingLeave.reason || ''} 
                  onChange={e => setEditingLeave({...editingLeave, reason: e.target.value})} 
                />
              </div>
              {isAdmin && (
                <div className="form-group">
                  <label>Approval Status</label>
                  <select 
                    value={editingLeave.status || 'Pending'} 
                    onChange={e => setEditingLeave({...editingLeave, status: e.target.value})}
                  >
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingLeave(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

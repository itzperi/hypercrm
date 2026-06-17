import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Inbox, PlaneTakeoff } from 'lucide-react';

export default function AttendanceModule({ user, showToast }) {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' });

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

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
        }
      });

    fetch('/api/leaves', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setLeaves(Array.isArray(data) ? data : []));
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
          showToast('Leave request submitted to reporting manager');
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

  const isAdmin = (user.role === 'SuperAdmin' || user.role === 'Admin');

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
              <div className="panel-card-title">Pending Leave Requests</div>
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
                        <td style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApproveLeave(l.id, 'Approved')}>Approve</button>
                          <button className="btn danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApproveLeave(l.id, 'Rejected')}>Reject</button>
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
            <div className="panel-card-title">Attendance &amp; Leave History</div>
            <div className="crm-table-wrapper" style={{ maxHeight: '400px' }}>
              <table className="crm-table">
                <thead>
                  <tr>
                    {isAdmin && <th>Employee</th>}
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, Plus, FileText, Edit, Trash2 } from 'lucide-react';

export default function SchedulerModule({ user, showToast }) {
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  // Meeting Form
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    datetime: '',
    duration: 30,
    recurrence: 'one-off',
    meeting_type: 'client-checkin',
    linked_project_id: '',
    attendees: []
  });

  // Selected meeting for notes/summary/edit
  const [activeMeetingForNotes, setActiveMeetingForNotes] = useState(null);
  const [notesInput, setNotesInput] = useState({ notes: '', what_discussed: '' });
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editMeetingForm, setEditMeetingForm] = useState({
    title: '',
    datetime: '',
    duration: 30,
    recurrence: 'one-off',
    meeting_type: 'client-checkin',
    linked_project_id: '',
    attendees: []
  });

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    fetch('/api/meetings', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setMeetings(Array.isArray(data) ? data : []));
    fetch('/api/users', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setEmployees(Array.isArray(data) ? data.filter(u => u.role !== 'ClientPortal') : []));
    fetch('/api/projects', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setProjects(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAttendeeToggle = (id) => {
    const current = [...meetingForm.attendees];
    const idx = current.indexOf(id);
    if (idx > -1) current.splice(idx, 1);
    else current.push(id);
    setMeetingForm({ ...meetingForm, attendees: current });
  };

  const handleEditAttendeeToggle = (id) => {
    const current = [...editMeetingForm.attendees];
    const idx = current.indexOf(id);
    if (idx > -1) current.splice(idx, 1);
    else current.push(id);
    setEditMeetingForm({ ...editMeetingForm, attendees: current });
  };

  const handleCreateMeeting = (e) => {
    e.preventDefault();
    fetch('/api/meetings', {
      method: 'POST',
      headers,
      body: JSON.stringify(meetingForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Meeting scheduled successfully');
          loadData();
          setMeetingForm({ title: '', datetime: '', duration: 30, recurrence: 'one-off', meeting_type: 'client-checkin', linked_project_id: '', attendees: [] });
        }
      });
  };

  const handleNotesUpdate = (e) => {
    e.preventDefault();
    if (!activeMeetingForNotes) return;

    fetch(`/api/meetings/${activeMeetingForNotes.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(notesInput)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Meeting notes and summary saved');
          loadData();
          setActiveMeetingForNotes(null);
        }
      });
  };

  const handleEditDetailsSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/meetings/${activeMeetingForNotes.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editMeetingForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Meeting details updated successfully');
          loadData();
          setActiveMeetingForNotes(null);
        }
      });
  };

  const handleDeleteMeeting = (id) => {
    if (!window.confirm("Are you sure you want to delete this meeting?")) return;
    fetch(`/api/meetings/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Meeting deleted successfully');
          setActiveMeetingForNotes(null);
          loadData();
        }
      });
  };

  // Build very basic Calendar cells
  const buildCalendarDays = () => {
    const days = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // First day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Fill blank cells for start day of week offset
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNum: '', dateStr: '', inactive: true });
    }

    // Fill days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      
      const dayMeetings = meetings.filter(m => m.datetime.startsWith(dateStr));
      days.push({ dayNum: d, dateStr, inactive: false, meetings: dayMeetings });
    }

    return days;
  };

  const calendarDays = buildCalendarDays();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="crm-page-container">
      <div className="dashboard-row" style={{ gridTemplateColumns: '2fr 1fr', gap: '25px' }}>
        
        {/* LEFT PANEL: Monthly Calendar Grid */}
        <div className="calendar-view">
          <div className="calendar-header">
            <h3 className="calendar-title">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Calendar
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Working Hours: 9:00 AM – 4:30 PM Only</span>
          </div>

          <div className="calendar-grid">
            {dayNames.map(dName => <div key={dName} className="calendar-day-label">{dName}</div>)}
            {calendarDays.map((day, i) => (
              <div key={i} className={`calendar-cell ${day.inactive ? 'inactive' : ''}`}>
                <span className="calendar-cell-num">{day.dayNum}</span>
                {day.meetings && day.meetings.map(m => (
                  <div 
                    key={m.id} 
                    className={`calendar-event ${m.meeting_type === 'client-checkin' ? 'client-call' : ''}`}
                    title={`${m.title} (${m.duration} mins)`}
                    onClick={() => {
                      setActiveMeetingForNotes(m);
                      setNotesInput({ notes: m.notes || '', what_discussed: m.what_discussed || '' });
                      setIsEditingDetails(false);
                      setEditMeetingForm({
                        title: m.title || '',
                        datetime: m.datetime || '',
                        duration: m.duration || 30,
                        recurrence: m.recurrence || 'one-off',
                        meeting_type: m.meeting_type || 'client-checkin',
                        linked_project_id: m.linked_project_id || '',
                        attendees: m.attendees ? m.attendees.map(a => a.id) : []
                      });
                    }}
                  >
                    {new Date(m.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} {m.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Book Meeting Form */}
        <div>
          <div className="panel-card">
            <div className="panel-card-title gold">Book Meeting Slot</div>
            <form onSubmit={handleCreateMeeting}>
              <div className="form-group">
                <label>Meeting Title</label>
                <input type="text" required value={meetingForm.title} onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Date &amp; Time (9:00 AM – 4:30 PM)</label>
                <input type="datetime-local" required value={meetingForm.datetime} onChange={e => setMeetingForm({...meetingForm, datetime: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (Mins)</label>
                  <select value={meetingForm.duration} onChange={e => setMeetingForm({...meetingForm, duration: parseInt(e.target.value)})}>
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Recurrence</label>
                  <select value={meetingForm.recurrence} onChange={e => setMeetingForm({...meetingForm, recurrence: e.target.value})}>
                    <option value="one-off">One-off</option>
                    <option value="daily">Daily Sync</option>
                    <option value="weekly">Weekly Sync</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Meeting Type</label>
                <select value={meetingForm.meeting_type} onChange={e => setMeetingForm({...meetingForm, meeting_type: e.target.value})}>
                  <option value="standup">Internal Standup</option>
                  <option value="status">Project Sync Status</option>
                  <option value="client-checkin">Client Check-in Call</option>
                </select>
              </div>
              <div className="form-group">
                <label>Link Project</label>
                <select value={meetingForm.linked_project_id} onChange={e => setMeetingForm({...meetingForm, linked_project_id: e.target.value})}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Attendees</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '100px', overflowY: 'auto', padding: '6px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}>
                  {employees.map(emp => (
                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={meetingForm.attendees.includes(emp.id)} 
                        onChange={() => handleAttendeeToggle(emp.id)}
                      />
                      {emp.name}
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn gold" style={{ width: '100%' }}>Schedule Event</button>
            </form>
          </div>
        </div>

      </div>

      {/* --- DIALOG: MEETING DETAILS, NOTES & TRANSCRIPT SUMMARIES --- */}
      {activeMeetingForNotes && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div className="crm-tabs" style={{ border: 'none', margin: 0, padding: 0 }}>
                <button className={`tab-btn ${!isEditingDetails ? 'active' : ''}`} onClick={() => setIsEditingDetails(false)}>
                  Notes &amp; Minutes
                </button>
                <button className={`tab-btn ${isEditingDetails ? 'active' : ''}`} onClick={() => setIsEditingDetails(true)}>
                  Edit Event Details
                </button>
              </div>
              <button 
                type="button" 
                className="btn danger" 
                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => handleDeleteMeeting(activeMeetingForNotes.id)}
              >
                <Trash2 size={12} /> Delete Event
              </button>
            </div>

            {!isEditingDetails ? (
              <form onSubmit={handleNotesUpdate}>
                <div className="form-group">
                  <label>Raw Meeting Notes / Transcript Paste</label>
                  <textarea 
                    rows="6" 
                    placeholder="Paste complete raw transcripts, decisions, or text chat logs..." 
                    value={notesInput.notes} 
                    onChange={e => setNotesInput({...notesInput, notes: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>What was discussed (Pipes directly to Project Chat if linked)</label>
                  <textarea 
                    required 
                    rows="4" 
                    placeholder="Provide a concise bulleted summary of choices made, action items, or client feedback..." 
                    value={notesInput.what_discussed} 
                    onChange={e => setNotesInput({...notesInput, what_discussed: e.target.value})} 
                  />
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn secondary" onClick={() => setActiveMeetingForNotes(null)}>Close</button>
                  <button className="btn primary">Save Notes &amp; Sync Chat</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEditDetailsSubmit}>
                <div className="form-group">
                  <label>Meeting Title</label>
                  <input 
                    type="text" 
                    required 
                    value={editMeetingForm.title} 
                    onChange={e => setEditMeetingForm({...editMeetingForm, title: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Date &amp; Time (9:00 AM – 4:30 PM)</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={editMeetingForm.datetime} 
                    onChange={e => setEditMeetingForm({...editMeetingForm, datetime: e.target.value})} 
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (Mins)</label>
                    <select 
                      value={editMeetingForm.duration} 
                      onChange={e => setEditMeetingForm({...editMeetingForm, duration: parseInt(e.target.value)})}
                    >
                      <option value="15">15 mins</option>
                      <option value="30">30 mins</option>
                      <option value="45">45 mins</option>
                      <option value="60">60 mins</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Recurrence</label>
                    <select 
                      value={editMeetingForm.recurrence} 
                      onChange={e => setEditMeetingForm({...editMeetingForm, recurrence: e.target.value})}
                    >
                      <option value="one-off">One-off</option>
                      <option value="daily">Daily Sync</option>
                      <option value="weekly">Weekly Sync</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Meeting Type</label>
                  <select 
                    value={editMeetingForm.meeting_type} 
                    onChange={e => setEditMeetingForm({...editMeetingForm, meeting_type: e.target.value})}
                  >
                    <option value="standup">Internal Standup</option>
                    <option value="status">Project Sync Status</option>
                    <option value="client-checkin">Client Check-in Call</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Link Project</label>
                  <select 
                    value={editMeetingForm.linked_project_id} 
                    onChange={e => setEditMeetingForm({...editMeetingForm, linked_project_id: e.target.value})}
                  >
                    <option value="">No Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Attendees</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '100px', overflowY: 'auto', padding: '6px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}>
                    {employees.map(emp => (
                      <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', cursor: 'pointer', margin: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={editMeetingForm.attendees.includes(emp.id)} 
                          onChange={() => handleEditAttendeeToggle(emp.id)}
                        />
                        {emp.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn secondary" onClick={() => setActiveMeetingForNotes(null)}>Cancel</button>
                  <button className="btn primary">Save Changes</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

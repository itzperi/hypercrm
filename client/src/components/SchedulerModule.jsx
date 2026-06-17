import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, Plus, FileText } from 'lucide-react';

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

  // Selected meeting for notes/summary
  const [activeMeetingForNotes, setActiveMeetingForNotes] = useState(null);
  const [notesInput, setNotesInput] = useState({ notes: '', what_discussed: '' });

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
                    <option value="daily">Daily Status Sync</option>
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
              <button className="btn gold" style={{ width: '100%' }}>Schedule Event</button>
            </form>
          </div>
        </div>

      </div>

      {/* --- DIALOG: MEETING NOTES & TRANSCRIPT SUMMARIES --- */}
      {activeMeetingForNotes && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px' }}>
            <div className="modal-title">Meeting Notes &amp; Minutes: {activeMeetingForNotes.title}</div>
            <form onSubmit={handleNotesUpdate}>
              <div className="form-group">
                <label>Raw Meeting Notes / Transcript Paste (Fathom/Recording sync)</label>
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
          </div>
        </div>
      )}
    </div>
  );
}

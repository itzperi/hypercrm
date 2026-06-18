import React, { useState, useEffect } from 'react';
import { Megaphone, CalendarDays, Quote, FileEdit, CheckCircle2, Edit, Trash2 } from 'lucide-react';

export default function MarketingModule({ user, showToast }) {
  const [activeTab, setActiveTab] = useState('campaigns');

  const [campaigns, setCampaigns] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [contentTasks, setContentTasks] = useState([]);

  // Campaign Form
  const [campForm, setCampForm] = useState({ name: '', channel: 'LinkedIn', budget: 0, start_date: '', end_date: '' });
  // Testimonial Form
  const [testiForm, setTestiForm] = useState({ client_id: '', text: '', status: 'Requested', published_url: '' });
  // Content Form
  const [contentForm, setContentForm] = useState({ title: '', platform: 'LinkedIn', due_date: '', assignee_id: '' });

  // Editing state
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [editingContentTask, setEditingContentTask] = useState(null);

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    fetch('/api/marketing/campaigns', { headers }).then(res => res.ok ? res.json() : []).then(setCampaigns);
    fetch('/api/marketing/testimonials', { headers }).then(res => res.ok ? res.json() : []).then(setTestimonials);
    fetch('/api/clients', { headers }).then(res => res.ok ? res.json() : []).then(setClients);
    fetch('/api/users', { headers }).then(res => res.ok ? res.json() : []).then(data => setEmployees(data.filter(u => u.role !== 'ClientPortal')));
    fetch('/api/tasks', { headers }).then(res => res.ok ? res.json() : []).then(data => setContentTasks(data.filter(t => t.type === 'Marketing')));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateContentPost = (e) => {
    e.preventDefault();
    fetch('/api/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: contentForm.title,
        description: contentForm.platform, // Platform stored as description
        assignee_id: contentForm.assignee_id,
        due_date: contentForm.due_date,
        type: 'Marketing',
        priority: 'Medium',
        approved: 1
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Marketing content scheduled successfully');
          loadData();
          setContentForm({ title: '', platform: 'LinkedIn', due_date: '', assignee_id: '' });
        }
      });
  };

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    fetch('/api/marketing/campaigns', {
      method: 'POST',
      headers,
      body: JSON.stringify(campForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Marketing Campaign registered');
          loadData();
          setCampForm({ name: '', channel: 'LinkedIn', budget: 0, start_date: '', end_date: '' });
        }
      });
  };

  const handleCreateTestimonial = (e) => {
    e.preventDefault();
    fetch('/api/marketing/testimonials', {
      method: 'POST',
      headers,
      body: JSON.stringify(testiForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Testimonial record logged');
          loadData();
          setTestiForm({ client_id: '', text: '', status: 'Requested', published_url: '' });
        }
      });
  };

  const handleToggleWebsiteUpdate = (testiId, currentStatus) => {
    const testi = testimonials.find(t => t.id === testiId);
    if (!testi) return;

    fetch(`/api/marketing/testimonials/${testiId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...testi,
        website_updated: !currentStatus
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Website log checklist updated');
          loadData();
        }
      });
  };

  const handleDeleteCampaign = (id) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    fetch(`/api/marketing/campaigns/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Campaign deleted successfully');
          loadData();
        }
      });
  };

  const handleEditCampaignSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/marketing/campaigns/${editingCampaign.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingCampaign)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Campaign updated successfully');
          setEditingCampaign(null);
          loadData();
        }
      });
  };

  const handleDeleteTestimonial = (id) => {
    if (!window.confirm("Are you sure you want to delete this testimonial?")) return;
    fetch(`/api/marketing/testimonials/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Testimonial deleted successfully');
          loadData();
        }
      });
  };

  const handleEditTestimonialSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/marketing/testimonials/${editingTestimonial.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingTestimonial)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Testimonial updated successfully');
          setEditingTestimonial(null);
          loadData();
        }
      });
  };

  const handleDeleteContentPost = (id) => {
    if (!window.confirm("Are you sure you want to delete this content post?")) return;
    fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Content post deleted successfully');
          loadData();
        }
      });
  };

  const handleEditContentPostSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/tasks/${editingContentTask.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...editingContentTask,
        type: 'Marketing'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Content post updated successfully');
          setEditingContentTask(null);
          loadData();
        }
      });
  };

  return (
    <div className="crm-page-container">
      <div className="crm-tabs">
        <button className={`tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`} onClick={() => setActiveTab('campaigns')}><Megaphone size={14} /> Campaign ROI Tracker</button>
        <button className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}><CalendarDays size={14} /> Content Calendar</button>
        <button className={`tab-btn ${activeTab === 'testimonials' ? 'active' : ''}`} onClick={() => setActiveTab('testimonials')}><Quote size={14} /> Testimonials Tracker</button>
      </div>

      {/* --- SUBTAB: CAMPAIGNS --- */}
      {activeTab === 'campaigns' && (
        <div className="dashboard-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="panel-card">
              <div className="panel-card-title">Campaign ROI &amp; Attributions</div>
              <div className="crm-table-wrapper">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Campaign Name</th>
                      <th>Channel</th>
                      <th>Budget</th>
                      <th>Attributed Leads</th>
                      <th>ROI Margin</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => {
                      const roi = c.budget > 0 ? Math.round(((c.sales_count * 1000 - c.budget) / c.budget) * 100) : 0;
                      return (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td className="mono">{c.channel}</td>
                          <td className="mono">₹{c.budget.toLocaleString('en-IN')}</td>
                          <td className="mono" style={{ color: 'var(--lime-bright)', fontWeight: 600 }}>{c.leads_count || 0} Leads</td>
                          <td className="amount" style={{ color: 'var(--lime-bright)' }}>
                            {c.budget > 0 ? `${roi >= 0 ? '+' : ''}${roi}%` : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn secondary" 
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => setEditingCampaign(c)}
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                className="btn danger" 
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => handleDeleteCampaign(c.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No active marketing campaigns.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="panel-card">
              <div className="panel-card-title gold">Register Campaign</div>
              <form onSubmit={handleCreateCampaign}>
                <div className="form-group">
                  <label>Campaign Name</label>
                  <input type="text" required value={campForm.name} onChange={e => setCampForm({...campForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Ad Channel</label>
                  <select value={campForm.channel} onChange={e => setCampForm({...campForm, channel: e.target.value})}>
                    <option>LinkedIn</option>
                    <option>Google Ads</option>
                    <option>X Outbound</option>
                    <option>Retargeting</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget Allocation (₹)</label>
                  <input type="number" min="0" required value={campForm.budget} onChange={e => setCampForm({...campForm, budget: parseFloat(e.target.value) || 0})} />
                </div>
                <button className="btn gold" style={{ width: '100%' }}>Launch Campaign</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB: CONTENT CALENDAR --- */}
      {activeTab === 'content' && (
        <div className="dashboard-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="panel-card">
              <div className="panel-card-title">Content Release Calendar Board</div>
              <div className="crm-table-wrapper">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Post Date</th>
                      <th>Topic Summary</th>
                      <th>Platform</th>
                      <th>Assignee</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentTasks.length > 0 ? contentTasks.map(t => (
                      <tr key={t.id}>
                        <td className="mono">{t.due_date || '—'}</td>
                        <td>{t.title}</td>
                        <td className="mono">{t.description || 'LinkedIn'}</td>
                        <td>{t.assignee_name || 'Unassigned'}</td>
                        <td>
                          <span className={`badge ${t.status === 'Done' ? 'success' : t.status === 'In Progress' ? 'warning' : 'info'}`}>
                            {t.status === 'Done' ? 'Published' : t.status === 'In Progress' ? 'In Progress' : 'Drafted'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn secondary" 
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => setEditingContentTask(t)}
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              className="btn danger" 
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => handleDeleteContentPost(t.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0' }}>No scheduled marketing content.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="panel-card">
              <div className="panel-card-title gold">Schedule Content Post</div>
              <form onSubmit={handleCreateContentPost}>
                <div className="form-group">
                  <label>Topic / Title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Twilio Voice Agent Showcase"
                    value={contentForm.title} 
                    onChange={e => setContentForm({...contentForm, title: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Platform</label>
                  <select 
                    value={contentForm.platform} 
                    onChange={e => setContentForm({...contentForm, platform: e.target.value})}
                  >
                    <option>LinkedIn</option>
                    <option>YouTube</option>
                    <option>X (Twitter)</option>
                    <option>Instagram</option>
                    <option>Medium Blog</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assignee Staff</label>
                  <select 
                    required 
                    value={contentForm.assignee_id} 
                    onChange={e => setContentForm({...contentForm, assignee_id: e.target.value})}
                  >
                    <option value="">Select staff...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Scheduled Post Date</label>
                  <input 
                    type="date" 
                    required 
                    value={contentForm.due_date} 
                    onChange={e => setContentForm({...contentForm, due_date: e.target.value})} 
                  />
                </div>
                <button className="btn gold" style={{ width: '100%' }}>Schedule Post</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB: TESTIMONIALS --- */}
      {activeTab === 'testimonials' && (
        <div className="dashboard-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="panel-card">
              <div className="panel-card-title">Client Testimonials &amp; Site Logs</div>
              <div className="crm-table-wrapper">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Quotes Content</th>
                      <th>Status</th>
                      <th>Log: Uploaded to hyperwrike.com</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testimonials.map(t => (
                      <tr key={t.id}>
                        <td>{t.client_company} ({t.client_name})</td>
                        <td style={{ fontStyle: 'italic' }}>"{t.text}"</td>
                        <td><span className="badge success">{t.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="checkbox" 
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                              checked={t.website_updated === 1}
                              onChange={() => handleToggleWebsiteUpdate(t.id, t.website_updated === 1)}
                            />
                            <span style={{ fontSize: '11px', color: t.website_updated === 1 ? 'var(--lime-bright)' : 'var(--text-dim)' }}>
                              {t.website_updated === 1 ? 'Website Updated' : 'Pending Upload'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn secondary" 
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => setEditingTestimonial(t)}
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              className="btn danger" 
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => handleDeleteTestimonial(t.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {testimonials.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No testimonials recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="panel-card">
              <div className="panel-card-title gold">Log Testimonial Quote</div>
              <form onSubmit={handleCreateTestimonial}>
                <div className="form-group">
                  <label>Select Client</label>
                  <select required value={testiForm.client_id} onChange={e => setTestiForm({...testiForm, client_id: e.target.value})}>
                    <option value="">Choose client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quote Content Text</label>
                  <textarea required rows="4" placeholder="Paste feedback quotes here..." value={testiForm.text} onChange={e => setTestiForm({...testiForm, text: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={testiForm.status} onChange={e => setTestiForm({...testiForm, status: e.target.value})}>
                    <option>Requested</option>
                    <option>Received</option>
                    <option>Published</option>
                  </select>
                </div>
                <button className="btn gold" style={{ width: '100%' }}>Log Feedback</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CAMPAIGN MODAL */}
      {editingCampaign && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Campaign: {editingCampaign.name}</div>
            <form onSubmit={handleEditCampaignSubmit}>
              <div className="form-group">
                <label>Campaign Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingCampaign.name} 
                  onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Ad Channel</label>
                <select 
                  value={editingCampaign.channel} 
                  onChange={e => setEditingCampaign({...editingCampaign, channel: e.target.value})}
                >
                  <option>LinkedIn</option>
                  <option>Google Ads</option>
                  <option>X Outbound</option>
                  <option>Retargeting</option>
                </select>
              </div>
              <div className="form-group">
                <label>Budget Allocation (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={editingCampaign.budget} 
                  onChange={e => setEditingCampaign({...editingCampaign, budget: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    value={editingCampaign.start_date || ''} 
                    onChange={e => setEditingCampaign({...editingCampaign, start_date: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    value={editingCampaign.end_date || ''} 
                    onChange={e => setEditingCampaign({...editingCampaign, end_date: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Attributed Leads</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editingCampaign.leads_count || 0} 
                    onChange={e => setEditingCampaign({...editingCampaign, leads_count: parseInt(e.target.value) || 0})} 
                  />
                </div>
                <div className="form-group">
                  <label>Sales Count</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editingCampaign.sales_count || 0} 
                    onChange={e => setEditingCampaign({...editingCampaign, sales_count: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingCampaign(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTENT TASK MODAL */}
      {editingContentTask && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Content Post</div>
            <form onSubmit={handleEditContentPostSubmit}>
              <div className="form-group">
                <label>Topic / Title</label>
                <input 
                  type="text" 
                  required 
                  value={editingContentTask.title} 
                  onChange={e => setEditingContentTask({...editingContentTask, title: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select 
                  value={editingContentTask.description || 'LinkedIn'} 
                  onChange={e => setEditingContentTask({...editingContentTask, description: e.target.value})}
                >
                  <option>LinkedIn</option>
                  <option>YouTube</option>
                  <option>X (Twitter)</option>
                  <option>Instagram</option>
                  <option>Medium Blog</option>
                </select>
              </div>
              <div className="form-group">
                <label>Assignee Staff</label>
                <select 
                  required 
                  value={editingContentTask.assignee_id || ''} 
                  onChange={e => setEditingContentTask({...editingContentTask, assignee_id: e.target.value})}
                >
                  <option value="">Select staff...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Scheduled Post Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingContentTask.due_date || ''} 
                  onChange={e => setEditingContentTask({...editingContentTask, due_date: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={editingContentTask.status || 'To Do'} 
                  onChange={e => setEditingContentTask({...editingContentTask, status: e.target.value})}
                >
                  <option value="To Do">Drafted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Published</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingContentTask(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TESTIMONIAL MODAL */}
      {editingTestimonial && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Testimonial Quote</div>
            <form onSubmit={handleEditTestimonialSubmit}>
              <div className="form-group">
                <label>Select Client</label>
                <select 
                  required 
                  value={editingTestimonial.client_id || ''} 
                  onChange={e => setEditingTestimonial({...editingTestimonial, client_id: e.target.value})}
                >
                  <option value="">Choose client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quote Content Text</label>
                <textarea 
                  required 
                  rows="4" 
                  value={editingTestimonial.text || ''} 
                  onChange={e => setEditingTestimonial({...editingTestimonial, text: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={editingTestimonial.status || 'Requested'} 
                  onChange={e => setEditingTestimonial({...editingTestimonial, status: e.target.value})}
                >
                  <option>Requested</option>
                  <option>Received</option>
                  <option>Published</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingTestimonial(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

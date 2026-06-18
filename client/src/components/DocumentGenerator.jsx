import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { Download, Save, Plus, Trash2 } from 'lucide-react';

export default function DocumentGenerator({ initialData, user, showToast }) {
  const [tab, setTab] = useState('proposal'); // proposal | contract | sow | invoice
  const [scale, setScale] = useState(0.55);
  const previewRef = useRef(null);

  // Core Form State
  const [formData, setFormData] = useState({
    client: {
      name: initialData?.client?.name || '',
      company: initialData?.client?.company || '',
      address: initialData?.client?.address || '',
      gstin: initialData?.client?.gstin || ''
    },
    project: {
      title: initialData?.project?.title || '',
      overview: initialData?.project?.overview || '',
      date: initialData?.project?.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      validDays: initialData?.project?.validDays || '15',
      dueDate: initialData?.project?.dueDate || ''
    },
    deliverables: initialData?.deliverables || [''],
    timeline: initialData?.timeline || [{ phase: 'Phase 1', detail: 'General Scope' }],
    lineItems: initialData?.lineItems || [{ desc: 'AI Platform Implementation', qty: 1, rate: 800 }],
    commercials: {
      currency: initialData?.commercials?.currency || '₹',
      gstEnabled: initialData?.commercials?.gstEnabled !== undefined ? initialData?.commercials?.gstEnabled : true,
      gstRate: initialData?.commercials?.gstRate || '18',
      advancePct: initialData?.commercials?.advancePct || '50',
      paymentNote: initialData?.commercials?.paymentNote || '',
      showPricing: initialData?.commercials?.showPricing !== undefined ? initialData?.commercials?.showPricing : true
    },
    contract: {
      term: initialData?.contract?.term || '12 months',
      noticeDays: initialData?.contract?.noticeDays || '30',
      latePct: initialData?.contract?.latePct || '1.5',
      governingLaw: initialData?.contract?.governingLaw || 'India',
      jurisdiction: initialData?.contract?.jurisdiction || 'Chittoor, Andhra Pradesh'
    }
  });

  // Auto scale A4 canvas
  useEffect(() => {
    const handleResize = () => {
      if (!previewRef.current) return;
      const w = previewRef.current.clientWidth - 40;
      const sheetPx = 794; // 210mm in pixels at 96 DPI
      setScale(Math.min(0.9, Math.max(0.3, w / sheetPx)));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute reference code family
  const getReferenceCodes = () => {
    const initials = (formData.client.company || formData.client.name || 'CLT')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z]/g, 'PRM');

    const year = formData.project.date.match(/\d{4}/) 
      ? formData.project.date.match(/\d{4}/)[0] 
      : new Date().getFullYear().toString();

    return {
      proposal: `HW-PROP-${initials}-${year}-001`,
      contract: `HW-CC-${initials}-${year}-001`,
      sow: `HW-SOW-${initials}-${year}-001`,
      invoice: `HW-INV-${initials}-${year}-001`
    };
  };

  const refs = getReferenceCodes();

  // Helper calculation values
  const computeTotals = () => {
    const validItems = formData.lineItems.filter(i => i.desc && i.rate > 0);
    const subtotal = validItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const gstRate = formData.commercials.gstEnabled ? parseFloat(formData.commercials.gstRate) || 0 : 0;
    const gst = subtotal * (gstRate / 100);
    const total = subtotal + gst;
    const advPct = parseFloat(formData.commercials.advancePct) || 50;
    const advance = total * (advPct / 100);
    const balance = total - advance;

    return {
      subtotal,
      gst,
      total,
      advance,
      balance,
      cur: formData.commercials.currency,
      advPct
    };
  };

  const totals = computeTotals();

  // PDF Export
  const handleExportPDF = () => {
    const node = document.getElementById(`print-stage-${tab}`);
    if (!node) return;

    const filename = `Hyperwrike-${tab.toUpperCase()}-${(formData.client.company || formData.client.name).replace(/\s+/g, '-')}.pdf`;
    
    const opt = {
      margin: [12, 0, 12, 0],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.signatures', '.headline-figure', '.party', 'header', 'footer'] }
    };

    html2pdf().set(opt).from(node).save();
    showToast(`${tab.toUpperCase()} PDF Download started.`);
  };

  // Sync to database
  const handleSaveToDatabase = () => {
    const token = localStorage.getItem('token');
    fetch('/api/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: 1, // linked to Dr Parma placeholder
        type: tab,
        reference_no: refs[tab],
        content: formData
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast(`Document saved successfully under Ref: ${refs[tab]}`);
        }
      });
  };

  // Inline styling for documents preview
  const docStyle = `
    .pdf-body {
      background: white;
      color: #15203A;
      font-family: 'DM Sans', sans-serif;
      padding: 16mm 18mm;
      width: 210mm;
      min-height: 297mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
      text-align: left;
    }
    .pdf-body::before {
      content: "";
      position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, #A6E635 0%, #A6E635 38%, transparent 38%, transparent 62%, #A6842C 62%, #A6842C 100%);
    }
    .pdf-body h1, .pdf-body h2, .pdf-body h3 { font-family: 'Sora', sans-serif; }
    .pdf-body .letterhead { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(21,32,58,0.14); padding-bottom: 16px; margin-bottom: 22px; }
    .pdf-body .brand { display: flex; align-items: center; gap: 12px; }
    .pdf-body .brand-name { font-weight: 800; font-size: 23px; color: #15203A; line-height: 1; }
    .pdf-body .brand-tag { font-family: 'Space Grotesk', sans-serif; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: #5A6B82; margin-top: 6px; }
    .pdf-body .contact { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 8.5px; line-height: 1.75; color: #5A6B82; }
    .pdf-body .contact a { color: #4C7A0C; text-decoration: none; }
    .pdf-body .doc-head { margin-bottom: 20px; }
    .pdf-body .doc-type { font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.32em; font-size: 10px; color: #4C7A0C; font-weight: 600; }
    .pdf-body .doc-title { font-weight: 700; font-size: 26px; margin: 8px 0 14px; line-height: 1.1; color: #15203A; }
    .pdf-body .doc-meta { display: flex; border: 1px solid rgba(21,32,58,0.14); border-radius: 4px; background: rgba(21,32,58,0.03); }
    .pdf-body .doc-meta .cell { padding: 9px 16px 8px; border-right: 1px solid rgba(21,32,58,0.14); flex: 1; }
    .pdf-body .doc-meta .cell:last-child { border-right: none; }
    .pdf-body .doc-meta .k { font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.14em; font-size: 7.5px; color: #8A98AB; }
    .pdf-body .doc-meta .v { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #15203A; margin-top: 3px; }
    .pdf-body .doc-meta .v.accent { color: #4C7A0C; font-weight: 600; }
    .pdf-body .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }
    .pdf-body .party { background: #F3F6FA; border: 1px solid rgba(21,32,58,0.14); border-left: 3px solid #4C7A0C; border-radius: 4px; padding: 13px 16px; }
    .pdf-body .party.client { border-left-color: #A6842C; }
    .pdf-body .party .role { font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.2em; font-size: 8px; color: #8A98AB; margin-bottom: 6px; }
    .pdf-body .party .pname { font-weight: 600; font-size: 15px; }
    .pdf-body .party .pdetail { font-size: 10px; color: #5A6B82; margin-top: 4px; line-height: 1.5; }
    .pdf-body .content { padding-left: 18px; border-left: 3px solid #4C7A0C; }
    .pdf-body .content.gold-edge { border-left-color: #A6842C; }
    .pdf-body section.block { margin-bottom: 18px; }
    .pdf-body .section-heading { font-weight: 700; font-size: 13px; text-transform: uppercase; color: #4C7A0C; border-bottom: 0.5px solid rgba(76,122,12,0.32); padding-bottom: 5px; margin-bottom: 11px; display: flex; align-items: baseline; gap: 9px; }
    .pdf-body .section-heading .num { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #8A98AB; }
    .pdf-body p.lead { font-size: 10.5px; color: #2A3650; line-height: 1.62; margin-bottom: 9px; }
    .pdf-body table.tbl { width: 100%; border-collapse: collapse; font-size: 9.5px; border: 1px solid rgba(21,32,58,0.14); }
    .pdf-body table.tbl thead th { background: #E7EEF6; color: #4C7A0C; font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; font-size: 8px; font-weight: 600; text-align: left; padding: 8px 12px; }
    .pdf-body table.tbl tbody td { padding: 7px 12px; border-bottom: 0.5px solid rgba(21,32,58,0.14); color: #2A3650; }
    .pdf-body table.tbl td.num { text-align: right; font-family: 'JetBrains Mono', monospace; }
    .pdf-body table.tbl tr.total td { background: rgba(166,230,53,0.20) !important; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #4C7A0C; font-size: 10.5px; }
    .pdf-body .headline-figure { display: flex; align-items: baseline; gap: 14px; background: #F3F6FA; border: 1px solid rgba(76,122,12,0.32); border-radius: 6px; padding: 16px 20px; margin: 4px 0 12px; }
    .pdf-body .headline-figure .big { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 28px; color: #4C7A0C; line-height: 1; }
    .pdf-body .headline-figure .cap { font-size: 10px; color: #5A6B82; }
    .pdf-body .headline-figure .cap strong { color: #15203A; display: block; font-size: 12px; font-weight: 600; }
    .pdf-body ul.ticks { list-style: none; }
    .pdf-body ul.ticks li { position: relative; padding: 4px 0 4px 22px; font-size: 10px; color: #2A3650; }
    .pdf-body ul.ticks li::before { content: ""; position: absolute; left: 2px; top: 9px; width: 9px; height: 9px; border: 1.5px solid #4C7A0C; border-radius: 2px; background: rgba(166,230,53,0.20); }
    .pdf-body ol.steps { counter-reset: step; list-style: none; }
    .pdf-body ol.steps li { position: relative; padding: 5px 0 5px 30px; font-size: 10px; color: #2A3650; }
    .pdf-body ol.steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: 4px; width: 19px; height: 19px; display: grid; place-items: center; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 600; color: white; background: #4C7A0C; border-radius: 50%; }
    .pdf-body .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; margin-top: auto; padding-top: 16px; border-top: 0.5px solid rgba(166,132,44,0.40); }
    .pdf-body .sig .sig-for { font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.18em; font-size: 8.5px; color: #4C7A0C; margin-bottom: 18px; }
    .pdf-body .sig .sig-field { margin-bottom: 13px; }
    .pdf-body .sig .sig-line { border-bottom: 1px solid rgba(76,122,12,0.32); height: 17px; }
    .pdf-body .sig .fl { font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.12em; font-size: 7.5px; color: #8A98AB; margin-top: 4px; }
    .pdf-body .page-footer { margin-top: 20px; padding-top: 10px; border-top: 0.5px solid rgba(166,132,44,0.40); display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 7.5px; color: #8A98AB; }
  `;

  return (
    <div className="doc-gen-layout">
      {/* Styles injected to ensure the rendering matches brand.css exactly */}
      <style>{docStyle}</style>

      {/* LEFT FORM COLUMN */}
      <div className="doc-gen-form">
        <div className="panel-card">
          <div className="panel-card-title">1. Client &amp; Overview Info</div>
          <div className="form-row">
            <div className="form-group">
              <label>Client Name</label>
              <input type="text" value={formData.client.name} onChange={e => setFormData({...formData, client: {...formData.client, name: e.target.value}})} />
            </div>
            <div className="form-group">
              <label>Business / Company</label>
              <input type="text" value={formData.client.company} onChange={e => setFormData({...formData, client: {...formData.client, company: e.target.value}})} />
            </div>
          </div>
          <div className="form-group">
            <label>Exclusions &amp; Notes</label>
            <textarea rows="3" value={formData.client.address} onChange={e => setFormData({...formData, client: {...formData.client, address: e.target.value}})} />
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-title gold">2. Scope &amp; Deliverables List</div>
          {formData.deliverables.map((deliv, index) => (
            <div key={index} className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="text" value={deliv} onChange={e => {
                const updated = [...formData.deliverables];
                updated[index] = e.target.value;
                setFormData({...formData, deliverables: updated});
              }} />
              <button className="btn danger" style={{ padding: '8px' }} onClick={() => {
                const updated = formData.deliverables.filter((_, i) => i !== index);
                setFormData({...formData, deliverables: updated});
              }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button className="btn secondary" onClick={() => setFormData({...formData, deliverables: [...formData.deliverables, '']})}>
            <Plus size={14} /> Add Deliverable Item
          </button>
        </div>

        <div className="panel-card">
          <div className="panel-card-title">3. Timeline Phased Plan</div>
          {formData.timeline.map((item, index) => (
            <div key={index} className="form-row" style={{ alignItems: 'center', marginBottom: '8px' }}>
              <input style={{ width: '120px' }} type="text" placeholder="e.g. Week 1" value={item.phase} onChange={e => {
                const updated = [...formData.timeline];
                updated[index].phase = e.target.value;
                setFormData({...formData, timeline: updated});
              }} />
              <input type="text" placeholder="Activity details" value={item.detail} onChange={e => {
                const updated = [...formData.timeline];
                updated[index].detail = e.target.value;
                setFormData({...formData, timeline: updated});
              }} />
              <button className="btn danger" style={{ padding: '8px', flexShrink: 0 }} onClick={() => {
                const updated = formData.timeline.filter((_, i) => i !== index);
                setFormData({...formData, timeline: updated});
              }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button className="btn secondary" onClick={() => setFormData({...formData, timeline: [...formData.timeline, { phase: '', detail: '' }]})}>
            <Plus size={14} /> Add Phase Row
          </button>
        </div>

        <div className="panel-card">
          <div className="panel-card-title gold">4. Pricing Line Items</div>
          {formData.lineItems.map((item, index) => (
            <div key={index} className="form-row" style={{ marginBottom: '8px', gridTemplateColumns: '2fr 80px 100px auto' }}>
              <input type="text" placeholder="Service description" value={item.desc} onChange={e => {
                const updated = [...formData.lineItems];
                updated[index].desc = e.target.value;
                setFormData({...formData, lineItems: updated});
              }} />
              <input type="number" placeholder="Qty" value={item.qty} onChange={e => {
                const updated = [...formData.lineItems];
                updated[index].qty = parseInt(e.target.value) || 0;
                setFormData({...formData, lineItems: updated});
              }} />
              <input type="number" placeholder="Rate" value={item.rate} onChange={e => {
                const updated = [...formData.lineItems];
                updated[index].rate = parseFloat(e.target.value) || 0.0;
                setFormData({...formData, lineItems: updated});
              }} />
              <button className="btn danger" style={{ padding: '8px' }} onClick={() => {
                const updated = formData.lineItems.filter((_, i) => i !== index);
                setFormData({...formData, lineItems: updated});
              }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button className="btn secondary" onClick={() => setFormData({...formData, lineItems: [...formData.lineItems, { desc: '', qty: 1, rate: 0 }]})}>
            <Plus size={14} /> Add Pricing Row
          </button>
        </div>
      </div>

      {/* RIGHT PREVIEW COLUMN */}
      <div className="doc-gen-preview" ref={previewRef}>
        <div className="preview-actions">
          <div className="crm-tabs" style={{ margin: 0, border: 'none' }}>
            <button className={`tab-btn ${tab === 'proposal' ? 'active' : ''}`} onClick={() => setTab('proposal')}>Proposal</button>
            <button className={`tab-btn ${tab === 'contract' ? 'active' : ''}`} onClick={() => setTab('contract')}>Contract</button>
            <button className={`tab-btn ${tab === 'sow' ? 'active' : ''}`} onClick={() => setTab('sow')}>Scope of Work</button>
            <button className={`tab-btn ${tab === 'invoice' ? 'active' : ''}`} onClick={() => setTab('invoice')}>Invoice</button>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn primary" onClick={handleExportPDF}><Download size={14} /> Download</button>
            <button className="btn gold" onClick={handleSaveToDatabase}><Save size={14} /> Save to Portal</button>
          </div>
        </div>

        <div className="preview-canvas-scroll">
          <div 
            className="preview-scaler" 
            style={{ 
              transform: `scale(${scale})`, 
              width: '210mm', 
              height: `calc(297mm * ${scale})`
            }}
          >
            {/* --- HTML A4 SHEET: PROPOSAL --- */}
            {tab === 'proposal' && (
              <div id="print-stage-proposal" className="pdf-body">
                <header className="letterhead">
                  <div className="brand">
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                      <rect fill="#15203A" x="3" y="30" width="7" height="14" rx="2" />
                      <rect fill="#15203A" x="13" y="24" width="7" height="20" rx="2" />
                      <rect fill="#15203A" x="23" y="16" width="7" height="28" rx="2" />
                      <path d="M4 35 L41 10" stroke="#A6E635" strokeWidth="2.6" strokeLinecap="round" />
                      <circle cx="41.5" cy="9.5" r="4" fill="#A6E635" />
                    </svg>
                    <div>
                      <div className="brand-name">Hyperwrike</div>
                      <div className="brand-tag">AI Voice &amp; Automation Solutions</div>
                    </div>
                  </div>
                  <div className="contact">
                    <div>hello@hyperwrike.com · www.hyperwrike.com</div>
                    <div className="addr">Chittoor, Andhra Pradesh — 517001, India</div>
                  </div>
                </header>
                
                <div className="doc-head">
                  <div className="doc-type">Commercial Proposal</div>
                  <h1 className="doc-title">{formData.project.title || 'Project Proposal'}</h1>
                  <div className="doc-meta">
                    <div className="cell"><div class="k">Reference</div><div className="v accent">{refs.proposal}</div></div>
                    <div className="cell"><div class="k">Effective Date</div><div className="v">{formData.project.date}</div></div>
                    <div className="cell"><div class="k">Valid For</div><div className="v">{formData.project.validDays} Days</div></div>
                  </div>
                </div>

                <div className="parties">
                  <div className="party">
                    <div className="role">Service Provider</div>
                    <div className="pname">Hyperwrike</div>
                    <div className="pdetail">Chittoor, Andhra Pradesh — 517001, India</div>
                  </div>
                  <div className="party client">
                    <div className="role">Client</div>
                    <div className="pname">{formData.client.company || formData.client.name}</div>
                    <div className="pdetail">{formData.client.name} · USA</div>
                  </div>
                </div>

                <div className="content">
                  <section className="block">
                    <div className="section-heading"><span className="num">01</span> Project Scope &amp; Objectives</div>
                    <p className="lead">{formData.project.overview || 'AI integrations proposal.'}</p>
                  </section>

                  <section className="block">
                    <div className="section-heading"><span className="num">02</span> Deliverables Checklist</div>
                    <ul className="ticks">
                      {formData.deliverables.map((d, i) => d ? <li key={i}>{d}</li> : null)}
                    </ul>
                  </section>

                  {formData.commercials.showPricing && (
                    <section className="block">
                      <div className="section-heading"><span className="num">03</span> Commercial Summary</div>
                      <div className="headline-figure">
                        <div className="big">{totals.cur}{totals.total}</div>
                        <div className="cap">
                          <strong>Total Project Value</strong>
                          {formData.commercials.gstEnabled ? 'Inclusive of 18% GST' : 'Taxes as applicable'}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <footer className="page-footer">
                  <div className="left">{refs.proposal}</div>
                  <div className="center">Page 1 of 1</div>
                  <div className="right">Confidential — {formData.client.company || formData.client.name}</div>
                </footer>
              </div>
            )}

            {/* --- HTML A4 SHEET: CONTRACT --- */}
            {tab === 'contract' && (
              <div id="print-stage-contract" className="pdf-body">
                <header className="letterhead">
                  <div className="brand">
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                      <rect fill="#15203A" x="3" y="30" width="7" height="14" rx="2" />
                      <rect fill="#15203A" x="13" y="24" width="7" height="20" rx="2" />
                      <rect fill="#15203A" x="23" y="16" width="7" height="28" rx="2" />
                      <path d="M4 35 L41 10" stroke="#A6E635" strokeWidth="2.6" strokeLinecap="round" />
                      <circle cx="41.5" cy="9.5" r="4" fill="#A6E635" />
                    </svg>
                    <div>
                      <div className="brand-name">Hyperwrike</div>
                      <div className="brand-tag">AI Voice &amp; Automation Solutions</div>
                    </div>
                  </div>
                  <div className="contact">
                    <div>hello@hyperwrike.com · www.hyperwrike.com</div>
                    <div className="addr">Chittoor, Andhra Pradesh — 517001, India</div>
                  </div>
                </header>

                <div className="doc-head">
                  <div className="doc-type">Client Service Contract</div>
                  <h1 className="doc-title">{formData.project.title || 'Client Service Contract'}</h1>
                  <div className="doc-meta">
                    <div className="cell"><div class="k">Reference</div><div className="v accent">{refs.contract}</div></div>
                    <div className="cell"><div class="k">Effective</div><div className="v">{formData.project.date}</div></div>
                    <div className="cell"><div class="k">Governing Law</div><div className="v">{formData.contract.governingLaw}</div></div>
                  </div>
                </div>

                <div className="parties">
                  <div className="party">
                    <div className="role">Service Provider</div>
                    <div className="pname">Hyperwrike</div>
                    <div className="pdetail">Chittoor, Andhra Pradesh — 517001, India</div>
                  </div>
                  <div className="party client">
                    <div className="role">Client</div>
                    <div className="pname">{formData.client.company || formData.client.name}</div>
                    <div className="pdetail">{formData.client.name} · USA</div>
                  </div>
                </div>

                <div className="content">
                  <p className="lead" style={{ marginBottom: '14px' }}>
                    This Agreement governs the development and operation of the AI agent platform designed for the Client. SOW reference ({refs.sow}) is incorporated by reference.
                  </p>

                  <section className="block">
                    <div className="section-heading"><span className="num">1</span> Commercials &amp; Payment</div>
                    <table className="tbl">
                      <tbody>
                        <tr>
                          <td style={{ width: '30%' }}>Setup Fee</td>
                          <td style={{ color: '#4C7A0C', fontWeight: 600 }}>{totals.cur}{totals.advance}</td>
                          <td>One-time, due on signing. Development begins immediately.</td>
                        </tr>
                        <tr>
                          <td>Operate &amp; Maintain</td>
                          <td style={{ color: '#4C7A0C', fontWeight: 600 }}>{totals.cur}{totals.balance}/mo</td>
                          <td>Hosting, AI agent routing, and support.</td>
                        </tr>
                      </tbody>
                    </table>
                  </section>

                  <section className="block">
                    <div className="section-heading"><span className="num">2</span> Key Terms</div>
                    <table className="tbl">
                      <tbody>
                        <tr><td style={{ width: '30%' }}>Governing Law</td><td>{formData.contract.governingLaw}</td></tr>
                        <tr><td>Cancellation</td><td><strong>{formData.contract.noticeDays}-day written notice</strong> for monthly services.</td></tr>
                        <tr><td>IP - Dashboard</td><td>Dashboard code owned by Client on full payment.</td></tr>
                        <tr><td>IP - Model weights</td><td>AI model weights remain Hyperwrike IP.</td></tr>
                      </tbody>
                    </table>
                  </section>
                </div>

                <div className="signatures">
                  <div className="sig">
                    <div className="sig-for">For <span className="co">Hyperwrike</span></div>
                    <div className="sig-field"><div className="sig-line"></div><div className="fl">Name &amp; Designation</div></div>
                  </div>
                  <div className="sig">
                    <div className="sig-for">For <span className="co">{formData.client.name}</span></div>
                    <div className="sig-field"><div className="sig-line"></div><div className="fl">Signature &amp; Date</div></div>
                  </div>
                </div>

                <footer className="page-footer">
                  <div className="left">{refs.contract}</div>
                  <div className="center">Page 1 of 1</div>
                  <div className="right">Confidential — {formData.client.company || formData.client.name}</div>
                </footer>
              </div>
            )}

            {/* --- HTML A4 SHEET: SOW --- */}
            {tab === 'sow' && (
              <div id="print-stage-sow" className="pdf-body">
                <header className="letterhead">
                  <div className="brand">
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                      <rect fill="#15203A" x="3" y="30" width="7" height="14" rx="2" />
                      <rect fill="#15203A" x="13" y="24" width="7" height="20" rx="2" />
                      <rect fill="#15203A" x="23" y="16" width="7" height="28" rx="2" />
                      <path d="M4 35 L41 10" stroke="#A6E635" strokeWidth="2.6" strokeLinecap="round" />
                      <circle cx="41.5" cy="9.5" r="4" fill="#A6E635" />
                    </svg>
                    <div>
                      <div className="brand-name">Hyperwrike</div>
                      <div className="brand-tag">AI Voice &amp; Automation Solutions</div>
                    </div>
                  </div>
                  <div className="contact">
                    <div>hello@hyperwrike.com · www.hyperwrike.com</div>
                    <div className="addr">Chittoor, Andhra Pradesh — 517001, India</div>
                  </div>
                </header>

                <div className="doc-head">
                  <div className="doc-type">Scope of Work</div>
                  <h1 className="doc-title">SOW — {formData.project.title || 'Implementation'}</h1>
                  <div className="doc-meta">
                    <div className="cell"><div class="k">Reference</div><div className="v accent">{refs.sow}</div></div>
                    <div className="cell"><div class="k">Date</div><div className="v">{formData.project.date}</div></div>
                    <div className="cell"><div class="k">Contract Link</div><div className="v">{refs.contract}</div></div>
                  </div>
                </div>

                <div className="content">
                  <section className="block">
                    <div className="section-heading"><span className="num">1</span> In-Scope Deliverables</div>
                    <ul className="ticks">
                      {formData.deliverables.map((d, i) => d ? <li key={i}>{d}</li> : null)}
                    </ul>
                  </section>

                  <section className="block">
                    <div className="section-heading"><span className="num">2</span> Phased Development Plan</div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th style={{ width: '120px' }}>Phase</th>
                          <th>Task Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.timeline.map((t, i) => t.phase ? (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{t.phase}</td>
                            <td>{t.detail}</td>
                          </tr>
                        ) : null)}
                      </tbody>
                    </table>
                  </section>
                </div>

                <footer className="page-footer">
                  <div className="left">{refs.sow}</div>
                  <div className="center">Page 1 of 1</div>
                  <div className="right">Confidential — {formData.client.company || formData.client.name}</div>
                </footer>
              </div>
            )}

            {/* --- HTML A4 SHEET: INVOICE --- */}
            {tab === 'invoice' && (
              <div id="print-stage-invoice" className="pdf-body">
                <header className="letterhead">
                  <div className="brand">
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                      <rect fill="#15203A" x="3" y="30" width="7" height="14" rx="2" />
                      <rect fill="#15203A" x="13" y="24" width="7" height="20" rx="2" />
                      <rect fill="#15203A" x="23" y="16" width="7" height="28" rx="2" />
                      <path d="M4 35 L41 10" stroke="#A6E635" strokeWidth="2.6" strokeLinecap="round" />
                      <circle cx="41.5" cy="9.5" r="4" fill="#A6E635" />
                    </svg>
                    <div>
                      <div className="brand-name">Hyperwrike</div>
                      <div className="brand-tag">AI Voice &amp; Automation Solutions</div>
                    </div>
                  </div>
                  <div className="contact">
                    <div>hello@hyperwrike.com · www.hyperwrike.com</div>
                    <div className="addr">Chittoor, Andhra Pradesh — 517001, India</div>
                  </div>
                </header>

                <div className="doc-head">
                  <div className="doc-type">Tax Invoice</div>
                  <h1 className="doc-title">Invoice — {formData.project.title || 'Services'}</h1>
                  <div className="doc-meta">
                    <div className="cell"><div class="k">Invoice No.</div><div className="v accent">{refs.invoice}</div></div>
                    <div className="cell"><div class="k">Invoice Date</div><div className="v">{formData.project.date}</div></div>
                    <div className="cell"><div class="k">Contract Link</div><div className="v">{refs.contract}</div></div>
                  </div>
                </div>

                <div className="content gold-edge">
                  <section className="block">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="num">Qty</th>
                          <th className="num">Rate</th>
                          <th className="num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.lineItems.map((item, i) => item.desc ? (
                          <tr key={i}>
                            <td>{item.desc}</td>
                            <td className="num">{item.qty}</td>
                            <td className="num">{totals.cur}{item.rate}</td>
                            <td className="num">{totals.cur}{item.qty * item.rate}</td>
                          </tr>
                        ) : null)}
                        <tr className="total">
                          <td colSpan="3" style={{ textAlign: 'right', fontWeight: 700 }}>Total Amount Due</td>
                          <td className="num" style={{ fontWeight: 700 }}>{totals.cur}{totals.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </section>
                </div>

                <footer className="page-footer">
                  <div className="left">{refs.invoice}</div>
                  <div className="center">Page 1 of 1</div>
                  <div className="right">Confidential — {formData.client.company || formData.client.name}</div>
                </footer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

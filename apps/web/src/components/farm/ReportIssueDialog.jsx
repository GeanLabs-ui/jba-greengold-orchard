import { useRef, useState } from 'react';
import { FileText, MapPin, Paperclip, ClipboardCheck, Eye, UploadCloud, X, CalendarDays, Clock, User, Home, Map, Search, Coins, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import './report-issue-dialog.css';
import { base44 } from '@/api/base44Client';
import IssueAttachmentPreview, { issueAttachmentAccept, issueAttachmentType, maxIssueAttachmentSize } from './IssueAttachmentPreview';

const categories = ['Irrigation', 'Pest & Disease', 'Tools & Equipment', 'Logistics', 'Inventory', 'Workforce / Safety', 'Harvesting', 'Planting'];
const tone = value => ({ Critical:'critical', High:'high', Medium:'medium', Low:'green' }[value] || 'blue');
function Section({ title, icon: Icon, children, className = '' }) {
 return <section className={`ri-section ${className}`}><header><Icon/><div><h3>{title}</h3></div></header>{children}</section>;
}
function Pill({ value }) { return <span className={`ri-pill ri-${tone(value)}`}><i/>{value}</span>; }
export default function ReportIssueDialog({ issueId, issue, onSave, onClose, localPreview = import.meta.env.DEV }) {
 const now = new Date();
 const [form,setForm] = useState({ report_date:now.toLocaleDateString('en-CA',{timeZone:'Africa/Accra'}), report_time:now.toLocaleTimeString('en-GB',{timeZone:'Africa/Accra',hour:'2-digit',minute:'2-digit'}), title:'', category:'Irrigation', severity:'High', source:'Field Inspection', main_farm:'Farm A', block:'A1', reported_by:'', assigned_to:'', owner:'', due:'', status:'Open', description:'', impact:'', corrective_action:'', root_cause:'', action_required:true, escalate:false, estimated_cost:'', related_task:'', resolution:'', ...(issue ? { report_date:'', report_time:'', severity:'', source:'', main_farm:issue.farm?.split(' / ')[0]||'', block:issue.farm?.split(' / ')[1]||'', action_required:false, ...issue, category:issue.category==='Water / Irrigation'?'Irrigation':issue.category } : {}) });
 const [editing,setEditing] = useState(!issue);
 const [attachments,setAttachments] = useState(issue?.attachments || []),[error,setError] = useState(''),[busy,setBusy] = useState(false);
 const [previewAttachment, setPreviewAttachment] = useState(null);
 const fileInput=useRef(null),formRef=useRef(null);
 const change=(key,value)=>setForm(old=>({...old,[key]:value,...(key==='main_farm'?{block:value==='Farm A'?'A1':'B1'}:{})}));
 const field=(key,label,{options,type='text',required=false,icon:Icon,help,placeholder='',className=''}={})=><label className={`ri-field ${className}`}><span>{label}{required&&<b> *</b>}</span><div className="ri-control">{Icon&&<Icon/>}{options?<select value={form[key]} required={required} onChange={e=>change(key,e.target.value)}>{!form[key]&&<option value="">Select…</option>}{[...new Set([...options,form[key]].filter(Boolean))].map(v=><option key={v}>{v}</option>)}</select>:type==='textarea'?<textarea required={required} value={form[key]} placeholder={placeholder} onChange={e=>change(key,e.target.value)}/>:<input type={type} required={required} value={form[key]} min={type==='number'?0:undefined} step={type==='number'?'any':undefined} placeholder={placeholder} onChange={e=>change(key,e.target.value)}/>}</div>{help&&<small>{help}</small>}</label>;
 const addFiles = (files) => {
  const accepted = [];
  const rejected = [];
  for (const selected of files) {
   const contentType = issueAttachmentType(selected);
   if (!contentType || selected.size === 0 || selected.size > maxIssueAttachmentSize) {
    rejected.push(selected.name);
    continue;
   }
   const file = selected.type === contentType
    ? selected
    : new File([selected], selected.name, { type: contentType, lastModified: selected.lastModified });
   accepted.push({ id: crypto.randomUUID(), name: file.name, sizeBytes: file.size, contentType, file });
  }
  setAttachments(previous => [...previous, ...accepted]);
  setError(rejected.length ? `Could not attach ${rejected.join(', ')}. Choose supported files with content, up to 32 MB each.` : '');
  if (fileInput.current) fileInput.current.value = '';
 };
 const save = async draft => {
  if (!draft && !formRef.current.reportValidity()) return;
  setBusy(true);
  setError('');
  try {
   const uploaded = [];
   for (const item of attachments) {
    if (!item.file || localPreview) {
     uploaded.push(item);
     continue;
    }
    const stored = await base44.files.upload(item.file, issue?.id || issueId, { issueAttachment: true });
    uploaded.push(stored);
    setAttachments(previous => previous.map(attachment => attachment.id === item.id ? stored : attachment));
   }
   await onSave({
    ...issue,
    ...form,
    id: issue?.id || issueId,
    title: form.title || 'Untitled issue',
    category: form.category === 'Irrigation' ? 'Water / Irrigation' : form.category,
    farm: `${form.main_farm} / ${form.block}`,
    status: draft ? 'Draft' : form.status,
    record_status: draft ? 'Draft' : 'Active',
    attachments: uploaded,
    created_date: issue?.created_date || new Date().toISOString(),
    ...(issue ? { updated_date: new Date().toISOString() } : {}),
   });
  } catch (failure) {
   setError(failure.message || 'Unable to save this issue. Please retry.');
  } finally {
   setBusy(false);
  }
 };
 const preview=[['Issue ID',FileText,issueId],['Title',FileText,form.title||'—'],['Category',null,form.category],['Severity',FileText,<Pill key="severity" value={form.severity}/>],['Farm / Block',Map,`${form.main_farm} / ${form.block}`],['Reported By',User,form.reported_by||'—'],['Assigned To',User,form.assigned_to||'—'],['Status',Clock,<Pill key="status" value={form.status}/>],['Due Date',CalendarDays,form.due?new Date(`${form.due}T12:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'],['Est. Cost Impact',Coins,`GH₵ ${Number(form.estimated_cost||0).toLocaleString('en-GH')}`]];
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="ri-dialog" data-preserve-colors="true" onInteractOutside={e=>{if(busy)e.preventDefault();}}>
 <DialogTitle className="sr-only">{issue?`Issue ${issueId}`:'Report New Issue'}</DialogTitle><DialogDescription className="sr-only">Capture and assign a newly observed issue or challenge for action and follow-up.</DialogDescription>
 <form ref={formRef} className="ri-layout" onSubmit={e=>{e.preventDefault();void save(false);}}>
 <div className="ri-left">
 <fieldset className="ri-fields" disabled={!editing||busy}>
 <section className="ri-section" aria-label="Basic Issue Information">
 <div className="ri-basic-row"><label className="ri-field"><span>Issue ID</span><input value={issueId} readOnly className="ri-id"/></label>{field('report_date','Report Date',{type:'date',icon:CalendarDays})}{field('report_time','Time Reported',{type:'time',icon:Clock})}{field('title','Issue / Challenge Title',{required:true})}</div>
 <div className="ri-three">{field('category','Category',{required:true,options:categories})}{field('severity','Severity',{required:true,options:['Low','Medium','High','Critical'],icon:()=> <i className={`ri-color-dot ri-${tone(form.severity)}`}/>})}{field('source','Issue Source',{required:true,options:['Field Inspection','Daily Task Log','Risk Analysis','Staff Report','Other'],icon:FileText})}</div>
 </section>
 <Section title="Location & Assignment" icon={MapPin}>
 <div className="ri-three">{field('main_farm','Main Farm',{required:true,options:['Farm A','Farm B'],icon:Home})}{field('block','Exact Block',{required:true,options:[1,2,3,4,5].map(n=>`${form.main_farm==='Farm A'?'A':'B'}${n}`),icon:Map})}{field('reported_by','Reported By',{required:true,icon:User})}</div>
 <div className="ri-four">{field('assigned_to','Assigned To',{required:true,icon:User})}{field('owner','Owner / Responsible Person',{required:true,icon:User})}{field('due','Due Date',{required:true,type:'date',icon:CalendarDays})}{field('status','Status',{required:true,options:['Open','In Progress','Action Required','Resolved','Draft'],icon:()=> <i className="ri-color-dot ri-blue"/>})}</div>
 </Section>
 <Section title="Issue Details" icon={FileText}>
 <div className="ri-two">{field('description','Description of Issue / What was observed',{required:true,type:'textarea'})}{field('impact','Immediate Impact / Risk',{required:true,type:'textarea'})}{field('corrective_action','Immediate Corrective Action Taken',{required:true,type:'textarea'})}{field('root_cause','Root Cause / Suspected Cause',{type:'textarea'})}</div>
 </Section>
 </fieldset>
 <Section title="Evidence & Attachments" icon={Paperclip} className="ri-evidence">
 <div className="ri-attachments">
  {editing && <div className="ri-drop" onDragOver={event => event.preventDefault()} onDrop={event => {
   event.preventDefault();
   if (editing && !busy) addFiles(event.dataTransfer.files);
  }}>
   <UploadCloud/>
   <div>
    <strong>Drag and drop files here</strong>
    <small>Select multiple images, videos or documents together, up to 32 MB each.</small>
    <button className="ri-choose" type="button" disabled={busy} onClick={() => fileInput.current.click()}>Choose Files</button>
   </div>
   <input ref={fileInput} type="file" accept={issueAttachmentAccept} multiple hidden onChange={event => addFiles(event.target.files)}/>
  </div>}
  {attachments.map(attachment => (
   <div className="ri-attachment-row" key={attachment.id}>
    <button type="button" onClick={() => setPreviewAttachment(attachment)} aria-label={`Preview ${attachment.name}`}>
     <FileText/>
     <span>{attachment.name}</span>
     <small>{((attachment.sizeBytes ?? attachment.size ?? 0) / 1024 / 1024).toFixed(1)} MB</small>
    </button>
    {editing && <button type="button" aria-label={`Remove ${attachment.name}`} disabled={busy}
     onClick={() => setAttachments(previous => previous.filter(item => item.id !== attachment.id))}><X/></button>}
   </div>
  ))}
 </div>
 </Section>
 <fieldset className="ri-fields" disabled={!editing||busy}>
 <Section title="Follow-Up / Tracking" icon={ClipboardCheck} className="ri-follow">
 <div className="ri-follow-row"><div className="ri-checks"><label><input type="checkbox" checked={form.action_required} onChange={e=>change('action_required',e.target.checked)}/>Action Required</label><label><input type="checkbox" checked={form.escalate} onChange={e=>change('escalate',e.target.checked)}/>Escalate to Management</label></div>{field('estimated_cost','Estimated Cost Impact (GH₵)',{type:'number',icon:()=> <span className="ri-currency">GH₵</span>})}{field('related_task','Related Farm Activity / Task',{icon:Search})}</div>
 {field('resolution','Resolution Notes (Optional)',{placeholder:'Add notes on resolution or follow-up actions...'})}
 </Section>
 </fieldset>
 </div>
 <aside className="ri-preview"><header><Eye/><div><h3>Issue Preview</h3></div></header><dl>{preview.map(([label,Icon,value])=><div key={label}><dt>{Icon && <Icon/>}{label}</dt><dd>{['Reported By','Assigned To','Farm / Block','Due Date','Est. Cost Impact'].includes(label)&&<Icon/>}{value}</dd></div>)}</dl></aside>
 <footer className="ri-footer">{error&&<p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={onClose}>Cancel</button>{!issue&&<button type="button" className="ri-draft" disabled={busy} onClick={()=>void save(true)}>Save Draft</button>}{issue&&<button type="button" disabled={busy||editing} onClick={()=>setEditing(true)}>Edit</button>}<button type="submit" className="ri-report" disabled={busy||!editing}><Send/>{busy?'Saving…':issue?'Save':'Report Issue'}</button></footer>
 </form>
 {previewAttachment && <IssueAttachmentPreview attachment={previewAttachment} onClose={() => setPreviewAttachment(null)}/>}
 </DialogContent></Dialog>;
}

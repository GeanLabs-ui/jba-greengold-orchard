import { useRef, useState } from 'react';
import { FileText, MapPin, Paperclip, ClipboardCheck, Eye, UploadCloud, X, CalendarDays, Clock, User, Home, Map, Leaf, Search, Coins, Send, CircleCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import './report-issue-dialog.css';
import { base44 } from '@/api/base44Client';

const categories = ['Irrigation', 'Pest & Disease', 'Tools & Equipment', 'Logistics', 'Inventory', 'Workforce / Safety', 'Harvesting', 'Planting'];
const tone = value => ({ Critical:'critical', High:'high', Medium:'medium', Low:'green' }[value] || 'blue');
function Section({ title, description, icon: Icon, children, className = '' }) {
 return <section className={`ri-section ${className}`}><header><Icon/><div><h3>{title}</h3><p>{description}</p></div></header>{children}</section>;
}
function Pill({ value }) { return <span className={`ri-pill ri-${tone(value)}`}><i/>{value}</span>; }
export default function ReportIssueDialog({ issueId, issue, onSave, onClose, localPreview = import.meta.env.DEV }) {
 const now = new Date();
 const [form,setForm] = useState({ report_date:now.toLocaleDateString('en-CA',{timeZone:'Africa/Accra'}), report_time:now.toLocaleTimeString('en-GB',{timeZone:'Africa/Accra',hour:'2-digit',minute:'2-digit'}), title:'', category:'Irrigation', severity:'High', source:'Field Inspection', main_farm:'Farm A', block:'A1', reported_by:'', assigned_to:'', owner:'', due:'', status:'Open', description:'', impact:'', corrective_action:'', root_cause:'', action_required:true, escalate:false, estimated_cost:'', related_task:'', resolution:'', ...(issue ? { report_date:'', report_time:'', severity:'', source:'', main_farm:issue.farm?.split(' / ')[0]||'', block:issue.farm?.split(' / ')[1]||'', action_required:false, ...issue, category:issue.category==='Water / Irrigation'?'Irrigation':issue.category } : {}) });
 const [editing,setEditing] = useState(!issue);
 const [attachments,setAttachments] = useState(issue?.attachments || []),[error,setError] = useState(''),[busy,setBusy] = useState(false);
 const fileInput=useRef(null),formRef=useRef(null);
 const change=(key,value)=>setForm(old=>({...old,[key]:value,...(key==='main_farm'?{block:value==='Farm A'?'A1':'B1'}:{})}));
 const field=(key,label,{options,type='text',required=false,icon:Icon,help,placeholder='',className=''}={})=><label className={`ri-field ${className}`}><span>{label}{required&&<b> *</b>}</span><div className="ri-control">{Icon&&<Icon/>}{options?<select value={form[key]} required={required} onChange={e=>change(key,e.target.value)}>{!form[key]&&<option value="">Select…</option>}{[...new Set([...options,form[key]].filter(Boolean))].map(v=><option key={v}>{v}</option>)}</select>:type==='textarea'?<textarea required={required} value={form[key]} placeholder={placeholder} onChange={e=>change(key,e.target.value)}/>:<input type={type} required={required} value={form[key]} min={type==='number'?0:undefined} step={type==='number'?'any':undefined} placeholder={placeholder} onChange={e=>change(key,e.target.value)}/>}</div>{help&&<small>{help}</small>}</label>;
 const addFiles=async files=>{
  const selected=Array.from(files);setError('');
  if(selected.some(f=>!['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm'].includes(f.type)||f.size>5*1024*1024)){setError('Choose JPG, PNG, WebP, PDF, MP4 or WebM files up to 5MB each.');return;}
  setBusy(true);
  try{const added=await Promise.all(selected.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({id:crypto.randomUUID(),name:file.name,size:file.size,contentType:file.type,url:reader.result,file});reader.onerror=reject;reader.readAsDataURL(file);})));setAttachments(old=>[...old,...added]);}catch{setError('Unable to read these files. Please try again.');}finally{setBusy(false);if(fileInput.current)fileInput.current.value='';}
 };
 const save=async draft=>{
  if(!draft&&!formRef.current.reportValidity())return;
  setBusy(true);setError('');
  try{const uploaded=[];for(const item of attachments){const {file,...stored}=item;uploaded.push(file&&!localPreview?await base44.files.upload(file,issue?.id||issueId):stored);}await onSave({...issue,...form,id:issue?.id||issueId,title:form.title||'Untitled issue',category:form.category==='Irrigation'?'Water / Irrigation':form.category,farm:`${form.main_farm} / ${form.block}`,status:draft?'Draft':form.status,record_status:draft?'Draft':'Active',attachments:uploaded,created_date:issue?.created_date||new Date().toISOString(),...(issue?{updated_date:new Date().toISOString()}:{})});}catch(failure){setError(failure.message||'Unable to save this issue. Please retry.');}finally{setBusy(false);}
 };
 const preview=[['Issue ID',FileText,issueId],['Title',FileText,form.title||'—'],['Category',Leaf,form.category],['Severity',FileText,<Pill key="severity" value={form.severity}/>],['Farm / Block',Map,`${form.main_farm} / ${form.block}`],['Reported By',User,form.reported_by||'—'],['Assigned To',User,form.assigned_to||'—'],['Status',Clock,<Pill key="status" value={form.status}/>],['Due Date',CalendarDays,form.due?new Date(`${form.due}T12:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'],['Est. Cost Impact',Coins,`GH₵ ${Number(form.estimated_cost||0).toLocaleString('en-GH')}`]];
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="ri-dialog" data-preserve-colors="true" onInteractOutside={e=>{if(busy)e.preventDefault();}}>
 <DialogTitle className="sr-only">{issue?`Issue ${issueId}`:'Report New Issue'}</DialogTitle><DialogDescription className="sr-only">Capture and assign a newly observed issue or challenge for action and follow-up.</DialogDescription>
 <form ref={formRef} className="ri-layout" onSubmit={e=>{e.preventDefault();void save(false);}}>
 <fieldset className="ri-left" disabled={!editing||busy}>
 <section className="ri-section" aria-label="Basic Issue Information">
 <div className="ri-basic-row"><label className="ri-field"><span>Issue ID</span><input value={issueId} readOnly className="ri-id"/><small>Auto-generated</small></label>{field('report_date','Report Date',{type:'date',icon:CalendarDays})}{field('report_time','Time Reported',{type:'time',icon:Clock})}{field('title','Issue / Challenge Title',{required:true})}</div>
 <div className="ri-three">{field('category','Category',{required:true,options:categories,icon:Leaf})}{field('severity','Severity',{required:true,options:['Low','Medium','High','Critical'],icon:()=> <i className={`ri-color-dot ri-${tone(form.severity)}`}/>})}{field('source','Issue Source',{required:true,options:['Field Inspection','Daily Task Log','Risk Analysis','Staff Report','Other'],icon:FileText})}</div>
 </section>
 <Section title="Location & Assignment" description="Specify where the issue occurred and who is responsible for action." icon={MapPin}>
 <div className="ri-three">{field('main_farm','Main Farm',{required:true,options:['Farm A','Farm B'],icon:Home})}{field('block','Exact Block',{required:true,options:[1,2,3,4,5].map(n=>`${form.main_farm==='Farm A'?'A':'B'}${n}`),icon:Map})}{field('reported_by','Reported By',{required:true,icon:User})}</div>
 <div className="ri-four">{field('assigned_to','Assigned To',{required:true,icon:User})}{field('owner','Owner / Responsible Person',{required:true,icon:User})}{field('due','Due Date',{required:true,type:'date',icon:CalendarDays})}{field('status','Status',{required:true,options:['Open','In Progress','Action Required','Resolved','Draft'],icon:()=> <i className="ri-color-dot ri-blue"/>})}</div>
 </Section>
 <Section title="Issue Details" description="Describe what was observed, the impact, and any initial analysis." icon={FileText}>
 <div className="ri-two">{field('description','Description of Issue / What was observed',{required:true,type:'textarea'})}{field('impact','Immediate Impact / Risk',{required:true,type:'textarea'})}{field('corrective_action','Immediate Corrective Action Taken',{required:true,type:'textarea'})}{field('root_cause','Root Cause / Suspected Cause',{type:'textarea'})}</div>
 </Section>
 <Section title="Evidence & Attachments" description="Upload photos, documents or add supporting notes." icon={Paperclip} className="ri-evidence">
 <div className="ri-attachments"><div className="ri-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(editing&&!busy)void addFiles(e.dataTransfer.files);}}><UploadCloud/><div><strong>Drag and drop files here, or <button type="button" onClick={()=>fileInput.current.click()} disabled={busy}>click to browse</button></strong><small>Upload photos, videos, PDFs (Max 5MB each)</small><button className="ri-choose" type="button" disabled={busy} onClick={()=>fileInput.current.click()}>Choose Files</button></div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm" multiple hidden onChange={e=>void addFiles(e.target.files)}/></div>{attachments.map(a=><div className="ri-file" key={a.id}><div>{a.contentType?.startsWith('image/')?<a href={a.url} target="_blank" rel="noreferrer" aria-label={`Open ${a.name}`}><img src={a.url} alt={a.name}/></a>:a.contentType?.startsWith('video/')?<video src={a.url} controls preload="metadata" aria-label={a.name}/>:a.contentType==='application/pdf'?<iframe src={a.url} title={a.name}/>:<span><FileText/>{a.name}</span>}{editing&&<button type="button" aria-label={`Remove ${a.name}`} disabled={busy} onClick={()=>setAttachments(old=>old.filter(f=>f.id!==a.id))}><X/></button>}</div><a href={a.url} download={a.name}>{a.name}</a><small>{(a.size/1024/1024).toFixed(1)} MB</small></div>)}</div>
 </Section>
 <Section title="Follow-Up / Tracking" description="Set follow-up actions and additional details for tracking." icon={ClipboardCheck} className="ri-follow">
 <div className="ri-follow-row"><div className="ri-checks"><label><input type="checkbox" checked={form.action_required} onChange={e=>change('action_required',e.target.checked)}/>Action Required</label><label><input type="checkbox" checked={form.escalate} onChange={e=>change('escalate',e.target.checked)}/>Escalate to Management</label></div>{field('estimated_cost','Estimated Cost Impact (GH₵)',{type:'number',icon:()=> <span className="ri-currency">GH₵</span>})}{field('related_task','Related Farm Activity / Task',{icon:Search})}</div>
 {field('resolution','Resolution Notes (Optional)',{placeholder:'Add notes on resolution or follow-up actions...'})}
 </Section>
 </fieldset>
 <aside className="ri-preview"><header><Eye/><div><h3>Issue Preview</h3><p>This is how the issue will be recorded in the system.</p></div></header><dl>{preview.map(([label,Icon,value])=><div key={label}><dt><Icon/>{label}</dt><dd>{['Reported By','Assigned To','Farm / Block','Due Date','Est. Cost Impact','Category'].includes(label)&&<Icon/>}{value}</dd></div>)}</dl><div className="ri-notice"><CircleCheck/><p><strong>This record will be added to the issue register</strong> and activity timeline for tracking, and will be visible to relevant team members based on permissions.</p></div></aside>
 <footer className="ri-footer">{error&&<p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={onClose}>Cancel</button>{!issue&&<button type="button" className="ri-draft" disabled={busy} onClick={()=>void save(true)}>Save Draft</button>}{issue&&<button type="button" disabled={busy||editing} onClick={()=>setEditing(true)}>Edit</button>}<button type="submit" className="ri-report" disabled={busy||!editing}><Send/>{busy?'Saving…':issue?'Save':'Report Issue'}</button></footer>
 </form>
 </DialogContent></Dialog>;
}

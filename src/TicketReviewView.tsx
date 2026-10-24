import {useState} from 'react';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,Building2,Check,Clock3,FileText,History,Link2,MessageSquare,NotebookPen,Plus,RefreshCw,Settings,TriangleAlert,UserRound} from 'lucide-react';
import type {Ticket,ManagerClient} from './domain';
import {label,maskMobile} from './domain';
import {Badge,DateTime,ErrorBox,Loading} from './ui';

type TicketRow=NonNullable<Ticket['rows1']>[number];
type HistoryData=Awaited<ReturnType<ManagerClient['history']>>;
interface Props {
 ticket:TicketRow;fields:NonNullable<Ticket['rows2']>;priority?:string|null;status?:string|null;
 actions:ReactNode;history?:HistoryData;historyLoading:boolean;historyError:unknown;retryHistory:()=>void;
 refresh:()=>void;refreshing:boolean;
}
function InfoRow({name,children}:{name:string;children?:ReactNode}){return <div className="ticket-info-row"><dt>{name}</dt><dd>{children??<span className="not-provided">Not supplied</span>}</dd></div>;}
function InfoCard({title,icon,children,className=''}:{title:string;icon:ReactNode;children:ReactNode;className?:string}){return <section className={'ticket-card '+className}><h2>{icon}{title}</h2>{children}</section>;}
function waited(value?:string|null){if(!value)return 'Not supplied';const n=Math.max(0,Math.floor((Date.now()-Date.parse(value))/60000));return Number.isFinite(n)?n<60?`${n} minutes`:n<1440?`${Math.floor(n/60)} hours ${n%60} minutes`:`${Math.floor(n/1440)} days`:'Not supplied';}
const unavailable='Not enabled in this increment';
export function TicketReviewView({ticket:t,fields,priority,status,actions,history,historyLoading,historyError,retryHistory,refresh,refreshing}:Props){
 const [tab,setTab]=useState('activity');
 const tabs=[['activity','Activity History',History],['notes','Follow-up Notes',NotebookPen],['notifications','Customer Notifications',MessageSquare],['related','Related Information',Link2]] as const;
 const events=[...(history?.activity||[]).map((r,i)=>({key:'a'+(r.activityID??i),time:r.activityAt,title:r.activityTitle||label(r.activityType),detail:label(r.activityType),by:r.performedByRole})),...(history?.status||[]).map((r,i)=>({key:'s'+(r.statusHistoryID??i),time:r.changedAt,title:'Status updated',detail:status&&r.toStatusID===t.currentStatusID?label(status):`Status ID ${r.toStatusID??'—'}`,by:r.changedByRole}))].sort((a,b)=>Date.parse(a.time||'')-Date.parse(b.time||''));
 return <div className="ticket-review-screen">
  <Link className="ticket-back" to="/pending"><ArrowLeft size={16}/>Back to Pending Approvals</Link>
  <div className="ticket-page-grid"><div className="ticket-main-column">
   <div className="ticket-page-title"><h1>Service Request Details</h1><button className="button secondary small" disabled={refreshing} onClick={refresh}><RefreshCw size={15}/>Refresh</button></div>
   <section className={'ticket-summary priority-'+(priority||'unknown').toLowerCase()}><div className="ticket-summary-main"><div><h2>{t.ticketNumber||`Request ${t.requestID}`}</h2><span className="summary-priority"><TriangleAlert size={21}/>{label(priority)} Priority</span></div><p>Submitted on <DateTime value={t.createdAt}/><span className="summary-divider">|</span>Waiting for <strong>{waited(t.createdAt)}</strong></p></div><div className="ticket-status"><i/><div><small>Current Status</small><strong>{label(status||t.approvalStatus)}</strong><span>{t.approvalStatus==='PENDING'?'Awaiting manager review':'Manager decision recorded'}</span></div></div></section>
   <div className="ticket-info-grid customer-service-grid">
    <InfoCard title="Customer Information" icon={<UserRound size={21}/>}><div className="customer-info-columns"><dl><InfoRow name="Customer Name"/><InfoRow name="Mobile Number">{t.maskedCustomerMobile?maskMobile(t.maskedCustomerMobile):undefined}</InfoRow><InfoRow name="Customer Type"/><InfoRow name="NID"/></dl><dl><InfoRow name="CIF Number"/><InfoRow name="Account Number"/><InfoRow name="Email Address"/><InfoRow name="Address"/></dl></div></InfoCard>
    <InfoCard title="Service Information" icon={<Settings size={21}/>}><dl><InfoRow name="Service Type">{t.requestTitle||undefined}</InfoRow><InfoRow name="Service Category"/><InfoRow name="Source System">{t.requestSourceCode?label(t.requestSourceCode):undefined}</InfoRow><InfoRow name="Service / Version">{t.serviceID!=null?`${t.serviceID} / ${t.versionID??'—'}`:undefined}</InfoRow><InfoRow name="Request Description"/></dl></InfoCard>
   </div>
   <div className="ticket-info-grid request-submission-grid">
    <InfoCard title="Request Details" icon={<FileText size={21}/>}><dl><InfoRow name="Request Type">{t.requestTitle||undefined}</InfoRow><InfoRow name="Card Number (Masked)">{t.cardLast4&&/^\d{4}$/.test(t.cardLast4)?`**** **** **** ${t.cardLast4}`:undefined}</InfoRow>{fields.map((f,i)=><InfoRow key={f.fieldID??i} name={f.fieldLabelSnapshot||f.fieldKeySnapshot||'Request field'}><span className="not-provided">Not supplied by API</span></InfoRow>)}{!fields.length&&<InfoRow name="Submitted Fields">No field snapshots returned</InfoRow>}</dl><p className="ticket-data-note">The current response omits submitted values. Review those values through an approved source before making a decision that depends on them.</p></InfoCard>
    <InfoCard title="Submission Information" icon={<UserRound size={21}/>}><dl><InfoRow name="Submitted By">{t.createdByAgentName||undefined}</InfoRow><InfoRow name="Submission Channel">{t.requestSourceCode==='AVAYA_AGENT'?'Call Center (Avaya)':t.requestSourceCode?label(t.requestSourceCode):undefined}</InfoRow><InfoRow name="Submitted At"><DateTime value={t.createdAt}/></InfoRow><InfoRow name="Last Updated"><DateTime value={t.lastUpdatedAt}/></InfoRow><InfoRow name="Approval SLA"><DateTime value={t.approvalDueAt}/></InfoRow><InfoRow name="Resolution SLA"><DateTime value={t.resolutionDueAt}/></InfoRow><InfoRow name="Priority"><Badge code={priority}/></InfoRow></dl></InfoCard>
   </div>
   <section className="ticket-card ticket-history-card"><div className="ticket-tabs" role="tablist" aria-label="Request information">{tabs.map(([key,name,Icon])=><button key={key} role="tab" id={'ticket-tab-'+key} aria-selected={tab===key} aria-controls="ticket-tab-content" onClick={()=>setTab(key)}><Icon size={17}/>{name}</button>)}</div><div id="ticket-tab-content" role="tabpanel" aria-labelledby={'ticket-tab-'+tab}>
    {tab==='activity'?(historyLoading?<Loading label="Loading ticket history…"/>:historyError?<ErrorBox error={historyError} retry={retryHistory}/>:<div className="table-wrap"><table className="ticket-history-table"><thead><tr><th aria-label="Event"/><th>Date &amp; Time</th><th>Activity</th><th>Details</th><th>Performed By</th></tr></thead><tbody>{events.map(e=><tr key={e.key}><td><span className={'history-event '+(e.key.startsWith('s')?'status-event':'')}><FileText size={14}/></span></td><td><DateTime value={e.time}/></td><td><strong>{e.title}</strong></td><td>{e.detail||'Not supplied'}</td><td>{e.by?label(e.by):'Not supplied'}</td></tr>)}{!events.length&&<tr><td colSpan={5} className="empty">No activity history returned.</td></tr>}</tbody></table></div>):tab==='related'?<dl className="related-ticket"><InfoRow name="Request ID">{t.requestID}</InfoRow><InfoRow name="Service ID">{t.serviceID}</InfoRow><InfoRow name="Version ID">{t.versionID}</InfoRow></dl>:<p className="ticket-tab-empty">{tab==='notes'?'Follow-up notes':'Customer notifications'} are not available in this increment.</p>}
   </div></section>
  </div><aside className="ticket-actions-column">
   <InfoCard title="Manager Actions" icon={<FileText size={22}/>} className="manager-actions-card"><h3 className="sr-only">Manager decision</h3>{actions}</InfoCard>
   <InfoCard title="Follow-up / Add Note" icon={<NotebookPen size={22}/>} className="ticket-followup-card"><fieldset disabled title={unavailable}><label>Activity Type<select><option>Phone Call</option><option>Internal Note</option><option>Email</option></select></label><label>Comments / Notes<textarea placeholder="Follow-up notes are not enabled in this increment…"/></label><label>Next Follow-up Date (Optional)<input type="date"/></label><button className="button"><Plus size={20}/>Add Note</button></fieldset><p className="ticket-capability-note">Note saving will be available in a later increment.</p></InfoCard>
  </aside></div>
 </div>;
}

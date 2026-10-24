import {useState} from 'react';
import type {FormEvent,ReactNode} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {ArrowRight,Bell,Building2,CalendarClock,Check,CheckCircle2,ChevronRight,ClipboardCheck,Clock3,FileText,MailX,MessageSquare,RefreshCw,Search,TriangleAlert,XCircle,ChartNoAxesCombined} from 'lucide-react';
import {useAuth} from './auth';
import {dateRange,label,safeId} from './domain';
import type {Pending} from './domain';
import {Badge,DateTime,ErrorBox,Loading} from './ui';

function elapsed(value?:string|null){if(!value)return '—';const m=Math.max(0,Math.floor((Date.now()-Date.parse(value))/60000));return !Number.isFinite(m)?'—':m<60?`${m} min`:m<1440?`${Math.floor(m/60)} hr`:`${Math.floor(m/1440)} days`;}
function DashboardCard({title,icon,children,to='/pending',tone=''}:{title:ReactNode;icon:ReactNode;children:ReactNode;to?:string;tone?:string}){return <section className={'dashboard-section '+tone}><header><h2>{icon}{title}</h2><Link to={to}>View All<ChevronRight size={13}/></Link></header>{children}</section>;}
function DashboardQueue({rows,compact=false}:{rows:Pending[];compact?:boolean}){return <div className="dashboard-table-scroll"><table className={'dashboard-request-table '+(compact?'compact':'')}><thead><tr><th>Ticket No.</th>{!compact&&<th>Priority</th>}<th>Service Type</th><th>Customer Name</th>{!compact&&<th>Mobile No.</th>}<th>Source</th>{!compact&&<th>Requested By</th>}<th>Submitted At</th><th>Waiting</th><th>Action</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.requestID??i}><td><Link to={'/tickets/'+r.requestID}>{r.ticketNumber||r.requestID||'—'}</Link></td>{!compact&&<td><Badge code={r.priorityCode}/></td>}<td>{r.requestTitle||'Not supplied'}</td><td className="missing-data" title="Not supplied by the queue API">—</td>{!compact&&<td className="missing-data" title="Not supplied by the queue API">—</td>}<td className="missing-data" title="Not supplied by the queue API">—</td>{!compact&&<td className="missing-data" title="Not supplied by the queue API">—</td>}<td><DateTime value={r.createdAt}/></td><td className={'queue-wait '+(r.priorityCode==='CRITICAL'?'critical':'')}>{elapsed(r.createdAt)}</td><td>{r.requestID?<Link className="dashboard-review" to={'/tickets/'+r.requestID}>Review</Link>:'—'}</td></tr>)}{!rows.length&&<tr><td colSpan={compact?7:10} className="dashboard-empty">No matching requests returned.</td></tr>}</tbody></table></div>;}
export function ManagerDashboard(){
 const {client,session}=useAuth(),navigate=useNavigate();
 const [dates,setDates]=useState(()=>{const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'});return {from:today.slice(0,7)+'-01',to:today};});
 const [range,setRange]=useState(()=>dateRange(dates.from,dates.to)),[search,setSearch]=useState(''),[error,setError]=useState('');
 const q=useQuery({queryKey:['manager','dashboard',range],queryFn:({signal})=>client.dashboard(range,signal)}),data=q.data;
 const count=(code:string)=>data?.statuses.find(s=>s.statusCode===code)?.ticketCount;
 const total=data?.statuses.reduce((sum,s)=>sum+(s.ticketCount??0),0);
 const priorityAvailable=!!data&&!data.errors.some(s=>s.startsWith('Priority'));
 const critical=priorityAvailable?data!.priorityQueue.filter(r=>r.priorityCode==='CRITICAL').length:undefined;
 const high=priorityAvailable?data!.priorityQueue.filter(r=>r.priorityCode==='HIGH').length:undefined;
 const priorities=(data?.priorityQueue||[]).filter(r=>['CRITICAL','HIGH'].includes(r.priorityCode||'')).sort((a,b)=>(a.priorityCode==='CRITICAL'?0:1)-(b.priorityCode==='CRITICAL'?0:1)).slice(0,3);
 const pending=(data?.queue||[]).filter(r=>['NORMAL','LOW'].includes(r.priorityCode||'')).slice(0,5);
 const reminderAvailable=!!data&&!data.errors.some(s=>s.startsWith('Follow-up'));
 const followups=reminderAvailable?(data!.reminders[0]?.totalRows??data!.reminders.length):undefined;
 const submitSearch=(e:FormEvent)=>{e.preventDefault();try{navigate('/tickets/'+safeId(search.trim()));setError('');}catch{setError('Enter a numeric Request ID to open a ticket.');}};
 const applyDates=(e:FormEvent)=>{e.preventDefault();try{setRange(dateRange(dates.from,dates.to));setError('');}catch(e){setError((e as Error).message);}};
 const metrics=[
  {name:'Critical Requests',value:critical,icon:TriangleAlert,tone:'critical'},
  {name:'High Priority',value:high,icon:TriangleAlert,tone:'high'},
  {name:'Pending Approval',value:count('PENDING_APPROVAL'),icon:ClipboardCheck,tone:'blue'},
  {name:'In Progress',value:count('IN_PROGRESS'),icon:Clock3,tone:'blue'},
  {name:'Sent to Branch',value:count('SENT_TO_BRANCH'),icon:Building2,tone:'teal'},
  {name:'Sent to Division',value:count('SENT_TO_DIVISION'),icon:Building2,tone:'purple'},
  {name:'Completed',value:count('COMPLETED'),icon:CheckCircle2,tone:'green'},
  {name:'Follow-ups Scheduled',value:followups,icon:CalendarClock,tone:'blue'},
  {name:'Overdue Follow-ups',value:undefined,icon:Clock3,tone:'critical'},
  {name:'Email Send Failed',value:undefined,icon:MailX,tone:'critical'},
  {name:'SMS Failed',value:undefined,icon:MessageSquare,tone:'high'}
 ];
 const colors=['#438af4','#00a3ff','#ffbb40','#9c68ee','#39b5ad','#31aa73','#ef5369','#a7b7d1'];
 let angle=0;const segments=(data?.statuses||[]).filter(s=>(s.ticketCount??0)>0).map((s,i)=>{const from=angle;angle+=(s.ticketCount??0)/(total||1)*360;return `${colors[i%colors.length]} ${from}deg ${angle}deg`;});
 const formattedDate=new Date().toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka',weekday:'long',day:'numeric',month:'long',year:'numeric'});
 return <div className="manager-dashboard-screen">
  <div className="dashboard-welcome"><div><h1>Manager Dashboard</h1><p>Welcome, <strong>{session?.name}</strong><span>|</span>{formattedDate}</p></div><form className="dashboard-search" onSubmit={submitSearch}><div><Search size={18}/><input aria-label="Search Request ID" placeholder="Search by Request ID…" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="button secondary" type="submit">Open Request<ArrowRight size={15}/></button></form></div>
  <div className="dashboard-period"><form onSubmit={applyDates}><label>From<input type="date" value={dates.from} onChange={e=>setDates({...dates,from:e.target.value})}/></label><label>To<input type="date" value={dates.to} onChange={e=>setDates({...dates,to:e.target.value})}/></label><button type="submit">Apply dates</button></form><div className="metric dashboard-total"><span>Total Service Requests</span><strong>{total??'—'}</strong></div><button className="dashboard-refresh" disabled={q.isFetching} onClick={()=>void q.refetch()}><RefreshCw size={14}/>Refresh</button></div>
  {error&&<ErrorBox error={Error(error)}/>} {q.isError&&<ErrorBox error={q.error} retry={()=>void q.refetch()}/>} {q.isPending&&<Loading label="Loading dashboard…"/>}
  <div className="dashboard-kpis">{metrics.map(({name,value,icon:Icon,tone},i)=><div className={'dashboard-kpi '+tone} key={name} title={value==null?'This metric is not supplied by the current dashboard API':undefined}><span className="dashboard-kpi-icon"><Icon size={29}/></span><div><span>{name}</span><strong>{value??'—'}</strong></div>{value!=null&&(i<3||i===7)&&<Link to={i<2?'/priority?priority='+(['CRITICAL','HIGH'][i]):i===7?'/follow-ups':'/pending'} aria-label={'View '+name}><ChevronRight size={17}/></Link>}</div>)}</div>
  <p className="dashboard-scope">Counts reflect requests created in the selected period. Priority counts cover the first 200 open requests. Daily completions and delivery failures are not supplied.</p>
  <DashboardCard title="Critical & High Priority Requests" icon={<TriangleAlert size={23}/>} tone="priority-section" to="/priority">{data?.errors.some(s=>s.startsWith('Priority'))?<p className="dashboard-empty">Priority queue unavailable.</p>:<DashboardQueue rows={priorities}/>}</DashboardCard>
  <div className="dashboard-queue-grid"><DashboardCard title={<>Pending Approval <small>(Normal &amp; Low Priority)</small></>} icon={<FileText size={22}/>}>
   {data?.errors.some(s=>s.startsWith('Approval queue'))?<p className="dashboard-empty">Approval queue unavailable.</p>:<DashboardQueue rows={pending} compact/>}<p className="dashboard-panel-note">First five normal and low priority pending requests in the selected period.</p>
  </DashboardCard><DashboardCard title="Pending Follow-ups" icon={<Clock3 size={23}/>} to="/follow-ups"><div className="dashboard-table-scroll"><table className="dashboard-followups-table"><thead><tr><th>Request ID</th><th>Follow-up</th><th>Next Follow-up</th><th>Action</th></tr></thead><tbody>{(data?.reminders||[]).slice(0,5).map((r,i)=><tr key={r.followUpScheduleID??i}><td><Link to={'/tickets/'+r.requestID}>{r.requestID??'—'}</Link></td><td>{r.followUpSubject||'Not supplied'}</td><td className={Date.parse(r.scheduledAt||'')<Date.now()?'overdue-date':''}><DateTime value={r.scheduledAt}/></td><td>{r.requestID&&<Link className="dashboard-review" to={'/tickets/'+r.requestID}>Review</Link>}</td></tr>)}{!data?.reminders.length&&<tr><td colSpan={4} className="dashboard-empty">{reminderAvailable?'No follow-ups returned for this period.':'Follow-up data unavailable.'}</td></tr>}</tbody></table></div><p className="dashboard-panel-note">First five reminders in the selected period.</p></DashboardCard></div>
  <div className="dashboard-summary-grid"><DashboardCard title="Today's Activity Summary" icon={<ChartNoAxesCombined size={23}/>} to="/activity"><div className="dashboard-activity-metrics">{[['Approved',Check,'green'],['Rejected',XCircle,'red'],['Sent to Branch',MailX,'blue'],['Sent to Division',Building2,'blue']].map(([name,Icon,tone])=>{const ItemIcon=Icon as typeof Check;return <div key={name as string} className={tone as string}><ItemIcon size={25}/><span>{name as string}</span><strong>—</strong></div>;})}</div><p className="dashboard-panel-note">Cross-ticket daily activity totals are not supplied. Open a ticket to review its recorded history.</p></DashboardCard>
   <DashboardCard title="Service Requests by Status" icon={<ClipboardCheck size={19}/>} to="/reports"><div className="dashboard-status-chart"><div className="status-donut" role="img" aria-label={`${total??'Unavailable'} total requests by current status in the selected period`} style={{background:segments.length?`conic-gradient(${segments.join(',')})`:'#e9f0fb'}}><div><strong>{total??'—'}</strong><span>Total</span></div></div><div className="dashboard-status-legend">{data?.statuses.map((s,i)=><div key={s.statusCode??i}><i style={{background:colors[(data.statuses.filter(v=>(v.ticketCount??0)>0).findIndex(v=>v.statusCode===s.statusCode)+colors.length)%colors.length]}}/><span>{label(s.statusCode)}</span><strong>{s.ticketCount??'—'}</strong></div>)}</div></div><p className="dashboard-panel-note">Current status of requests in the selected period.</p></DashboardCard>
   <DashboardCard title="Alerts & Notifications" icon={<Bell size={21}/>} to="/pending"><div className="dashboard-alerts">{data?.errors.map(e=><div key={e} className="alert-line error"><TriangleAlert size={16}/><span>{e}</span></div>)}{data&&<><div className="alert-line warning"><TriangleAlert size={16}/><span>{data.overdue==null?'Resolution overdue count unavailable.':`${data.overdue} request${data.overdue===1?' is':'s are'} overdue for resolution.`}</span></div>{priorityAvailable&&<div className="alert-line"><Clock3 size={16}/><span>{critical} critical request{critical===1?'':'s'} in the loaded priority queue.</span></div>}<div className="alert-line"><CalendarClock size={16}/><span>{reminderAvailable?`${followups} follow-up reminder${followups===1?'':'s'} scheduled in this period.`:'Follow-up reminders unavailable.'}</span></div></>}{!data&&<p className="dashboard-empty">Alerts unavailable until dashboard data loads.</p>}</div><p className="dashboard-panel-note">Based on loaded reports. No delivery notifications are inferred.</p></DashboardCard>
  </div>
 </div>;
}





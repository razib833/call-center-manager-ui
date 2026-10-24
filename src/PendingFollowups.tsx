import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {CalendarClock,ChevronRight,Clock3,RefreshCw} from 'lucide-react';
import {useAuth} from './auth';
import {dateRange} from './domain';
import type {Dashboard} from './domain';
import {DateTime,ErrorBox,Loading} from './ui';

function monthDates(){const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}),[year,month]=day.split('-').map(Number);return {from:day.slice(0,7)+'-01',to:new Date(Date.UTC(year,month,0)).toISOString().slice(0,10)};}
export function PendingFollowups(){
 const {client}=useAuth();const [dates,setDates]=useState(monthDates),[range,setRange]=useState(()=>dateRange(dates.from,dates.to)),[search,setSearch]=useState(''),[timing,setTiming]=useState('ALL'),[page,setPage]=useState(1),[size,setSize]=useState(10),[error,setError]=useState('');
 const q=useQuery({queryKey:['manager','followups',range],queryFn:async({signal})=>{
  const rows:Dashboard['reminders']=[];
  for(let current=1;current<=1000000;current++){
   signal.throwIfAborted();const batch=await client.followups({...range,page:current,pageSize:200},signal);rows.push(...batch);
   if(batch.length<200||(batch[0]?.totalRows!=null&&current*200>=batch[0].totalRows))break;
  }
  return rows;
 }});
 const rows=q.data||[],now=Date.now();const overdue=(value?:string|null)=>!!value&&Date.parse(value)<now;
 const filtered=rows.filter(r=>`${r.requestID??''} ${r.followUpSubject||''}`.toLowerCase().includes(search.toLowerCase())&&(timing==='ALL'||(timing==='OVERDUE'?overdue(r.scheduledAt):!!r.scheduledAt&&Date.parse(r.scheduledAt)>=now)));
 const pages=Math.max(1,Math.ceil(filtered.length/size)),currentPage=Math.min(page,pages),visible=filtered.slice((currentPage-1)*size,currentPage*size);
 const apply=()=>{try{setRange(dateRange(dates.from,dates.to));setError('');setPage(1);}catch(e){setError((e as Error).message);}};
 const reset=()=>{const d=monthDates();setDates(d);setRange(dateRange(d.from,d.to));setSearch('');setTiming('ALL');setPage(1);setError('');};
 return <div className="pending-screen pending-followups-screen"><div className="pending-title"><div><h1>Pending Follow-ups</h1><p>Pending reminders from the database, ordered by scheduled date.</p></div><div className="page-crumb"><Link to="/dashboard">Dashboard</Link><ChevronRight size={14}/><span>Pending Follow-ups</span></div></div>
  <div className="approval-stats"><div className="approval-stat total"><span className="stat-icon"><CalendarClock size={28}/></span><div><span>Total Pending Follow-ups</span><strong>{q.isSuccess?rows.length:'—'}</strong></div></div><div className="approval-stat critical"><span className="stat-icon"><Clock3 size={28}/></span><div><span>Overdue</span><strong>{q.isSuccess?rows.filter(r=>overdue(r.scheduledAt)).length:'—'}</strong></div></div><div className="approval-stat normal"><span className="stat-icon"><CalendarClock size={28}/></span><div><span>Upcoming</span><strong>{q.isSuccess?rows.filter(r=>!!r.scheduledAt&&Date.parse(r.scheduledAt)>=now).length:'—'}</strong></div></div></div>
  <section className="approval-filters priority-page-filters" aria-label="Follow-up filters"><label>Search Reminders<input placeholder="Request ID or reminder subject…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><label>Timing<select value={timing} onChange={e=>{setTiming(e.target.value);setPage(1);}}><option value="ALL">All Pending</option><option value="OVERDUE">Overdue</option><option value="UPCOMING">Upcoming</option></select></label><label>Scheduled From<input type="date" value={dates.from} onChange={e=>setDates({...dates,from:e.target.value})}/></label><label>Scheduled To<input type="date" value={dates.to} onChange={e=>setDates({...dates,to:e.target.value})}/></label><button className="button secondary" onClick={apply}>Apply dates</button><button className="button secondary" onClick={reset}>Clear Filters</button></section>
  {error&&<ErrorBox error={Error(error)}/>}
  <section className="panel approvals-panel"><div className="panel-heading"><h2><CalendarClock size={22}/>Pending Reminders {q.isSuccess&&`(${filtered.length})`}</h2><button className="button secondary small" disabled={q.isFetching} onClick={()=>void q.refetch()}><RefreshCw size={15}/>Refresh</button></div>{q.isPending?<Loading label="Loading pending follow-ups…"/>:q.isError?<ErrorBox error={q.error} retry={()=>void q.refetch()}/>:<div className="approvals-table"><div className="table-wrap"><table><thead><tr><th>Reminder ID</th><th>Request ID</th><th>Follow-up Subject</th><th>Scheduled At</th><th>Timing</th><th>Action</th></tr></thead><tbody>{visible.map((r,i)=><tr key={r.followUpScheduleID??i}><td>{r.followUpScheduleID??'—'}</td><td>{r.requestID?<Link className="ticket-number" to={'/tickets/'+r.requestID}>{r.requestID}</Link>:'—'}</td><td>{r.followUpSubject||'Not supplied'}</td><td><DateTime value={r.scheduledAt}/></td><td><span className={'badge '+(overdue(r.scheduledAt)?'critical':'normal')}>{r.scheduledAt?overdue(r.scheduledAt)?'Overdue':'Upcoming':'Not supplied'}</span></td><td>{r.requestID&&<Link className="button small review-button" to={'/tickets/'+r.requestID}>Review</Link>}</td></tr>)}{!visible.length&&<tr><td colSpan={6} className="empty">No pending follow-ups match these filters.</td></tr>}</tbody></table></div></div>}
   <div className="approval-pagination"><label>Show<select aria-label="Follow-ups page size" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}>{[10,25,50].map(n=><option key={n}>{n}</option>)}</select>entries</label><span>{filtered.length} matching reminders · Page {currentPage} of {pages}</span><div className="page-buttons"><button aria-label="Previous follow-ups page" disabled={currentPage===1||q.isFetching} onClick={()=>setPage(currentPage-1)}>‹</button><span className="current-page">{currentPage}</span><button aria-label="Next follow-ups page" disabled={currentPage>=pages||q.isFetching} onClick={()=>setPage(currentPage+1)}>›</button></div></div><p className="filter-scope">Dates filter the scheduled reminder date, not the request creation date. The initial period includes this entire month. Review opens the associated ticket; completing or rescheduling reminders is not enabled here.</p>
  </section>
 </div>;
}

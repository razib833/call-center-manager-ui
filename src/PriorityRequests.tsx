import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {ChevronRight,RefreshCw,TriangleAlert} from 'lucide-react';
import {useAuth} from './auth';
import type {Pending,Range} from './domain';
import {dateRange,label} from './domain';
import {Badge,DateTime,ErrorBox,Loading,Sla} from './ui';

export function PriorityRequests(){
 const {client}=useAuth();const [params,setParams]=useSearchParams();const priority=['CRITICAL','HIGH'].includes(params.get('priority')||'')?params.get('priority')!:'ALL';
 const [search,setSearch]=useState(''),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[dates,setDates]=useState(()=>{const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'});return {from:today.slice(0,7)+'-01',to:today};}),[range,setRange]=useState<Range>(()=>dateRange(dates.from,dates.to)),[error,setError]=useState('');
 const q=useQuery({queryKey:['manager','priority',range],queryFn:async({signal})=>{
  const rows:Pending[]=[];
  for(let current=1;current<=1000000;current++){
   signal.throwIfAborted();const batch=await client.priority({...range,page:current,pageSize:200},signal);rows.push(...batch);
   if(batch.length<200||(batch[0]?.totalRows!=null&&current*200>=batch[0].totalRows))break;
  }
  return rows.filter(r=>r.priorityCode==='CRITICAL'||r.priorityCode==='HIGH');
 }});
 const rows=q.data||[],filtered=rows.filter(r=>(priority==='ALL'||r.priorityCode===priority)&&`${r.ticketNumber||''} ${r.requestTitle||''}`.toLowerCase().includes(search.toLowerCase()));
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize)),currentPage=Math.min(page,pages),visible=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
 const apply=()=>{try{setRange(dateRange(dates.from,dates.to));setPage(1);setError('');}catch(e){setError((e as Error).message);}};
 return <div className="pending-screen priority-requests-screen"><div className="pending-title"><div><h1>Priority Requests</h1><p>Review open Critical and High priority requests from the database.</p></div><div className="page-crumb"><Link to="/dashboard">Dashboard</Link><ChevronRight size={14}/><span>Priority Requests</span></div></div>
  <div className="approval-stats"><div className="approval-stat total"><span className="stat-icon"><TriangleAlert size={27}/></span><div><span>Total Priority Requests</span><strong>{q.isSuccess?rows.length:'—'}</strong></div></div>{['CRITICAL','HIGH'].map(code=><div className={'approval-stat '+code.toLowerCase()} key={code}><span className="stat-icon"><TriangleAlert size={27}/></span><div><span>{label(code)} Priority</span><strong>{q.isSuccess?rows.filter(r=>r.priorityCode===code).length:'—'}</strong></div></div>)}</div>
  <section className="approval-filters priority-page-filters" aria-label="Priority request filters"><label>Search Keyword<input aria-label="Search priority requests" placeholder="Ticket number or service…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><label>Priority<select value={priority} onChange={e=>{setParams(e.target.value==='ALL'?{}:{priority:e.target.value});setPage(1);}}><option value="ALL">Critical &amp; High</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option></select></label><label>From date<input type="date" value={dates.from} onChange={e=>setDates({...dates,from:e.target.value})}/></label><label>To date<input type="date" value={dates.to} onChange={e=>setDates({...dates,to:e.target.value})}/></label><button className="button secondary" onClick={apply}>Apply dates</button><button className="button secondary" onClick={()=>{setSearch('');setParams({});setPage(1);}}>Clear Filters</button></section>
  {error&&<ErrorBox error={Error(error)}/>}
  <section className="panel approvals-panel"><div className="panel-heading"><h2><TriangleAlert size={21}/>Critical &amp; High Priority Requests</h2><button className="button secondary small" disabled={q.isFetching} onClick={()=>void q.refetch()}><RefreshCw size={15}/>Refresh</button></div>{q.isPending?<Loading label="Loading priority requests…"/>:q.isError?<ErrorBox error={q.error} retry={()=>void q.refetch()}/>:<div className="approvals-table"><div className="table-wrap"><table><thead><tr><th>Ticket No.</th><th>Priority</th><th>Service / Request</th><th>Submitted At</th><th>Approval SLA</th><th>Action</th></tr></thead><tbody>{visible.map((r,i)=><tr key={r.requestID??i}><td><Link className="ticket-number" to={'/tickets/'+r.requestID}>{r.ticketNumber||r.requestID}</Link></td><td><Badge code={r.priorityCode}/></td><td>{r.requestTitle||'Not supplied'}</td><td><DateTime value={r.createdAt}/></td><td><Sla due={r.approvalDueAt}/></td><td>{r.requestID&&<Link className="button small review-button" to={'/tickets/'+r.requestID}>Review</Link>}</td></tr>)}{!visible.length&&<tr><td colSpan={6} className="empty">No open Critical or High priority requests match these filters.</td></tr>}</tbody></table></div></div>}
   <div className="approval-pagination"><label>Show<select aria-label="Priority page size" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,25,50].map(n=><option key={n}>{n}</option>)}</select>entries</label><span>{filtered.length} matching requests · Page {currentPage} of {pages}</span><div className="page-buttons"><button aria-label="Previous priority page" disabled={currentPage===1||q.isFetching} onClick={()=>setPage(currentPage-1)}>‹</button><span className="current-page">{currentPage}</span><button aria-label="Next priority page" disabled={currentPage===pages||q.isFetching} onClick={()=>setPage(currentPage+1)}>›</button></div></div><p className="filter-scope">All open Critical and High priority requests in the selected period, including requests already approved but still open.</p>
  </section>
 </div>;
}

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {ArrowDown,ChevronLeft,ChevronRight,ChevronsLeft,ChevronsRight,FileSpreadsheet,FileText,RefreshCw,Search,TriangleAlert,Clock3} from 'lucide-react';
import {useAuth} from './auth';
import {dateRange,label} from './domain';
import type {Pending,Range} from './domain';
import {Badge,DateTime,ErrorBox,Loading} from './ui';

function waiting(value?:string|null){const minutes=value?Math.max(0,Math.floor((Date.now()-Date.parse(value))/60000)):NaN;return Number.isFinite(minutes)?minutes<60?`${minutes} min`:minutes<1440?`${Math.floor(minutes/60)} hr ${minutes%60} min`:`${Math.floor(minutes/1440)} days`:'—';}
function exportRows(rows:Pending[]){
 const cell=(value:unknown)=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const content=[['Ticket No.','Priority','Service / Request','Submitted At','Waiting Time'],...rows.map(r=>[r.ticketNumber,label(r.priorityCode),r.requestTitle,r.createdAt,waiting(r.createdAt)])].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='Pending-approvals.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function PendingApprovals(){
 const {client}=useAuth();const [range,setRange]=useState<Range>(),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[search,setSearch]=useState(''),[priority,setPriority]=useState('ALL'),[service,setService]=useState('ALL'),[wait,setWait]=useState('ALL'),[sort,setSort]=useState('SERVER'),[dates,setDates]=useState({from:'',to:''}),[error,setError]=useState('');
 const q=useQuery({queryKey:['manager','pending',range,page,pageSize],queryFn:({signal})=>client.pending({...range,page,pageSize},signal)});
 const overview=useQuery({queryKey:['manager','pending-overview',range],queryFn:({signal})=>client.pending({...range,page:1,pageSize:200},signal)});
 const rows=q.data||[],all=overview.data||[],total=rows[0]?.totalRows??all[0]?.totalRows??0;
 const filtered=rows.filter(r=>(priority==='ALL'||r.priorityCode===priority)&&(service==='ALL'||r.requestTitle===service)&&(r.ticketNumber+' '+r.requestTitle).toLowerCase().includes(search.toLowerCase())&&(wait==='ALL'||(r.createdAt&&Date.now()-Date.parse(r.createdAt)>Number(wait)*60000)));
 const sorted=[...filtered].sort((a,b)=>sort==='TICKET'?(a.ticketNumber||'').localeCompare(b.ticketNumber||''):sort==='NEWEST'?Date.parse(b.createdAt||'')-Date.parse(a.createdAt||''):sort==='WAITING'?Date.parse(a.createdAt||'')-Date.parse(b.createdAt||''):sort==='PRIORITY'?['CRITICAL','HIGH','NORMAL','LOW'].indexOf(a.priorityCode||'')-['CRITICAL','HIGH','NORMAL','LOW'].indexOf(b.priorityCode||''):0);
 const pages=Math.max(1,Math.ceil(total/pageSize));const refresh=()=>{void q.refetch();void overview.refetch();};
 const apply=()=>{try{if(dates.from||dates.to){setRange(dateRange(dates.from,dates.to));}else setRange(undefined);setPage(1);setError('');}catch(e){setError((e as Error).message);}};
 const clear=()=>{setSearch('');setPriority('ALL');setService('ALL');setWait('ALL');setSort('SERVER');setDates({from:'',to:''});setRange(undefined);setPage(1);setError('');};
 const count=(code:string)=>overview.isSuccess?all.filter(r=>r.priorityCode===code).length:'—';
 return <div className="pending-screen">
  <div className="pending-title"><div><h1>Pending Approvals</h1><p>Service requests awaiting your approval. Please review and take appropriate action.</p></div><div className="pending-title-actions"><div className="page-crumb"><Link to="/dashboard">Dashboard</Link><ChevronRight size={14}/><span>Pending Approvals</span></div><button className="button secondary export-button" disabled={!sorted.length} onClick={()=>exportRows(sorted)} title="Export the displayed page as an Excel-compatible CSV"><FileSpreadsheet size={17}/>Export to Excel</button></div></div>
  <div className="approval-stats">
   <div className="approval-stat total"><span className="stat-icon"><FileText size={29}/></span><div><span>Total Pending</span><strong>{overview.isSuccess?total:'—'}</strong></div></div>
   <div className="approval-stat critical"><span className="stat-icon"><TriangleAlert size={29}/></span><div><span>Critical Priority</span><strong>{count('CRITICAL')}</strong></div></div>
   <div className="approval-stat high"><span className="stat-icon"><TriangleAlert size={29}/></span><div><span>High Priority</span><strong>{count('HIGH')}</strong></div></div>
   <div className="approval-stat normal"><span className="stat-icon"><Clock3 size={29}/></span><div><span>Normal Priority</span><strong>{count('NORMAL')}</strong></div></div>
  </div>
  {overview.isError&&<ErrorBox error={overview.error} retry={()=>void overview.refetch()}/>}
  {total>200&&<p className="filter-scope">Priority counts cover the first 200 pending requests.</p>}
  <section className="approval-filters" aria-label="Approval filters"><div className="filters-top">
   <label>Search Keyword<span className="search-field"><Search size={17}/><input aria-label="Search this page" placeholder="Ticket No., service or request…" value={search} onChange={e=>setSearch(e.target.value)}/></span></label>
   <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}>{['ALL','CRITICAL','HIGH','NORMAL','LOW'].map(p=><option key={p} value={p}>{p==='ALL'?'All':label(p)}</option>)}</select></label>
   <label>Service Type<select value={service} onChange={e=>setService(e.target.value)}><option value="ALL">All Service Types</option>{[...new Set(rows.map(r=>r.requestTitle).filter((s):s is string=>!!s))].map(s=><option key={s}>{s}</option>)}</select></label>
   <label>Submission Channel<select disabled title="The queue API does not supply submission channel"><option>Not supplied</option></select></label>
  </div><div className="filters-bottom">
   <fieldset className="submission-date"><legend>Submission Date</legend><div><input aria-label="Submission from date" type="date" value={dates.from} onChange={e=>setDates({...dates,from:e.target.value})}/><span>–</span><input aria-label="Submission to date" type="date" value={dates.to} onChange={e=>setDates({...dates,to:e.target.value})}/></div></fieldset>
   <label>Submitted By<select disabled title="The queue API does not supply Agent identity"><option>Not supplied</option></select></label>
   <label>Branch / Division<select disabled title="The queue API does not supply branch or division"><option>Not supplied</option></select></label>
   <label>Waiting Time<select value={wait} onChange={e=>setWait(e.target.value)}><option value="ALL">All</option><option value="30">Over 30 minutes</option><option value="60">Over 1 hour</option><option value="1440">Over 1 day</option></select></label>
   <div className="filter-actions"><button className="button secondary clear-filters" onClick={clear}>Clear Filters</button><button className="button" onClick={apply}><Search size={16}/>Search</button></div>
  </div></section>
  {error&&<ErrorBox error={Error(error)}/>}
  <section className="panel approvals-panel"><div className="panel-heading"><h2><FileText size={22}/>Pending Approval Requests ({total})</h2><button className="button secondary small" disabled={q.isFetching} onClick={refresh}><RefreshCw size={16}/>Refresh</button></div>
   <div className="approvals-table">{q.isPending?<Loading label="Loading pending approvals…"/>:q.isError?<ErrorBox error={q.error} retry={()=>void q.refetch()}/>:<div className="table-wrap"><table><thead><tr><th>SL</th><th><button onClick={()=>setSort('TICKET')}>Ticket No.</button></th><th><button onClick={()=>setSort('PRIORITY')}>Priority<ArrowDown size={13}/></button></th><th>Service / Request</th><th>Customer Name</th><th>Mobile No.</th><th><button onClick={()=>setSort('NEWEST')}>Submitted At<ArrowDown size={13}/></button></th><th><button onClick={()=>setSort('WAITING')}>Waiting Time<ArrowDown size={13}/></button></th><th>Submitted By</th><th>Action</th></tr></thead><tbody>{sorted.map((r,i)=><tr key={r.requestID??i}><td>{(page-1)*pageSize+i+1}</td><td><Link className="ticket-number" to={'/tickets/'+r.requestID}>{r.ticketNumber||'—'}</Link></td><td><Badge code={r.priorityCode}/></td><td>{r.requestTitle||'—'}</td><td className="unavailable" title="Not supplied by queue API">—</td><td className="unavailable" title="Not supplied by queue API">—</td><td><DateTime value={r.createdAt}/></td><td><span className={'waiting '+(r.priorityCode==='CRITICAL'?'critical':r.priorityCode==='HIGH'?'high':'normal')}>{waiting(r.createdAt)}</span></td><td className="unavailable" title="Not supplied by queue API">—</td><td>{r.requestID?<Link className="button small review-button" to={'/tickets/'+r.requestID}>Review</Link>:'Unavailable'}</td></tr>)}{!sorted.length&&<tr><td colSpan={10} className="empty">No requests returned for these filters.</td></tr>}</tbody></table></div>}</div>
   <div className="approval-pagination"><label>Show<select aria-label="Page size" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,25,50].map(n=><option key={n}>{n}</option>)}</select>entries</label><span>{sorted.length?`Showing ${(page-1)*pageSize+1} to ${(page-1)*pageSize+sorted.length} of ${total} entries`:'No matching entries on this page'}</span><div className="page-buttons"><button aria-label="First page" disabled={page===1||q.isFetching} onClick={()=>setPage(1)}><ChevronsLeft size={15}/></button><button aria-label="Previous page" disabled={page===1||q.isFetching} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={15}/></button><span className="current-page" aria-current="page">{page}</span>{page<pages&&<button disabled={q.isFetching} onClick={()=>setPage(p=>p+1)}>{page+1}</button>}<button aria-label="Next page" disabled={page>=pages||q.isFetching} onClick={()=>setPage(p=>p+1)}><ChevronRight size={15}/></button><button aria-label="Last page" disabled={page>=pages||q.isFetching} onClick={()=>setPage(pages)}><ChevronsRight size={15}/></button></div></div>
   <p className="filter-scope">Search, priority, service and waiting-time filters apply to this page. Customer, mobile, Agent and branch information is not supplied by the queue API.</p>
  </section>
 </div>;
}

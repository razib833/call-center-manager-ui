import type {FollowupNote,TicketReminder,TicketCommunication,TicketForwarding} from './ticketTabTypes';
import type {ManagerClient,Session,Range,Page,Dashboard,Pending,Ticket} from './domain';
import {ApiError,validSession} from './domain';
import type * as C from './contracts';
const rows=<T>(r:{rows1?:T[]|null})=>r.rows1||[];
export class LiveManagerClient implements ManagerClient{
 async transitions(id:number,signal?:AbortSignal){return rows(await this.request<{rows1?:import('./domain').AllowedTransition[]}>('/api/v1/reference/ticket-status-transition/get-allowed',{requestID:id},signal));}
 async updateStatus(id:number,version:string,toStatusID:number,remarks:string){await this.request('/api/v1/tickets/ticket/update-status',{requestID:id,expectedRowVersion:version,toStatusID,remarks:remarks.trim()||null});}
 async forwardEmail(payload:import('./domain').ForwardEmail){await this.request('/api/v1/follow/forwarding/create',payload);}
 async schedule(id:number,scheduledAt:string,managerID:string){await this.request('/api/v1/follow/follow-up-schedule/create',{requestID:id,subject:'Manager follow-up',scheduledAt,assignedManagerID:managerID});}
 readonly mode='LIVE' as const;onExpired?:()=>void;private csrf='';private csrfTask:Promise<void>|null=null;private retryAt=0;
 constructor(private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 async request<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{
  if(!path.startsWith('/api/v1/'))throw Error('Only same-origin API paths are permitted.');
  if(Date.now()<this.retryAt)throw new ApiError('Request limit reached. Wait one minute before retrying.',429);
  if(body!==undefined&&!this.csrf){this.csrfTask??=this.request<{token:string}>('/api/v1/auth/csrf').then(r=>{this.csrf=r.token;}).finally(()=>{this.csrfTask=null;});await this.csrfTask;signal?.throwIfAborted();}
  const response=await this.fetcher(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal,headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-TOKEN':this.csrf},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.status===429){this.retryAt=Date.now()+60000;throw new ApiError('Request limit reached. Wait one minute before retrying.',429);}
  let envelope:{success:boolean;data:T;message?:string;correlationId?:string};try{envelope=await response.json();}catch{throw new ApiError('API returned an unreadable response.',response.status);}
  if(!response.ok||envelope.success===false){if(response.status===401){this.csrf='';this.onExpired?.();}throw new ApiError(envelope.message||'API request failed.',response.status,envelope.correlationId);}
  return envelope.data;
 }
 async session(signal?:AbortSignal){const session=await this.request<Session>('/api/v1/auth/session',undefined,signal);if(!validSession(session))throw new ApiError('An unexpired verified Manager session is required.',403);return session;}
 async login(email:string,password:string){this.csrf='';try{const s=await this.request<Session>('/api/v1/auth/manager',{username:email,password});if(!validSession(s))throw new ApiError('This identity is not a verified Manager.',403);return s;}finally{this.csrf='';}}
 async developmentLogin(){this.csrf='';try{const s=await this.request<Session>('/api/v1/auth/development/session',{persona:'Manager'});if(!validSession(s))throw new ApiError('Manager development session unavailable.',403);return s;}finally{this.csrf='';}}
 async logout(){try{await this.request('/api/v1/auth/logout',{});}finally{this.csrf='';}}
 async pending(page:Page,signal?:AbortSignal){return rows(await this.request<C.Ticket_GetPendingApprovalResponse>('/api/v1/tickets/ticket/get-pending-approval',page,signal));}
 async priority(page:Page,signal?:AbortSignal){return rows(await this.request<C.Ticket_GetPriorityQueueResponse>('/api/v1/tickets/ticket/get-priority-queue',page,signal));}
 async search(filters:C.Ticket_SearchRequest,signal?:AbortSignal){return rows(await this.request<C.Ticket_SearchResponse>('/api/v1/tickets/ticket/search',filters,signal));}
 async followups(filters:Range & Page,signal?:AbortSignal){return rows(await this.request<C.Dashboard_PendingFollowUpsResponse>('/api/v1/report/dashboard/pending-follow-ups',filters,signal));}
 async ticket(id:number,signal?:AbortSignal){const t=await this.request<Ticket>('/api/v1/tickets/ticket/get-by-id',{requestID:id},signal);if(!t.rows1?.length)throw new ApiError('Service request was not found.',404);return t;}
 async references(signal?:AbortSignal){const [priorities,statuses]=await Promise.all([this.request<C.Priority_GetAllResponse>('/api/v1/reference/priority/get-all',{},signal),this.request<C.TicketStatus_GetAllResponse>('/api/v1/reference/ticket-status/get-all',{},signal)]);return {priorities:rows(priorities),statuses:rows(statuses)};}
 async notes(id:number,signal?:AbortSignal){return rows(await this.request<{rows1?:FollowupNote[]}>('/api/v1/follow/follow-up/get-by-ticket',{requestID:id},signal));}
 async reminders(id:number,signal?:AbortSignal){return rows(await this.request<{rows1?:TicketReminder[]}>('/api/v1/follow/follow-up-schedule/get-by-ticket',{requestID:id},signal));}
 async communications(id:number,signal?:AbortSignal){return rows(await this.request<{rows1?:TicketCommunication[]}>('/api/v1/communications/communication/get-by-ticket',{id},signal));}
 async forwardings(id:number,signal?:AbortSignal){return rows(await this.request<{rows1?:TicketForwarding[]}>('/api/v1/follow/forwarding/get-by-ticket',{requestID:id},signal));}
 async history(id:number,signal?:AbortSignal){const [status,activity]=await Promise.all([this.request<C.Ticket_GetStatusHistoryResponse>('/api/v1/tickets/ticket/get-status-history',{requestID:id},signal),this.request<C.Ticket_GetActivityHistoryResponse>('/api/v1/tickets/ticket/get-activity-history',{requestID:id},signal)]);return {status:rows(status),activity:rows(activity)};}
 private async dashboardApprovals(range:Range,signal?:AbortSignal){
  const collected:Pending[]=[];
  for(let page=1;page<=1000000;page++){
   signal?.throwIfAborted();
   const batch=await this.pending({...range,page,pageSize:200},signal);
   collected.push(...batch);
   const enough=collected.filter(r=>r.priorityCode==='NORMAL'||r.priorityCode==='LOW').length>=5;
   const total=batch[0]?.totalRows;
   if(enough||batch.length<200||(total!=null&&page*200>=total))break;
  }
  return collected;
 }
 async dashboard(range:Range,signal?:AbortSignal):Promise<Dashboard>{
  const statuses=rows(await this.request<C.Ticket_GetDashboardSummaryResponse>('/api/v1/tickets/ticket/get-dashboard-summary',range,signal));
  const tasks=await Promise.allSettled([this.dashboardApprovals(range,signal),this.request<C.Ticket_GetPriorityQueueResponse>('/api/v1/tickets/ticket/get-priority-queue',{...range,page:1,pageSize:200},signal),this.request<C.Dashboard_PendingFollowUpsResponse>('/api/v1/report/dashboard/pending-follow-ups',{...range,page:1,pageSize:6},signal),this.request<C.Dashboard_OverdueResolutionResponse>('/api/v1/report/dashboard/overdue-resolution',{...range,page:1,pageSize:1},signal)]);
  const [queue,priority,reminders,overdue]=tasks;const errors=tasks.map((r,i)=>r.status==='rejected'?['Approval queue','Priority distribution','Follow-up reminders','SLA overdue'][i]+' unavailable.':null).filter((s):s is string=>!!s);
  return {statuses,queue:queue.status==='fulfilled'?queue.value as Pending[]:[],priorityQueue:priority.status==='fulfilled'?rows(priority.value as C.Ticket_GetPriorityQueueResponse):[],reminders:reminders.status==='fulfilled'?rows(reminders.value as C.Dashboard_PendingFollowUpsResponse):[],overdue:overdue.status==='fulfilled'?(rows(overdue.value as C.Dashboard_OverdueResolutionResponse)[0]?.totalRows??0):null,errors};
 }
 async decide(id:number,version:string,decision:'approve'|'reject',remarks:string){await this.request('/api/v1/tickets/ticket/'+decision,{requestID:id,expectedRowVersion:version,remarks:remarks.trim()||null});}
}






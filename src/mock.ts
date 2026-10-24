import type {FollowupNote,TicketReminder,TicketCommunication,TicketForwarding} from './ticketTabTypes';
import type {RequestSearch} from './domain';
import type {ManagerClient,Session,Ticket,Page,Range,Dashboard} from './domain';
import {ApiError} from './domain';
import type {Ticket_GetByIDRow1,Ticket_GetPendingApprovalRow1} from './contracts';
const codes=['PENDING_APPROVAL','APPROVED','REJECTED','IN_PROGRESS','SENT_TO_BRANCH','SENT_TO_DIVISION','COMPLETED','FAILED'];
const priorities=['CRITICAL','HIGH','NORMAL','LOW'];
export class MockManagerClient implements ManagerClient{
 async transitions():Promise<import('./domain').AllowedTransition[]>{return [];}
 async updateStatus():Promise<void>{throw new ApiError('Status updates require the LIVE backend.',503);}
 async forwardEmail(_payload:import('./domain').ForwardEmail):Promise<void>{throw new ApiError('Email forwarding requires the LIVE backend.',503);}
 async schedule():Promise<void>{throw new ApiError('Reminders require the LIVE backend.',503);}
 readonly mode='MOCK' as const;onExpired?:()=>void;private identity:Session|null=null;
 private tickets:Ticket_GetByIDRow1[]=Array.from({length:12},(_,i)=>({requestID:7001+i,ticketNumber:`DEMO-MGR-${7001+i}`,serviceID:i%3+1,versionID:1,requestTitle:['Account statement enquiry (Demo)','Card enquiry (Demo)','Internet banking enquiry (Demo)'][i%3],priorityID:i%4+1,currentStatusID:i<5?1:i%7+2,approvalStatus:i<5?'PENDING':i%7===1?'REJECTED':'APPROVED',createdAt:`2026-10-${String(12+i).padStart(2,'0')}T08:00:00Z`,approvalDueAt:`2026-10-${String(12+i).padStart(2,'0')}T10:00:00Z`,resolutionDueAt:`2026-10-${String(13+i).padStart(2,'0')}T08:00:00Z`,createdByAgentName:'Demonstration Agent',maskedCustomerMobile:'***0000',requestSourceCode:'DEMO',rowVersion:'AAAAAAAAAAE=',lastUpdatedAt:`2026-10-${String(12+i).padStart(2,'0')}T08:00:00Z`}));
 private demand(){if(!this.identity||Date.parse(this.identity.verifiedUntil)<=Date.now()){this.onExpired?.();throw new ApiError('Sign in to the demonstration.',401);}}
 async session(){this.demand();return this.identity!;}
 async login():Promise<Session>{throw new ApiError('External credentials are not used in MOCK preview. Use the demonstration button.',503);}
 async developmentLogin(){this.identity={id:'DEMO-MGR',name:'Demonstration Manager',capability:'MANAGER',verifiedUntil:new Date(Date.now()+15*60000).toISOString()};return this.identity;}
 async logout(){this.identity=null;}
 private scoped(range:Partial<Range>){return this.tickets.filter(t=>(!range.fromDate||t.createdAt!>=range.fromDate)&&(!range.toDate||t.createdAt!<range.toDate));}
 async pending(page:Page){this.demand();const selected=this.scoped(page).filter(t=>t.approvalStatus==='PENDING').sort((a,b)=>(a.priorityID||0)-(b.priorityID||0));return selected.slice((page.page-1)*page.pageSize,page.page*page.pageSize).map(t=>({requestID:t.requestID,ticketNumber:t.ticketNumber,requestTitle:t.requestTitle,priorityID:t.priorityID,priorityCode:priorities[t.priorityID!-1],currentStatusID:t.currentStatusID,createdAt:t.createdAt,approvalDueAt:t.approvalDueAt,resolutionDueAt:t.resolutionDueAt,rowVersion:t.rowVersion,totalRows:selected.length} satisfies Ticket_GetPendingApprovalRow1));}
 async priority(page:Page){this.demand();const selected=this.scoped(page).filter(t=>![3,7,8].includes(t.currentStatusID!)).sort((a,b)=>(a.priorityID||0)-(b.priorityID||0));return selected.slice((page.page-1)*page.pageSize,page.page*page.pageSize).map(t=>({...t,priorityCode:priorities[t.priorityID!-1],totalRows:selected.length}));}
 async search(filters:RequestSearch){this.demand();const selected=this.scoped({fromDate:filters.fromDate??undefined,toDate:filters.toDate??undefined}).filter(t=>(!filters.ticketNumber||t.ticketNumber===filters.ticketNumber)&&(!filters.priorityID||t.priorityID===filters.priorityID)&&(!filters.statusID||t.currentStatusID===filters.statusID)&&(!filters.serviceID||t.serviceID===filters.serviceID)).sort((a,b)=>Date.parse(b.createdAt!)-Date.parse(a.createdAt!));const page=filters.page||1,size=filters.pageSize||10;return selected.slice((page-1)*size,page*size).map(t=>({...t,totalRows:selected.length}));}
 async followups(filters:Range & Page){this.demand();const rows=[{followUpScheduleID:1,requestID:7007,followUpSubject:'Demo follow-up review',scheduledAt:'2026-10-23T10:00:00Z'}].filter(r=>r.scheduledAt>=filters.fromDate&&r.scheduledAt<filters.toDate);return rows.slice((filters.page-1)*filters.pageSize,filters.page*filters.pageSize).map(r=>({...r,totalRows:rows.length}));}
 async ticket(id:number):Promise<Ticket>{this.demand();const t=this.tickets.find(t=>t.requestID===id);if(!t)throw new ApiError('Demo request not found.',404);return structuredClone({rows1:[t],rows2:[{fieldID:1,fieldKeySnapshot:'DEMO_NOTE',fieldLabelSnapshot:'Demonstration note',fieldTypeSnapshot:'TEXT'}]});}
 async references(){this.demand();return {priorities:priorities.map((code,i)=>({priorityID:i+1,priorityCode:code,priorityName:code,priorityRank:i+1})),statuses:codes.map((code,i)=>({statusID:i+1,statusCode:code,statusName:code,isTerminal:['REJECTED','COMPLETED','FAILED'].includes(code)}))};}
 async notes(id:number):Promise<FollowupNote[]>{this.demand();await this.ticket(id);return [];}
 async reminders(id:number):Promise<TicketReminder[]>{this.demand();await this.ticket(id);return id===7007?[{followUpScheduleID:1,requestID:id,followUpSubject:'Demo follow-up review',scheduledAt:'2026-10-23T10:00:00Z',reminderStatus:'PENDING',assignedManagerID:'DEMO-MGR'}]:[];}
 async communications(id:number):Promise<TicketCommunication[]>{this.demand();await this.ticket(id);return [];}
 async forwardings(id:number):Promise<TicketForwarding[]>{this.demand();await this.ticket(id);return [];}
 async history(id:number){this.demand();const t=(await this.ticket(id)).rows1![0];return {status:[{statusHistoryID:1,fromStatusID:null,toStatusID:t.currentStatusID,changedByRole:'AGENT',changedAt:t.createdAt}],activity:[{activityID:1,activityType:'TICKET_CREATE',activityTitle:'Demonstration request created',performedByRole:'AGENT',activityAt:t.createdAt}]};}
 async dashboard(range:Range):Promise<Dashboard>{this.demand();const data=this.scoped(range);return {statuses:codes.map((code,i)=>({statusCode:code,statusName:code,ticketCount:data.filter(t=>t.currentStatusID===i+1).length})),queue:await this.pending({...range,page:1,pageSize:6}),priorityQueue:data.filter(t=>![3,7,8].includes(t.currentStatusID!)).map(t=>({...t,priorityCode:priorities[t.priorityID!-1]})),reminders:[{followUpScheduleID:1,requestID:7007,followUpSubject:'Demo follow-up review',scheduledAt:'2026-10-23T10:00:00Z',totalRows:1}],overdue:data.filter(t=>t.currentStatusID===1&&Date.parse(t.resolutionDueAt!)<Date.now()).length,errors:[]};}
 async decide(id:number,version:string,decision:'approve'|'reject',remarks:string){this.demand();const t=this.tickets.find(t=>t.requestID===id);if(!t)throw new ApiError('Request not found.',404);if(t.rowVersion!==version||t.approvalStatus!=='PENDING')throw new ApiError('Another Manager already processed this request.',409);if(decision==='reject'&&!remarks.trim())throw new ApiError('Rejection reason is required.',400);t.approvalStatus=decision==='approve'?'APPROVED':'REJECTED';t.currentStatusID=decision==='approve'?2:3;t.rowVersion='AAAAAAAAAAI=';}
 simulateConcurrentDecision(id:number){const t=this.tickets.find(t=>t.requestID===id);if(t){t.approvalStatus='APPROVED';t.currentStatusID=2;t.rowVersion='AAAAAAAAAAI=';}}
}





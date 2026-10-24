import type {FollowupNote,TicketReminder,TicketCommunication,TicketForwarding} from './ticketTabTypes';
import type {Ticket_SearchRequest,Ticket_SearchRow1} from './contracts';
import {z} from 'zod';
import type {Ticket_GetByIDResponse,Ticket_GetPendingApprovalRow1,Ticket_GetDashboardSummaryRow1,Ticket_GetPriorityQueueRow1,Dashboard_PendingFollowUpsRow1,Ticket_GetActivityHistoryRow1,Ticket_GetStatusHistoryRow1,Priority_GetAllRow1,TicketStatus_GetAllRow1} from './contracts';
export type Session={id:string;name:string;capability:string;verifiedUntil:string};
export type Pending=Ticket_GetPendingApprovalRow1;
export type Ticket=Ticket_GetByIDResponse;
export type StatusCount=Ticket_GetDashboardSummaryRow1;
export interface Range {fromDate:string;toDate:string}
export interface Page {page:number;pageSize:number;fromDate?:string;toDate?:string}
export interface Dashboard {statuses:StatusCount[];queue:Pending[];priorityQueue:Ticket_GetPriorityQueueRow1[];reminders:Dashboard_PendingFollowUpsRow1[];overdue:number|null;errors:string[]}
export type RequestSearch=Ticket_SearchRequest;
export type RequestRow=Ticket_SearchRow1;
export type AllowedTransition={toStatusID?:number|null;statusCode?:string|null;statusName?:string|null;requiresRemarks?:boolean|null;requiresForwardingConfirmation?:boolean|null};
export type ForwardEmail={requestID:number;expectedRowVersion:string;forwardingType:'BRANCH'|'DIVISION';destinationName:string;toAddresses:string;ccAddresses?:string;subject:string;body:string};
export interface ManagerClient {
 transitions(id:number,signal?:AbortSignal):Promise<AllowedTransition[]>;
 updateStatus(id:number,version:string,toStatusID:number,remarks:string):Promise<void>;
 forwardEmail(payload:ForwardEmail):Promise<void>;
 schedule(id:number,scheduledAt:string,managerID:string):Promise<void>;
 notes(id:number,signal?:AbortSignal):Promise<FollowupNote[]>;
 reminders(id:number,signal?:AbortSignal):Promise<TicketReminder[]>;
 communications(id:number,signal?:AbortSignal):Promise<TicketCommunication[]>;
 forwardings(id:number,signal?:AbortSignal):Promise<TicketForwarding[]>;
 followups(filters:Range & Page,signal?:AbortSignal):Promise<Dashboard_PendingFollowUpsRow1[]>;
 search(filters:RequestSearch,signal?:AbortSignal):Promise<RequestRow[]>;
 readonly mode:'LIVE'|'MOCK';onExpired?:()=>void;
 session(signal?:AbortSignal):Promise<Session>;login(email:string,password:string):Promise<Session>;developmentLogin():Promise<Session>;logout():Promise<void>;
 dashboard(range:Range,signal?:AbortSignal):Promise<Dashboard>;pending(page:Page,signal?:AbortSignal):Promise<Pending[]>;priority(page:Page,signal?:AbortSignal):Promise<Pending[]>;
 ticket(id:number,signal?:AbortSignal):Promise<Ticket>;history(id:number,signal?:AbortSignal):Promise<{status:Ticket_GetStatusHistoryRow1[];activity:Ticket_GetActivityHistoryRow1[]}>;
 references(signal?:AbortSignal):Promise<{priorities:Priority_GetAllRow1[];statuses:TicketStatus_GetAllRow1[]}>;
 decide(id:number,version:string,decision:'approve'|'reject',remarks:string):Promise<void>;
}
export class ApiError extends Error{constructor(message:string,readonly status:number,readonly correlationId?:string){super(message);}}
export const loginSchema=z.object({email:z.email('Enter a valid email address.'),password:z.string().min(1,'Enter your password.')});
export const decisionSchema=z.object({decision:z.enum(['approve','reject']),remarks:z.string().max(2000,'Maximum 2,000 characters.'),confirmed:z.boolean()}).superRefine((v,c)=>{if(!v.confirmed)c.addIssue({code:'custom',path:['confirmed'],message:'Confirm your decision before submission.'});if(v.decision==='reject'&&!v.remarks.trim())c.addIssue({code:'custom',path:['remarks'],message:'A rejection reason is required.'});});
export const validSession=(s:Session)=>s.capability==='MANAGER'&&Number.isFinite(Date.parse(s.verifiedUntil))&&Date.parse(s.verifiedUntil)>Date.now();
export const maskMobile=(s?:string|null)=>!s?'Not supplied':/[*•]/.test(s)?s:'***'+s.slice(-4);
export const display=(s:unknown)=>s===null||s===undefined||s===''?'Not supplied':String(s);
export const label=(s?:string|null)=>s?s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()):'Not supplied';
export function dateRange(from:string,to:string):Range{const start=Date.parse(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z')+86400000;if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(start)||!Number.isFinite(end)||start>=end||(end-start)/86400000>366||new Date(start).toISOString().slice(0,10)!==from||new Date(end-86400000).toISOString().slice(0,10)!==to)throw Error('Choose an inclusive date range of up to 366 days.');return {fromDate:new Date(start).toISOString(),toDate:new Date(end).toISOString()};}
export const safeId=(s:string)=>{const n=Number(s);if(!/^\d+$/.test(s)||!Number.isSafeInteger(n)||n<1)throw Error('Invalid request ID.');return n;};





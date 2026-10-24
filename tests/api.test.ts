import {describe,it,expect,vi} from 'vitest';
import {LiveManagerClient} from '../src/api';
import {ApiError,dateRange,decisionSchema,loginSchema,maskMobile,safeId,validSession} from '../src/domain';
const session={id:'MGR1',name:'Verified Manager',capability:'MANAGER',verifiedUntil:'2099-01-01T00:00:00Z'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify({success:status===200,data,message:status===409?'Concurrency conflict':'Operation unavailable',correlationId:'test-ref'}),{status,headers:{'Content-Type':'application/json'}});
describe('actual API contract and safety',()=>{
 it('uses the existing ticket-tab read endpoints and their exact ID field names',async()=>{
  const f=vi.fn(async(path:RequestInfo|URL,init?:RequestInit)=>String(path).endsWith('/csrf')?response({token:'t'}):response({rows1:[]}));
  const client=new LiveManagerClient(f as typeof fetch);
  await Promise.all([client.notes(7001),client.reminders(7001),client.communications(7001),client.forwardings(7001)]);
  const calls=f.mock.calls.filter(([path])=>!String(path).endsWith('/csrf')).map(([path,init])=>({path:String(path),body:JSON.parse(String(init?.body))}));
  expect(calls).toEqual(expect.arrayContaining([
   {path:'/api/v1/follow/follow-up/get-by-ticket',body:{requestID:7001}},
   {path:'/api/v1/follow/follow-up-schedule/get-by-ticket',body:{requestID:7001}},
   {path:'/api/v1/communications/communication/get-by-ticket',body:{id:7001}},
   {path:'/api/v1/follow/forwarding/get-by-ticket',body:{requestID:7001}}
  ]));
 });
 it('finds normal pending approvals beyond a full page of critical requests',async()=>{
  const f=vi.fn(async(path:RequestInfo|URL)=>String(path).endsWith('/csrf')?response({token:'t'}):response({rows1:[]}));
  const client=new LiveManagerClient(f as typeof fetch);
  const pending=vi.spyOn(client,'pending').mockImplementation(async page=>page.page===1?Array.from({length:200},(_,i)=>({requestID:i+1,priorityCode:'CRITICAL',totalRows:205})):Array.from({length:5},(_,i)=>({requestID:201+i,priorityCode:'NORMAL',totalRows:205})));
  const data=await client.dashboard(dateRange('2026-10-01','2026-10-23'));
  expect(data.queue.filter(r=>r.priorityCode==='NORMAL')).toHaveLength(5);
  expect(pending).toHaveBeenCalledTimes(2);
  expect(pending.mock.calls[1][0]).toMatchObject({page:2,pageSize:200});
 });
 it('uses same-origin cookies, CSRF and the existing manager credential field names',async()=>{const f=vi.fn(async(path:RequestInfo|URL)=>String(path).endsWith('/csrf')?response({token:'csrf'}):response(session));const p=new LiveManagerClient(f as typeof fetch);await p.login('manager@example.invalid','secret');expect((f.mock.calls[1] as unknown[])[1]).toMatchObject({credentials:'same-origin',headers:{'X-CSRF-TOKEN':'csrf'},body:JSON.stringify({username:'manager@example.invalid',password:'secret'})});});
 it('sends row version and no actor identity with a decision',async()=>{const f=vi.fn(async(path:RequestInfo|URL)=>String(path).endsWith('/csrf')?response({token:'csrf'}):response({}));await new LiveManagerClient(f as typeof fetch).decide(7001,'AAAAAAAAAAE=','reject','  Reason  ');expect(f.mock.calls[1][0]).toBe('/api/v1/tickets/ticket/reject');expect((f.mock.calls[1] as unknown[])[1]).toMatchObject({body:JSON.stringify({requestID:7001,expectedRowVersion:'AAAAAAAAAAE=',remarks:'Reason'})});});
 it('deduplicates simultaneous CSRF acquisition',async()=>{const f=vi.fn(async(path:RequestInfo|URL)=>String(path).endsWith('/csrf')?response({token:'t'}):response({rows1:[]}));const p=new LiveManagerClient(f as typeof fetch);await Promise.all([p.pending({page:1,pageSize:10}),p.pending({page:2,pageSize:10})]);expect(f.mock.calls.filter(c=>String(c[0]).endsWith('/csrf'))).toHaveLength(1);});
 it('rejects Agent sessions and expired Manager sessions',async()=>{const f=vi.fn(async()=>response({...session,capability:'AGENT'}));await expect(new LiveManagerClient(f as typeof fetch).session()).rejects.toMatchObject({status:403});expect(validSession({...session,verifiedUntil:'2000-01-01T00:00:00Z'})).toBe(false);});
 it('expires on 401 but preserves a verified session on operation-specific 403',async()=>{const f=vi.fn(async()=>response(null,401));const p=new LiveManagerClient(f as typeof fetch),expired=vi.fn();p.onExpired=expired;await expect(p.request('/api/v1/auth/session')).rejects.toMatchObject({status:401,correlationId:'test-ref'});expect(expired).toHaveBeenCalledOnce();f.mockImplementation(async()=>response(null,403));await expect(p.request('/api/v1/auth/session')).rejects.toMatchObject({status:403});expect(expired).toHaveBeenCalledOnce();});
 it('does not retry a conflict or a network failure',async()=>{const f=vi.fn(async()=>response(null,409));const p=new LiveManagerClient(f as typeof fetch);await expect(p.request('/api/v1/example')).rejects.toBeInstanceOf(ApiError);expect(f).toHaveBeenCalledOnce();f.mockRejectedValueOnce(Error('offline'));await expect(p.request('/api/v1/example')).rejects.toThrow('offline');expect(f).toHaveBeenCalledTimes(2);});
 it('blocks external API paths and throttles repeated rate-limit calls',async()=>{const f=vi.fn(async()=>response(null,429));const p=new LiveManagerClient(f as typeof fetch);await expect(p.request('https://other.invalid')).rejects.toThrow('same-origin');await expect(p.request('/api/v1/one')).rejects.toMatchObject({status:429});await expect(p.request('/api/v1/two')).rejects.toMatchObject({status:429});expect(f).toHaveBeenCalledOnce();});
 it('requires rejection reason, confirmation and bounded remarks',()=>{expect(decisionSchema.safeParse({decision:'reject',remarks:' ',confirmed:true}).success).toBe(false);expect(decisionSchema.safeParse({decision:'approve',remarks:'',confirmed:false}).success).toBe(false);expect(decisionSchema.safeParse({decision:'approve',remarks:'x'.repeat(2001),confirmed:true}).success).toBe(false);expect(decisionSchema.safeParse({decision:'approve',remarks:'',confirmed:true}).success).toBe(true);});
 it('uses exclusive upper UTC date boundaries and validates IDs/email/masking',()=>{expect(dateRange('2026-10-01','2026-10-23')).toEqual({fromDate:'2026-10-01T00:00:00.000Z',toDate:'2026-10-24T00:00:00.000Z'});expect(()=>dateRange('2026-02-30','2026-03-01')).toThrow();expect(()=>safeId('90071992547409999')).toThrow();expect(()=>safeId('1e3')).toThrow();expect(maskMobile('01712345678')).toBe('***5678');expect(maskMobile('***5678')).toBe('***5678');expect(loginSchema.safeParse({email:'bad',password:''}).success).toBe(false);});
});



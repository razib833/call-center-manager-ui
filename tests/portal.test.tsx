import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {AuthProvider} from '../src/auth';
import {App} from '../src/App';
import {MockManagerClient} from '../src/mock';
import {ApiError} from '../src/domain';
async function mount(path='/dashboard',loggedIn=true,p=new MockManagerClient()){if(loggedIn)await p.developmentLogin();const query=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false,gcTime:0},mutations:{retry:false}}});render(<QueryClientProvider client={query}><AuthProvider client={p}><MemoryRouter initialEntries={[path]}><App/></MemoryRouter></AuthProvider></QueryClientProvider>);return {p,query};}
async function review(p=new MockManagerClient()){await mount('/tickets/7001',true,p);await waitFor(()=>expect(screen.getByRole('button',{name:'Approve request'})).toBeEnabled());return p;}
describe('Increment 1 Manager portal',()=>{
 it('loads the remaining history tabs for the selected ticket and removes Attachments',async()=>{
  const p=new MockManagerClient();
  const notes=vi.spyOn(p,'notes').mockResolvedValue([{followUpID:31,requestID:7001,followUpType:'PHONE_CALL',followUpNote:'Confirmed synthetic follow-up note.',createdByManagerName:'Test Manager',createdAt:'2026-10-23T09:00:00Z'}]);
  vi.spyOn(p,'reminders').mockResolvedValue([{followUpScheduleID:44,requestID:7001,followUpSubject:'Synthetic callback reminder',scheduledAt:'2026-10-25T09:00:00Z',reminderStatus:'PENDING',assignedManagerID:'MGR001'}]);
  const communications=vi.spyOn(p,'communications').mockResolvedValue([{communicationID:55,requestID:7001,channelCode:'SMS',eventCode:'TICKET_CREATED',communicationStatus:'PENDING',createdAt:'2026-10-23T09:00:00Z'}]);
  const forwardings=vi.spyOn(p,'forwardings').mockResolvedValue([{forwardingID:66,requestID:7001,destinationName:'Synthetic Test Branch',forwardingType:'BRANCH',submissionStatus:'PENDING',emailSubject:'Synthetic forwarding subject'}]);
  await mount('/activity',true,p);await screen.findByLabelText('Ticket ID');
  fireEvent.change(screen.getByLabelText('Ticket ID'),{target:{value:'7001'}});fireEvent.click(screen.getByRole('button',{name:'Find Ticket'}));
  await screen.findByRole('heading',{name:'Service Request Activity History'});
  expect(screen.queryByRole('tab',{name:'Attachments'})).not.toBeInTheDocument();
  expect(notes).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab',{name:'Follow-up Notes'}));
  expect(await screen.findByText('Confirmed synthetic follow-up note.')).toBeVisible();
  expect(await screen.findByText('Synthetic callback reminder')).toBeVisible();
  expect(notes.mock.calls[0][0]).toBe(7001);
  fireEvent.click(screen.getByRole('tab',{name:'Customer Communications'}));
  expect(await screen.findByText('SMS')).toBeVisible();expect(communications.mock.calls[0][0]).toBe(7001);
  fireEvent.click(screen.getByRole('tab',{name:'Related Information'}));
  expect(await screen.findByText('Synthetic Test Branch')).toBeVisible();expect(forwardings.mock.calls[0][0]).toBe(7001);
 });
 it('shows a retryable notes error and recovers without hiding ticket reminders',async()=>{
  const p=new MockManagerClient();vi.spyOn(p,'notes').mockRejectedValueOnce(new ApiError('Notes temporarily offline',503)).mockResolvedValue([]);
  await mount('/activity',true,p);await screen.findByLabelText('Ticket ID');
  fireEvent.change(screen.getByLabelText('Ticket ID'),{target:{value:'7001'}});fireEvent.click(screen.getByRole('button',{name:'Find Ticket'}));
  await screen.findByRole('heading',{name:'Service Request Activity History'});fireEvent.click(screen.getByRole('tab',{name:'Follow-up Notes'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Notes temporarily offline');
  fireEvent.click(screen.getByRole('button',{name:'Try again'}));
  expect(await screen.findByText('No follow-up notes have been recorded for this ticket.')).toBeVisible();
 });
 it('requires a ticket lookup before showing its activity history',async()=>{
  const p=new MockManagerClient(),ticket=vi.spyOn(p,'ticket'),history=vi.spyOn(p,'history');
  await mount('/activity',true,p);
  expect(await screen.findByRole('heading',{name:/^Activity History$/})).toBeVisible();
  expect(ticket).not.toHaveBeenCalled();expect(history).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Ticket ID'),{target:{value:'7001'}});
  fireEvent.click(screen.getByRole('button',{name:'Find Ticket'}));
  expect(await screen.findByRole('heading',{name:'Service Request Activity History'})).toBeVisible();
  expect(await screen.findByText('Demonstration request created')).toBeVisible();
  expect(screen.getByRole('link',{name:'View / Update Ticket'})).toHaveAttribute('href','/tickets/7001');
 });
 it('looks up an exact ticket number and clears old history when searching again',async()=>{
  await mount('/activity');
  await screen.findByLabelText('Ticket ID');
  fireEvent.change(screen.getByLabelText('Ticket ID'),{target:{value:'DEMO-MGR-7001'}});
  fireEvent.click(screen.getByRole('button',{name:'Find Ticket'}));
  await screen.findByText('Demonstration request created');
  fireEvent.click(screen.getByRole('button',{name:'Search Another Ticket'}));
  expect(screen.queryByText('Demonstration request created')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ticket ID'),{target:{value:'999999'}});
  fireEvent.click(screen.getByRole('button',{name:'Find Ticket'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
  expect(screen.queryByRole('heading',{name:'Service Request Activity History'})).not.toBeInTheDocument();
 });
 it('searches from the Advanced Search menu and applies approval criteria',async()=>{
  await mount('/advanced-search');
  expect(await screen.findByRole('heading',{name:'Advanced Search'})).toBeVisible();
  await screen.findByText('DEMO-MGR-7012');
  fireEvent.change(screen.getByLabelText('Approval Decision'),{target:{value:'REJECTED'}});
  fireEvent.click(screen.getByRole('button',{name:/^Search$/}));
  await screen.findByText('DEMO-MGR-7009');
  await waitFor(()=>{expect(screen.queryByText('DEMO-MGR-7012')).not.toBeInTheDocument();expect(screen.getByText('DEMO-MGR-7009')).toBeVisible();});
  expect(within(screen.getByText('DEMO-MGR-7009').closest('tr')!).getByRole('link',{name:'Review'})).toHaveAttribute('href','/tickets/7009');
 });
 it('returns to All Service Requests after login from its protected URL',async()=>{
  await mount('/requests',false);
  await screen.findByRole('heading',{name:'Welcome back'});
  fireEvent.click(screen.getByRole('button',{name:'Use development Manager'}));
  expect(await screen.findByRole('heading',{name:'All Service Requests'})).toBeVisible();
 });
 it('loads pending follow-ups and opens their associated requests',async()=>{
  await mount('/follow-ups');
  expect(await screen.findByRole('heading',{name:'Pending Follow-ups'})).toBeVisible();
  const reminder=await screen.findByText('Demo follow-up review');
  expect(within(reminder.closest('tr')!).getByRole('link',{name:'Review'})).toHaveAttribute('href','/tickets/7007');
  fireEvent.change(screen.getByLabelText('Search Reminders'),{target:{value:'no matching subject'}});
  expect(screen.getByText('No pending follow-ups match these filters.')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Clear Filters'}));
  expect(await screen.findByText('Demo follow-up review')).toBeVisible();
 });
 it('loads all request statuses and searches an exact ticket number',async()=>{
  await mount('/requests');
  expect(await screen.findByRole('heading',{name:'All Service Requests'})).toBeVisible();
  await screen.findByText('DEMO-MGR-7009');
  fireEvent.change(screen.getByLabelText('Ticket Number'),{target:{value:'DEMO-MGR-7009'}});
  fireEvent.click(screen.getByRole('button',{name:'Search'}));
  await screen.findByText('DEMO-MGR-7009');
  expect(screen.queryByText('DEMO-MGR-7012')).not.toBeInTheDocument();
  expect(within(screen.getByText('DEMO-MGR-7009').closest('tr')!).getByRole('link',{name:'Review'})).toHaveAttribute('href','/tickets/7009');
 });
 it('shows the priority menu queue and filters Critical and High requests',async()=>{
  await mount('/priority');
  expect(await screen.findByRole('heading',{name:'Priority Requests'})).toBeVisible();
  await screen.findByText('DEMO-MGR-7001');
  expect(screen.queryByText('DEMO-MGR-7003')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Priority'),{target:{value:'HIGH'}});
  expect(screen.getByText('DEMO-MGR-7002')).toBeVisible();
  expect(screen.queryByText('DEMO-MGR-7001')).not.toBeInTheDocument();
  expect(within(screen.getByText('DEMO-MGR-7002').closest('tr')!).getByRole('link',{name:'Review'})).toHaveAttribute('href','/tickets/7002');
 });
 it('protects routes and labels explicit local mock authentication',async()=>{await mount('/pending',false);expect(await screen.findByRole('heading',{name:'Welcome back'})).toBeVisible();expect(screen.queryByRole('heading',{name:'Pending Approvals'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Use development Manager'}));expect(await screen.findByRole('heading',{name:'Pending Approvals'})).toBeVisible();expect(screen.getByText('MOCK DEMO')).toBeVisible();});
 it('shows dashboard counts from client data and no fabricated live notifications',async()=>{await mount();expect(await screen.findByRole('heading',{name:'Manager Dashboard'})).toBeVisible();await waitFor(()=>expect(screen.getByText('Total Service Requests').closest('.metric')).toHaveTextContent('12'));expect(screen.getByText(/cross-ticket/i)).toBeVisible();expect(screen.queryByText('8 notifications')).not.toBeInTheDocument();});
 it('handles dashboard failure without hardcoded success counts',async()=>{const p=new MockManagerClient();vi.spyOn(p,'dashboard').mockRejectedValue(Error('Dashboard offline'));await mount('/dashboard',true,p);expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard offline');expect(screen.getByText('Total Service Requests').closest('.metric')).toHaveTextContent('—');});
 it('clears protected content when the session expires',async()=>{const {p}=await mount();await screen.findByRole('heading',{name:'Manager Dashboard'});act(()=>p.onExpired?.());expect(await screen.findByRole('heading',{name:'Welcome back'})).toBeVisible();expect(screen.queryByRole('heading',{name:'Manager Dashboard'})).not.toBeInTheDocument();});
 it('rejects a server Agent identity even if a Manager role appears in the URL',async()=>{const p=new MockManagerClient();vi.spyOn(p,'session').mockResolvedValue({id:'A',name:'Agent',capability:'AGENT',verifiedUntil:'2099-01-01T00:00:00Z'});await mount('/dashboard?role=MANAGER',false,p);expect(await screen.findByRole('heading',{name:'Welcome back'})).toBeVisible();});
 it('loads pending approvals with server pagination and honest page-level search',async()=>{const p=new MockManagerClient(),pending=vi.spyOn(p,'pending');await mount('/pending',true,p);await screen.findByText('DEMO-MGR-7001');fireEvent.change(screen.getByLabelText('Search this page'),{target:{value:'7002'}});expect(screen.getByText('DEMO-MGR-7002')).toBeVisible();expect(screen.queryByText('DEMO-MGR-7001')).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('Page size'),{target:{value:'25'}});await waitFor(()=>expect(pending.mock.calls.at(-1)?.[0].pageSize).toBe(25));});
 it('requires explicit confirmation before approving',async()=>{const p=await review(),decision=vi.spyOn(p,'decide');fireEvent.click(screen.getByRole('button',{name:'Approve request'}));const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Confirm approval'}));expect(await within(dialog).findByRole('alert')).toHaveTextContent('Confirm your decision');expect(decision).not.toHaveBeenCalled();fireEvent.click(within(dialog).getByRole('checkbox'));fireEvent.click(within(dialog).getByRole('button',{name:'Confirm approval'}));await screen.findByText(/Demonstration decision saved/);expect(decision).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Approve request'})).toBeDisabled();});
 it('rejects blank rejection reasons and then submits a reason with the row version',async()=>{const p=await review(),decision=vi.spyOn(p,'decide');fireEvent.click(screen.getByRole('button',{name:'Reject request'}));const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('checkbox'));fireEvent.change(within(dialog).getByLabelText('Rejection reason'),{target:{value:'  '}});fireEvent.click(within(dialog).getByRole('button',{name:'Confirm rejection'}));expect(await within(dialog).findByRole('alert')).toHaveTextContent('rejection reason');expect(decision).not.toHaveBeenCalled();fireEvent.change(within(dialog).getByLabelText('Rejection reason'),{target:{value:'Demonstration rejection'}});fireEvent.click(within(dialog).getByRole('button',{name:'Confirm rejection'}));await screen.findByText(/Demonstration decision saved/);expect(decision).toHaveBeenCalledWith(7001,'AAAAAAAAAAE=','reject','Demonstration rejection');});
 it('reloads after a concurrency conflict and never replays a decision',async()=>{const p=new MockManagerClient();const decide=vi.spyOn(p,'decide').mockImplementationOnce(async id=>{p.simulateConcurrentDecision(id);throw new ApiError('Already processed',409);});await review(p);fireEvent.click(screen.getByRole('button',{name:'Approve request'}));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Confirm approval'}));expect(await screen.findByText(/This request changed or was already processed/)).toBeVisible();expect(decide).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Approve request'})).toBeDisabled();});
 it('does not allow decisions after server authorization denies access',async()=>{const p=new MockManagerClient();vi.spyOn(p,'decide').mockRejectedValue(new ApiError('Access denied',403));await review(p);fireEvent.click(screen.getByRole('button',{name:'Approve request'}));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Confirm approval'}));expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');expect(screen.getByRole('button',{name:'Approve request'})).toBeDisabled();});
 it('does not offer approval for a terminal ticket',async()=>{await mount('/tickets/7007');await screen.findByRole('heading',{name:'Manager decision'});await waitFor(()=>expect(screen.getByRole('button',{name:'Approve request'})).toBeDisabled());});
 it('marks missing submitted field values explicitly instead of fabricating them',async()=>{await review();expect(screen.getByText(/omits submitted values/)).toBeVisible();expect(screen.getAllByText('Not supplied by API').length).toBeGreaterThan(0);});
 it('keeps configuration and audit modules gated as later increments',async()=>{await mount('/configuration');expect(await screen.findByRole('heading',{name:'Not enabled in this increment'})).toBeVisible();expect(screen.getByText(/CONFIG \/ AUDIT/)).toBeVisible();});
 it('supports collapsing the sidebar',async()=>{await mount();await screen.findByRole('heading',{name:'Manager Dashboard'});fireEvent.click(screen.getByRole('button',{name:'Toggle sidebar'}));expect(document.querySelector('.manager-app')).toHaveClass('collapsed');});
});










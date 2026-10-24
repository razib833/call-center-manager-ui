import {createContext,useContext,useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {ManagerClient,Session} from './domain';
import {validSession} from './domain';
interface Auth {client:ManagerClient;session:Session|null;loading:boolean;setSession:(s:Session)=>void;logout:()=>Promise<void>;expired:boolean}
const Context=createContext<Auth|null>(null);
export function AuthProvider({client,children}:{client:ManagerClient;children:ReactNode}){
 const query=useQueryClient();const [session,setIdentity]=useState<Session|null>(null),[loading,setLoading]=useState(true),[expired,setExpired]=useState(false);
 const clear=()=>{setIdentity(null);query.clear();};
 useEffect(()=>{let active=true;const controller=new AbortController();client.onExpired=()=>{if(active){clear();setExpired(true);}};client.session(controller.signal).then(s=>{if(active&&validSession(s))setIdentity(s);}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;controller.abort();client.onExpired=undefined;};},[client]);
 useEffect(()=>{if(!session)return;const until=Date.parse(session.verifiedUntil)-Date.now();if(until<=0){clear();setExpired(true);return;}const timer=setTimeout(()=>{clear();setExpired(true);},Math.min(until,2147483647));return()=>clearTimeout(timer);},[session]);
 const setSession=(s:Session)=>{if(!validSession(s))throw Error('Verified Manager session required.');query.clear();setIdentity(s);setExpired(false);};
 const logout=async()=>{try{await client.logout();}finally{clear();}};
 return <Context.Provider value={{client,session,loading,setSession,logout,expired}}>{children}</Context.Provider>;
}
export function useAuth(){const a=useContext(Context);if(!a)throw Error('AuthProvider missing');return a;}

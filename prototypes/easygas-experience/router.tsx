import React,{useSyncExternalStore}from'react';
const listeners=new Set<()=>void>();
export function notify(){listeners.forEach(f=>f());}
window.addEventListener('popstate',notify);
export function navigate(href:string,replace=false){const u=new URL(href,location.href);if(u.origin!==location.origin){window.dispatchEvent(new CustomEvent('prototype:external',{detail:{url:u.href}}));return;}history[replace?'replaceState':'pushState']({},'',u.pathname+u.search+u.hash);notify();window.scrollTo(0,0);}
const subscribe=(cb:()=>void)=>{listeners.add(cb);return()=>{listeners.delete(cb)}};
export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname)}
export function useSearchParams(){const s=useSyncExternalStore(subscribe,()=>location.search);return React.useMemo(()=>new URLSearchParams(s),[s]);}
const router={push:(p:string)=>navigate(p),replace:(p:string)=>navigate(p,true),refresh:()=>notify(),back:()=>history.back(),forward:()=>history.forward(),prefetch:()=>Promise.resolve()};
export const useRouter=()=>router;
export default function Link({href,onClick,onNavigate,children,prefetch,replace,scroll,...props}:any){const url=typeof href==='string'?href:href.pathname+(href.query?'?'+new URLSearchParams(href.query):'');return <a {...props} href={url} onClick={e=>{onClick?.(e);if(e.defaultPrevented||e.ctrlKey||e.metaKey||props.target==='_blank')return;let prevent=false;onNavigate?.({preventDefault:()=>{prevent=true}});if(!prevent){e.preventDefault();navigate(url,replace);}}}>{children}</a>;}

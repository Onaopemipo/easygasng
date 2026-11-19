export const notify=()=>window.dispatchEvent(new Event('mobile:refresh'));
export function navigate(route:string){window.dispatchEvent(new CustomEvent('mobile:navigate',{detail:route}));}

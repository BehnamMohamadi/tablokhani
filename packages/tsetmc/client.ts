import { parse, isLosslessNumber } from 'lossless-json';
const ORIGIN='https://cdn.tsetmc.com';
export function officialUrl(path:string) {
 const url = new URL(path,ORIGIN);
 if(url.origin!==ORIGIN || !url.pathname.startsWith('/api/') || url.username || url.password) throw new Error('Only direct TSETMC API URLs are allowed');
 return url;
}
export function parsePayload(text:string) {
 if (/^\s*</.test(text)) throw new Error(text.includes('مسدود')?'TSETMC_BLOCKED':'TSETMC_NON_JSON');
 return parse(text,(_key,value)=>isLosslessNumber(value)?value.toString():value);
}
export async function fetchTsetmc(path:string) {
 const url=officialUrl(path); const startedAt=new Date();
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{Accept:'application/json','User-Agent':'TablokhaniResearch/0.1'}});
 const text=await response.text();
 if(!response.ok) throw new Error(`TSETMC_HTTP_${response.status}`);
 if(text.length>24_000_000) throw new Error('TSETMC_RESPONSE_TOO_LARGE');
 const payload=parsePayload(text);
 return {url:url.href,startedAt,receivedAt:new Date(),payload,raw:text};
}

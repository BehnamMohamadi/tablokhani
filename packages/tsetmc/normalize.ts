import { enrich } from '../analytics/index.ts';
import type {Quote} from '../shared/types.ts';
type Row=Record<string,unknown>;
function rows(payload:unknown,keys:string[]):Row[]{
 if(Array.isArray(payload))return payload as Row[];
 if(payload&&typeof payload==='object')for(const key of keys){const value=(payload as Row)[key];if(Array.isArray(value))return value as Row[];}
 throw new Error('TSETMC_SCHEMA_UNRECOGNIZED');
}
export function integer(value:unknown):number|null {if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;}
function exact(value:unknown):string|null {const s=String(value??'').replace(/\.0+$/,'');return /^\d+$/.test(s)?s:null;}
export function normalize(market:unknown,clients:unknown,receivedAt:string):Quote[]{
 const list=rows(market,['marketwatch','marketWatch','closingPrice','data']);
 const clientList=clients===null?[]:rows(clients,['clientTypeAllDto','clientType','clientTypeAll','data']);
 const byId=new Map(clientList.map(r=>[String(r.insCode),r]));
 const normalized=list.map(r=>{
   const id=String(r.insCode??'');const instrument=(r.instrument as Row|undefined)??r;
   const compact=Object.hasOwn(r,'lva');
   if(!/^\d+$/.test(id)||!(compact?r.lva:instrument.lVal18AFC))throw new Error('TSETMC_SCHEMA_INSTRUMENT');
   const c=byId.get(id); const orderRows=Array.isArray(r.blDs)?r.blDs as Row[]:[];
   const book=(side:'buy'|'sell')=>orderRows.filter(o=>Number(o.n)>0).map(o=>({price:integer(o[side==='buy'?'pmd':'pmo'])??0,volume:integer(o[side==='buy'?'qmd':'qmo'])??0,count:integer(o[side==='buy'?'zmd':'zmo'])??0})).filter(o=>o.price>0&&o.volume>0).slice(0,5);
   const q={id,symbol:String(compact?r.lva:instrument.lVal18AFC).trim(),name:String(compact?r.lvc:instrument.lVal30??instrument.lVal18AFC),industry:String(compact?r.csv:instrument.cSecVal??'نامشخص').trim(),
     last:integer(compact?r.pdv:r.pDrCotVal),close:integer(compact?r.pcl:r.pClosing),previous:integer(compact?r.py:r.priceYesterday),first:integer(compact?r.pf:r.priceFirst),high:integer(compact?r.pmx:r.priceMax),low:integer(compact?r.pmn:r.priceMin),volume:integer(compact?r.qtj:r.qTotTran5J),trades:integer(compact?r.ztt:r.zTotTran),valueRial:exact(compact?r.qtc:r.qTotCap),sourceTime:r.hEven==null?null:String(r.hEven),receivedAt,
     buyVolume:integer(c?.buy_I_Volume),sellVolume:integer(c?.sell_I_Volume),buyCount:integer(c?.buy_CountI),sellCount:integer(c?.sell_CountI),legalBuyVolume:integer(c?.buy_N_Volume),legalSellVolume:integer(c?.sell_N_Volume),bids:book('buy'),asks:book('sell'),quality:c?[]:['client-data-missing']};
   if(q.buyVolume!==null&&q.sellVolume!==null&&q.volume!==null&&(q.buyVolume>q.volume||q.sellVolume>q.volume))q.quality.push('client-volume-inconsistent');
   if(q.last===null||q.close===null||q.volume===null)throw new Error('TSETMC_SCHEMA_PRICE');
   return enrich(q);
 });
 if(!normalized.length)throw new Error('TSETMC_EMPTY_MARKET');
 if(new Set(normalized.map(q=>q.id)).size!==normalized.length)throw new Error('TSETMC_DUPLICATE_INSTRUMENT');
 return normalized;
}

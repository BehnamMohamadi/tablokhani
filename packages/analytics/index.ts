import type {Quote,Signal} from '../shared/types.ts';
import {tradingDay} from '../shared/config.ts';
export const ratio=(a:number|null,b:number|null)=>a===null||b===null||b===0?null:a/b;
export function enrich(q:Omit<Quote,'change'|'closeChange'|'buyPerCapita'|'sellPerCapita'|'power'|'netMoneyRial'>):Quote {
 const quality=[...q.quality];
 const noTrades=q.volume===0;
 const inconsistent=q.volume!==null&&[q.buyVolume,q.sellVolume,q.legalBuyVolume,q.legalSellVolume].some(v=>v!==null&&v>q.volume!);
 if(inconsistent&&!quality.includes('client-volume-inconsistent'))quality.push('client-volume-inconsistent');
 if(noTrades&&!quality.includes('no-trades-in-snapshot'))quality.push('no-trades-in-snapshot');
 const invalid=quality.includes('client-volume-inconsistent');
 // Do not combine stale client counts with a reset market snapshot, including
 // documents persisted by an older collector version.
 if(invalid||noTrades)q={...q,buyVolume:null,sellVolume:null,buyCount:null,sellCount:null,legalBuyVolume:null,legalSellVolume:null};
 q={...q,quality};
 if(noTrades)q={...q,first:null,high:null,low:null};
 const per=(v:number|null,c:number|null)=>invalid||v===null||q.close===null?null:ratio(v*q.close,c);
 const buy=per(q.buyVolume,q.buyCount),sell=per(q.sellVolume,q.sellCount);
 return {...q,change:!noTrades&&q.previous&&q.last!==null?(q.last/q.previous-1)*100:null,closeChange:!noTrades&&q.previous&&q.close!==null?(q.close/q.previous-1)*100:null,buyPerCapita:buy,sellPerCapita:sell,power:ratio(buy,sell),netMoneyRial:!invalid&&q.buyVolume!==null&&q.sellVolume!==null&&q.close!==null?((BigInt(q.buyVolume)-BigInt(q.sellVolume))*BigInt(q.close)).toString():null};
}
export function detectSignals(previous:Quote|undefined,current:Quote,batchId:string):Signal[] {
 if(!previous || tradingDay(new Date(previous.receivedAt))!==tradingDay(new Date(current.receivedAt)) || current.last===null) return [];
 const gap=Date.parse(current.receivedAt)-Date.parse(previous.receivedAt);
 if(gap<=0||gap>60000||current.quality.length||previous.quality.length) return [];
 const out:Signal[]=[];
 for(const side of ['buy','sell'] as const){
   const v=current[`${side}Volume`],oldV=previous[`${side}Volume`],n=current[`${side}Count`],oldN=previous[`${side}Count`];
   if(v===null||oldV===null||n===null||oldN===null||v<oldV||n<=oldN)continue;
   const amount=BigInt(v-oldV)*BigInt(current.last),perCapita=Number(amount)/(n-oldN);
   if(perCapita<1_000_000_000)continue;
   out.push({id:`${batchId}:${current.id}:${side}`,instrumentId:current.id,symbol:current.symbol,at:current.receivedAt,side,amountRial:amount.toString(),perCapitaRial:perCapita,count:n-oldN,formulaVersion:'interval-estimate-v1',kind:perCapita>=2_000_000_000?'hot':'plus',quality:'estimated-from-cumulative-deltas'});
 }return out;
}
export function summarize(quotes:Quote[]) {
 const sum=(k:'valueRial'|'netMoneyRial')=>{const valid=quotes.filter(q=>q[k]!==null);return valid.length?valid.reduce((a,q)=>a+BigInt(q[k]!),0n).toString():null;};
 const valid=quotes.filter(q=>q.change!==null);
 return {count:quotes.length,positive:valid.filter(q=>q.change!>0).length,negative:valid.filter(q=>q.change!<0).length,unchanged:valid.filter(q=>q.change===0).length,averageChange:valid.length?valid.reduce((s,q)=>s+q.change!,0)/valid.length:null,valueRial:sum('valueRial'),netMoneyRial:sum('netMoneyRial'),clientCoverage:quotes.filter(q=>q.netMoneyRial!==null).length};
}
export function industries(quotes:Quote[]) {
 const groups=new Map<string,Quote[]>();for(const q of quotes){const a=groups.get(q.industry)??[];a.push(q);groups.set(q.industry,a);}
 return [...groups].map(([name,rows])=>({name,...summarize(rows)}));
}

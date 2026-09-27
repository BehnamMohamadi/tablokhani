import type {Db} from 'mongodb';
import {fetchTsetmc} from './client.ts';
import {integer} from './normalize.ts';
export async function importHistory(db:Db,id:string){
 if(!/^\d+$/.test(id))throw Error('Invalid instrument');
 const response=await fetchTsetmc(`/api/ClosingPrice/GetClosingPriceDailyList/${id}/0`);
 const list=(response.payload as any)?.closingPriceDaily;
 if(!Array.isArray(list)||!list.length)throw Error('TSETMC_HISTORY_SCHEMA');
 const rows=list.slice(0,365).map((r:any)=>{const date=String(r.dEven);if(!/^\d{8}$/.test(date)||String(r.insCode)!==id)throw Error('TSETMC_HISTORY_ID');return {instrumentId:id,day:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}`,open:integer(r.priceFirst),high:integer(r.priceMax),low:integer(r.priceMin),close:integer(r.pClosing),last:integer(r.pDrCotVal),volume:integer(r.qTotTran5J),receivedAt:response.receivedAt,sourceUrl:response.url,source:'TSETMC',adjusted:false};});
 await db.collection('official_daily').bulkWrite(rows.map(r=>({updateOne:{filter:{instrumentId:id,day:r.day},update:{$set:r},upsert:true}})));
 return rows.length;
}

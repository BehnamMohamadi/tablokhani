import type {Db} from 'mongodb';
import type {Quote} from '../shared/types.ts';
import {detectSignals,industries,summarize} from './index.ts';
import {config} from '../shared/config.ts';
export async function processBatch(db:Db,batch:any){
 const previousDocs=await db.collection<any>('latest_quotes').find().toArray();
 const previous=new Map<string,Quote>(previousDocs.map(x=>[x._id,x]));
 const quotes=batch.quotes as Quote[];const at=new Date(batch.at);const bucket=new Date(Math.floor(at.getTime()/60000)*60000);
 const signals=quotes.flatMap(q=>detectSignals(previous.get(q.id),q,batch._id));
 await db.collection<any>('market_snapshots').bulkWrite(quotes.map(q=>({updateOne:{filter:{_id:`${batch._id}:${q.id}`},update:{$setOnInsert:{...q,instrumentId:q.id,at,day:batch.day,expiresAt:new Date(at.getTime()+config.SNAPSHOT_RETENTION_DAYS*86400000)}},upsert:true}})));
 const bars=await db.collection('market_snapshots').aggregate([{$match:{at:{$gte:bucket,$lt:new Date(bucket.getTime()+60000)},last:{$type:'number'}}},{$sort:{at:1}},{$group:{_id:'$instrumentId',open:{$first:'$last'},close:{$last:'$last'},high:{$max:'$last'},low:{$min:'$last'},samples:{$sum:1}}}]).toArray();
 if(bars.length)await db.collection('intraday_bars').bulkWrite(bars.map(({_id,...bar})=>({updateOne:{filter:{instrumentId:_id,day:batch.day,bucket},update:{$set:{...bar,quality:'sampled-not-trade-complete'}},upsert:true}})));
 if(signals.length)await db.collection<any>('signal_events').bulkWrite(signals.map(s=>({updateOne:{filter:{_id:s.id},update:{$setOnInsert:{...s,at:new Date(s.at),day:batch.day}},upsert:true}})));
 await db.collection('daily_stats').bulkWrite(quotes.map(q=>({updateOne:{filter:{instrumentId:q.id,day:batch.day},update:{$set:{...q,at,final:false}},upsert:true}})));
 await db.collection<any>('instruments').bulkWrite(quotes.map(q=>({updateOne:{filter:{_id:q.id},update:{$set:{symbol:q.symbol,name:q.name,industry:q.industry,updatedAt:at,source:'TSETMC'}},upsert:true}})));
 await db.collection<any>('market_history').updateOne({_id:batch._id},{$set:{at,day:batch.day,...summarize(quotes)}},{upsert:true});
 await db.collection<any>('industry_history').updateOne({_id:batch._id},{$set:{at,day:batch.day,rows:industries(quotes)}},{upsert:true});
 // Publish one immutable batch; API switches only after every quote is written.
 await db.collection<any>('published_quotes').bulkWrite(quotes.map(q=>({replaceOne:{filter:{_id:`${batch._id}:${q.id}`},replacement:{_id:`${batch._id}:${q.id}`,...q,batchId:batch._id,day:batch.day},upsert:true}})));
 const rules=await db.collection('alert_rules').find({enabled:true}).toArray();
 for(const rule of rules){const q=quotes.find(q=>q.id===rule.instrumentId);const value=q?.[rule.field as 'power'|'change'|'buyPerCapita'];if(value!=null&&(rule.direction==='above'?value>Number(rule.threshold):value<Number(rule.threshold)))await db.collection<any>('notifications').updateOne({_id:`${rule._id}:${batch.day}`},{$setOnInsert:{owner:'local',symbol:q!.symbol,field:rule.field,value,at,ruleId:rule._id}},{upsert:true});}
 await db.collection<any>('system_state').updateOne({_id:'worker'},{$set:{state:'ready',lastBatch:batch._id,lastProcessedAt:at,count:quotes.length}},{upsert:true});
 await db.collection<any>('latest_quotes').bulkWrite(quotes.map(q=>({replaceOne:{filter:{_id:q.id},replacement:{_id:q.id,...q,batchId:batch._id,day:batch.day},upsert:true}})));
 await db.collection<any>('ingestion_batches').updateOne({_id:batch._id},{$set:{status:'done',processedAt:new Date()},$unset:{quotes:''}});
}

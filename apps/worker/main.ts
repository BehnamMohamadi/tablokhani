import {randomUUID} from 'node:crypto';
import {connect,client} from '../../packages/database/index.ts';
import {processBatch} from '../../packages/analytics/process.ts';
import {importHistory} from '../../packages/tsetmc/history.ts';
const db=await connect();const owner=randomUUID();let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
while(!stopping){
 try{
   await db.collection<any>('locks').updateOne({_id:'worker',expiresAt:{$lt:new Date()}},{$set:{owner,expiresAt:new Date(Date.now()+30000)}},{upsert:true});
   const heartbeat=setInterval(()=>void db.collection<any>('locks').updateOne({_id:'worker',owner},{$set:{expiresAt:new Date(Date.now()+30000)}}).catch(console.error),10000);
   try{const batch=await db.collection<any>('ingestion_batches').findOne({status:'pending'},{sort:{at:1}});if(batch)await processBatch(db,batch);
     else {const job=await db.collection<any>('history_jobs').findOne({status:'pending'},{sort:{at:1}});if(job){try{const count=await importHistory(db,job.instrumentId);await db.collection<any>('history_jobs').updateOne({_id:job._id},{$set:{status:'done',count,finishedAt:new Date()}});}catch(e){await db.collection<any>('history_jobs').updateOne({_id:job._id},{$set:{status:'error',error:(e as Error).message,finishedAt:new Date()}});}}}
   }
   finally{clearInterval(heartbeat);await db.collection<any>('locks').deleteOne({_id:'worker',owner});}
 }catch(e:any){if(e.code!==11000)console.error(JSON.stringify({event:'worker_error',message:e.message}));}
 await new Promise(r=>setTimeout(r,1000));
}
await client.close();

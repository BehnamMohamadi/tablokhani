import {createHash,randomUUID} from 'node:crypto';
import {connect,client} from '../../packages/database/index.ts';
import {config,isMarketWindow,tradingDay} from '../../packages/shared/config.ts';
import {fetchTsetmc} from '../../packages/tsetmc/client.ts';
import {normalize} from '../../packages/tsetmc/normalize.ts';
const db=await connect();const owner=randomUUID();let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function collect(){
 try { await db.collection<any>('locks').updateOne({_id:'collector',expiresAt:{$lt:new Date()}},{$set:{owner,expiresAt:new Date(Date.now()+90000)}},{upsert:true}); }
 catch(e:any){if(e.code===11000)return;throw e;}
 try{
   const market=await fetchTsetmc(config.TSETMC_MARKET_PATH);
   let clients:Awaited<ReturnType<typeof fetchTsetmc>>|null=null;let clientError:string|null=null;
   try{clients=await fetchTsetmc(config.TSETMC_CLIENT_PATH);}catch(e){clientError=(e as Error).message;}
   const at=market.receivedAt.toISOString(),day=tradingDay(market.receivedAt);
   const id=createHash('sha256').update(day+market.raw+(clients?.raw??'')).digest('hex');
   const expiresAt=new Date(Date.now()+config.RAW_RETENTION_DAYS*86400000);
   await db.collection<any>('raw_payloads').updateOne({_id:id},{$setOnInsert:{at:new Date(at),expiresAt,market:market.raw,clients:clients?.raw??null,sourceUrls:[market.url,clients?.url].filter(Boolean)}},{upsert:true});
   const quotes=normalize(market.payload,clients?.payload??null,at);
   await db.collection<any>('ingestion_batches').updateOne({_id:id},{$setOnInsert:{at:new Date(at),day,status:'pending',quotes,source:'TSETMC',clientError}},{upsert:true});
   await db.collection<any>('system_state').updateOne({_id:'collector'},{$set:{state:'connected',lastAttempt:new Date(),lastSuccess:new Date(at),error:clientError,count:quotes.length}},{upsert:true});
   console.log(JSON.stringify({event:'collected',count:quotes.length,id,clientError}));
 }catch(error){
   const message=(error as Error).message;
   await db.collection<any>('system_state').updateOne({_id:'collector'},{$set:{state:message==='TSETMC_BLOCKED'?'blocked':'error',lastAttempt:new Date(),error:message}},{upsert:true});
   console.error(JSON.stringify({event:'collection_failed',message}));
 }finally{await db.collection<any>('locks').deleteOne({_id:'collector',owner});}
}
try{if(process.argv.includes('--once'))await collect();else {await collect();while(!stopping){await new Promise(r=>setTimeout(r,config.POLL_INTERVAL_MS));if(!stopping&&isMarketWindow())await collect();}}}finally{await client.close();}

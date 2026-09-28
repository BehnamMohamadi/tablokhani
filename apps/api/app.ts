import express from 'express';
import helmet from 'helmet';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {Db} from 'mongodb';
import {summarize,industries,enrich} from '../../packages/analytics/index.ts';
import {tradingDay} from '../../packages/shared/config.ts';
export function createApp(db:Db){
 const app=express();app.disable('x-powered-by');app.use(helmet());app.use(express.json({limit:'32kb'}));
 app.use((req,res,next)=>{if(!['127.0.0.1','localhost','[::1]'].includes(req.hostname))return res.status(403).json({error:'Host not allowed'});const origin=req.get('origin');if(origin&&!['http://127.0.0.1:3000','http://localhost:3000','http://127.0.0.1:4000'].includes(origin))return res.status(403).json({error:'Origin not allowed'});res.setHeader('Cache-Control','no-store');next();});
 async function market(){
   const state=await db.collection<any>('system_state').findOne({_id:'collector'});const worker=await db.collection<any>('system_state').findOne({_id:'worker'});
   const stored=worker?await db.collection<any>('published_quotes').find({batchId:worker.lastBatch}).sort({symbol:1}).toArray():[];
   const quotes=stored.map(q=>({...q,...enrich(q)}));
   return {source:'TSETMC',mode:'live',receivedAt:worker?.lastProcessedAt??null,stale:!worker?.lastProcessedAt||Date.now()-new Date(worker.lastProcessedAt).getTime()>60000,collector:state??{state:'waiting'},quotes,summary:summarize(quotes),industries:industries(quotes)};
 }
 app.get('/api/health',async(_req,res)=>{await db.command({ping:1});res.json({ok:true,database:'connected',source:'TSETMC',profile:'local-single-user'});});
 app.get('/api/market',async(_req,res)=>res.json(await market()));
 const day=(v:unknown)=>z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(v??tradingDay());
 app.get('/api/history',async(req,res)=>res.json(await db.collection('market_history').find({day:day(req.query.day)}).sort({at:1}).limit(2000).toArray()));
 app.get('/api/signals',async(req,res)=>res.json(await db.collection('signal_events').find({day:day(req.query.day)}).sort({at:-1}).limit(1000).toArray()));
 app.get('/api/industry-history',async(req,res)=>res.json(await db.collection('industry_history').find({day:day(req.query.day)}).sort({at:1}).limit(2000).toArray()));
 app.get('/api/symbols/:id/history',async(req,res)=>{const id=z.string().regex(/^\d+$/).parse(req.params.id);res.json(await db.collection('daily_stats').find({instrumentId:id}).sort({day:-1}).limit(90).toArray());});
 app.get('/api/symbols/:id/daily',async(req,res)=>{const id=z.string().regex(/^\d+$/).parse(req.params.id);res.json({rows:await db.collection('official_daily').find({instrumentId:id}).sort({day:1}).limit(365).toArray(),job:await db.collection('history_jobs').findOne({instrumentId:id},{sort:{at:-1}})});});
 app.post('/api/symbols/:id/history/refresh',async(req,res)=>{const id=z.string().regex(/^\d+$/).parse(req.params.id);if(!await db.collection<any>('instruments').findOne({_id:id}))return res.status(404).json({error:'Unknown instrument'});const key=`${id}:${tradingDay()}`;await db.collection<any>('history_jobs').updateOne({_id:key},{$setOnInsert:{instrumentId:id,status:'pending',at:new Date()}},{upsert:true});res.status(202).json({queued:true});});
 app.get('/api/symbols/:id/bars',async(req,res)=>{const id=z.string().regex(/^\d+$/).parse(req.params.id);res.json(await db.collection('intraday_bars').find({instrumentId:id,day:day(req.query.day)}).sort({bucket:1}).limit(1000).toArray());});
 app.get('/api/watchlists',async(_req,res)=>res.json(await db.collection('watchlists').find({owner:'local'}).toArray()));
 const watchSchema=z.object({name:z.string().trim().min(1).max(80),instrumentIds:z.array(z.string().regex(/^\d+$/)).max(1500)}).strict();
 app.post('/api/watchlists',async(req,res)=>{const data=watchSchema.parse(req.body);const doc={_id:randomUUID(),owner:'local',...data,instrumentIds:[...new Set(data.instrumentIds)],createdAt:new Date()};await db.collection<any>('watchlists').insertOne(doc);res.status(201).json(doc);});
 app.put('/api/watchlists/:id',async(req,res)=>{const data=watchSchema.parse(req.body);const id=z.string().uuid().parse(req.params.id);const result=await db.collection<any>('watchlists').updateOne({_id:id,owner:'local'},{$set:data});res.status(result.matchedCount?200:404).json({ok:!!result.matchedCount});});
 app.get('/api/alerts',async(_req,res)=>res.json(await db.collection('alert_rules').find({owner:'local'}).toArray()));
 app.post('/api/alerts',async(req,res)=>{const data=z.object({instrumentId:z.string().regex(/^\d+$/),field:z.enum(['power','change','buyPerCapita']),threshold:z.number().finite(),direction:z.enum(['above','below'])}).strict().parse(req.body);const doc={_id:randomUUID(),owner:'local',...data,enabled:true,createdAt:new Date()};await db.collection<any>('alert_rules').insertOne(doc);res.status(201).json(doc);});
 app.get('/api/notifications',async(_req,res)=>res.json(await db.collection('notifications').find({owner:'local'}).sort({at:-1}).limit(100).toArray()));
 app.get('/api/events',async(req,res)=>{
   res.set({'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();let closed=false;let previous='';let busy=false;
   const tick=async()=>{if(busy)return;busy=true;try{const m=await market();const key=`${m.receivedAt}:${m.collector.state}:${m.stale}`;if(!closed&&key!==previous){res.write(`event: market\ndata: ${JSON.stringify(m)}\n\n`);previous=key;}else if(!closed)res.write(': heartbeat\n\n');}catch{if(!closed)res.write('event: unavailable\ndata: {}\n\n');}finally{busy=false;}};
   const timer=setInterval(()=>void tick(),5000);req.on('close',()=>{closed=true;clearInterval(timer);});await tick();
 });
 app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(err.message);res.status(err instanceof z.ZodError?400:503).json({error:err instanceof z.ZodError?'داده ورودی معتبر نیست':'سرویس موقتاً در دسترس نیست'});});return app;
}

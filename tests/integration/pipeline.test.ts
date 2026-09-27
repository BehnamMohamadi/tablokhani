import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {createApp} from '../../apps/api/app.ts';
import {processBatch} from '../../packages/analytics/process.ts';
import {enrich} from '../../packages/analytics/index.ts';
test('Mongo pipeline replay, API, validation, watchlist persistence and alert deduplication',async()=>{
 const client=new MongoClient('mongodb://127.0.0.1:27017');await client.connect();const name=`tablokhani_test_${Date.now()}`;assert.match(name,/^tablokhani_test_\d+$/);const db=client.db(name);
 const app=createApp(db);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address() as any;const base=`http://127.0.0.1:${address.port}/api`;
 const q=enrich({id:'12345678901234567',symbol:'تست',name:'تست',industry:'27',last:10000,close:10000,previous:9000,first:9000,high:10000,low:9000,volume:1000000,trades:100,valueRial:'10000000000',sourceTime:'100000',receivedAt:'2026-09-27T06:30:00.000Z',buyVolume:500000,sellVolume:300000,buyCount:10,sellCount:10,legalBuyVolume:500000,legalSellVolume:700000,bids:[],asks:[],quality:[]});
 try{
   const health=await(await fetch(`${base}/health`)).json();assert.equal(health.database,'connected');
   await db.collection('alert_rules').insertOne({owner:'local',instrumentId:q.id,field:'power',threshold:1,direction:'above',enabled:true});
   const first={_id:'one',at:new Date(q.receivedAt),day:'2026-09-27',quotes:[q]};await processBatch(db,first);await processBatch(db,first);
   const second={_id:'two',at:new Date('2026-09-27T06:30:15.000Z'),day:'2026-09-27',quotes:[enrich({...q,receivedAt:'2026-09-27T06:30:15.000Z',buyVolume:900000,buyCount:11})]};await processBatch(db,second);await processBatch(db,second);
   assert.equal(await db.collection('market_snapshots').countDocuments(),2);assert.equal(await db.collection('signal_events').countDocuments(),1);assert.equal(await db.collection('notifications').countDocuments(),1);assert.equal(await db.collection('intraday_bars').countDocuments(),1);
   const market=await(await fetch(`${base}/market`)).json();assert.equal(market.quotes.length,1);assert.equal(market.quotes[0].buyCount,11);assert.equal(market.source,'TSETMC');
   let r=await fetch(`${base}/watchlists`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'منتخب',instrumentIds:[q.id,q.id]})});assert.equal(r.status,201);const saved=await r.json();assert.equal(saved.instrumentIds.length,1);assert.equal((await(await fetch(`${base}/watchlists`)).json()).length,1);
   r=await fetch(`${base}/watchlists`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'',instrumentIds:[]})});assert.equal(r.status,400);
   r=await fetch(`${base}/watchlists`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'});assert.equal(r.status,403);
   r=await fetch(`${base}/history?day=invalid`);assert.equal(r.status,400);
 }finally{await new Promise<void>(r=>server.close(()=>r()));await db.dropDatabase();await client.close();}
});

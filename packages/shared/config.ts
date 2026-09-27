import 'dotenv/config';
import { z } from 'zod';
const env = z.object({
 HOST:z.literal('127.0.0.1').default('127.0.0.1'), PORT:z.coerce.number().int().min(1024).max(65535).default(4000),
 MONGODB_URI:z.string().default('mongodb://127.0.0.1:27017'), MONGODB_DATABASE:z.string().regex(/^[a-zA-Z0-9_-]+$/).default('tablokhani_dev'),
 POLL_INTERVAL_MS:z.coerce.number().int().min(5000).default(15000), RAW_RETENTION_DAYS:z.coerce.number().positive().default(14), SNAPSHOT_RETENTION_DAYS:z.coerce.number().positive().default(30),
 TSETMC_MARKET_PATH:z.string().default('/api/ClosingPrice/GetMarketWatch?market=0&industrialGroup=&paperTypes%5B0%5D=1'), TSETMC_CLIENT_PATH:z.string().default('/api/ClientType/GetClientTypeAll'),
 MARKET_START:z.string().regex(/^\d{2}:\d{2}$/).default('08:30'), MARKET_END:z.string().regex(/^\d{2}:\d{2}$/).default('18:15'),
 MARKET_WEEKDAYS:z.string().default('Sat,Sun,Mon,Tue,Wed'), MARKET_CLOSED_DATES:z.string().default('')
}).parse(process.env);
export const config = env;
export function tradingDay(date = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function isMarketWindow(date=new Date()) {
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const get=(t:string)=>p.find(x=>x.type===t)?.value ?? ''; const time=`${get('hour')}:${get('minute')}`;
 return env.MARKET_WEEKDAYS.split(',').includes(get('weekday')) && time>=env.MARKET_START && time<=env.MARKET_END && !env.MARKET_CLOSED_DATES.split(',').includes(tradingDay(date));
}

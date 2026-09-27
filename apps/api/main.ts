import {connect,client} from '../../packages/database/index.ts';
import {config} from '../../packages/shared/config.ts';
import {createApp} from './app.ts';
const db=await connect();const server=createApp(db).listen(config.PORT,config.HOST,()=>console.log(`API http://${config.HOST}:${config.PORT}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>void client.close().then(()=>process.exit(0))));

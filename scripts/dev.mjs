import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const pkg=JSON.parse(readFileSync(resolve(root,'apps/web/node_modules/vinext/package.json'),'utf8'));
const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.vinext;
const entries=['api','collector','worker'].map(name=>({name,cwd:root,args:[`apps/${name}/main.ts`]}));
entries.push({name:'web',cwd:resolve(root,'apps/web'),args:[resolve(root,'apps/web/node_modules/vinext',bin),'dev','--host','127.0.0.1','--port','3000']});
let stopping=false;const children=[];
function stop(code=0){if(stopping)return;stopping=true;for(const p of children)p.kill();setTimeout(()=>process.exit(code),1500).unref();}
for(const entry of entries){const p=spawn(process.execPath,entry.args,{cwd:entry.cwd,stdio:'inherit',windowsHide:true});children.push(p);p.on('error',e=>{console.error(entry.name,e.message);stop(1);});p.on('exit',code=>{if(!stopping){console.error(`${entry.name} exited (${code}). Stopping the other services.`);stop(code||1);}});}
console.log('\nTablokhani: http://127.0.0.1:3000\nAPI: http://127.0.0.1:4000/api/health\nPress Ctrl+C to stop all services.\n');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());

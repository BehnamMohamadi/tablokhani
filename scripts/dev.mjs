import {spawn} from 'node:child_process';
const children=['api','collector','worker'].map(name=>{const p=spawn(process.execPath,[`apps/${name}/main.ts`],{stdio:'inherit',windowsHide:true});p.on('exit',code=>{if(code)console.error(`${name} exited: ${code}`);});return p;});
console.log('Backend processes running. Frontend: npm run dev:web');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const p of children)p.kill();});

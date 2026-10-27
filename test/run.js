const {spawn,spawnSync}=require('child_process');
for(const file of ['rules.test.js','kitty.test.js','table.test.js','react-server.test.js']){let r=spawnSync(process.execPath,['test/'+file],{stdio:'inherit',windowsHide:true});if(r.status)process.exit(r.status)}
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'8852'},windowsHide:true,stdio:['ignore','pipe','inherit']});let started=false;
server.stdout.on('data',()=>{if(started)return;started=true;let t=spawn(process.execPath,['test/bot-selftest.js'],{env:{...process.env,PORT:'8852'},stdio:'inherit',windowsHide:true});t.on('exit',code=>{server.kill();process.exitCode=code||0})});process.on('exit',()=>server.kill());

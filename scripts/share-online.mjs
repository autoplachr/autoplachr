import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../",import.meta.url));
const windows = process.platform === "win32";
const candidates = [4323,3000,4324,4325,4326];
const children = new Set();
const host = "127.0.0.1";
const origin = port => "http://"+host+":"+port;

function start(executable,args,options={}) {
  const child=spawn(executable,args,{cwd:root,windowsHide:true,...options});
  children.add(child);
  child.once("close",()=>children.delete(child));
  return child;
}
function wait(child) {
  return new Promise((resolve,reject)=>{
    child.once("error",reject);
    child.once("close",code=>code===0 ? resolve() : reject(new Error("Proces je završio kodom "+code+".")));
  });
}
function stop() {
  for(const child of children) {
    if(!child.pid) continue;
    if(windows) spawnSync("taskkill.exe",["/pid",String(child.pid),"/t","/f"],{windowsHide:true,stdio:"ignore"});
    else child.kill();
  }
}
process.once("SIGINT",()=>{stop();process.exit(130);});
process.once("SIGTERM",()=>{stop();process.exit(143);});
process.once("exit",stop);

async function sharePreview(port) {
  try {
    const response=await fetch(origin(port)+"/__autoplac_share",{signal:AbortSignal.timeout(600),redirect:"error"});
    return response.ok && (await response.text())==="autoplac-share-preview-v1";
  } catch { return false; }
}
function availablePort(port) {
  return new Promise(resolve=>{
    const probe=createServer();
    probe.once("error",()=>resolve(0));
    probe.listen(port,host,()=>{const found=probe.address().port;probe.close(()=>resolve(found));});
  });
}
async function findPort() {
  for(const port of candidates) if(await availablePort(port)) return port;
  return availablePort(0);
}

try {
  let port;
  for(const candidate of candidates) if(await sharePreview(candidate)) {port=candidate;break;}
  if(!port) {
    port=await findPort();
    if(!port) throw new Error("Nije pronađen slobodan lokalni port.");
    console.log("Priprema javnog pregleda AUTOPLAC.HR…");
    await wait(start(process.execPath,["scripts/build-site.mjs"],{stdio:"inherit"}));
    const server=start(process.execPath,["scripts/preview-site.mjs",String(port)],{
      stdio:"inherit",env:{...process.env,AUTOPLAC_SHARE:"1",AUTOPLAC_PREVIEW_DB:":memory:",AUTOPLAC_PREVIEW_HOST:host},
    });
    let serverFailed=false;
    server.on("error",()=>{serverFailed=true;});
    server.on("exit",()=>{serverFailed=true;});
    let ready=false;
    for(let i=0;i<60&&!serverFailed;i++) {
      if(await sharePreview(port)) {ready=true;break;}
      await delay(250);
    }
    if(!ready) throw new Error("Lokalni pregled nije pokrenut.");
  }
  console.log("Lokalni pregled: "+origin(port));
  const args=["--yes","cloudflared","tunnel","--url",origin(port)];
  const tunnel=windows ? start("cmd.exe",["/d","/c","npx.cmd",...args],{stdio:["ignore","pipe","pipe"]}) :
    start("npx",args,{stdio:["ignore","pipe","pipe"]});
  let printed=false, pending="";
  function forward(chunk,stream) {
    const line=chunk.toString();
    stream.write(line);
    if(printed) return;
    pending=(pending+line).slice(-4096);
    const url=pending.match(/https:\/\/[a-z\d][a-z\d-]*\.trycloudflare\.com\b/i)?.[0];
    if(url) {printed=true;console.log("\nJAVNI LINK ZA DIJELJENJE: "+url+"\n");}
  }
  tunnel.stdout.on("data",chunk=>forward(chunk,process.stdout));
  tunnel.stderr.on("data",chunk=>forward(chunk,process.stderr));
  await wait(tunnel);
  if(!printed) throw new Error("Cloudflare nije dodijelio javni URL.");
} catch(error) {
  console.error("Dijeljenje nije pokrenuto. "+error.message);
  process.exitCode=1;
} finally {
  stop();
}

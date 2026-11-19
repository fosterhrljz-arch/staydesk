import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import archiver from 'archiver';

const root=fileURLToPath(new URL('../',import.meta.url));
const base=path.join(root,'release');
const folder=path.join(base,'StayDesk-v1.1');
const output=path.join(base,'StayDesk-v1.1-review.zip');
const inputs=['src','tests','scripts','docs','.openai','.gitignore','index.html','package.json','package-lock.json','vite.config.js','README.md'];
await fs.access(path.join(root,'dist','index.html'));
// Staging stays inside this project's explicitly checked release directory.
if(path.dirname(folder)!==base)throw new Error('Unexpected release path');
await fs.rm(folder,{recursive:true,force:true});
await fs.mkdir(folder,{recursive:true});
for(const entry of inputs)await fs.cp(path.join(root,entry),path.join(folder,entry),{recursive:true});
await fs.mkdir(path.join(folder,'dist'));
await fs.copyFile(path.join(root,'dist','index.html'),path.join(folder,'dist','index.html'));
await fs.copyFile(path.join(root,'dist','index.html'),path.join(folder,'StayDesk.html'));

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=[];
async function walk(dir){for(const ent of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory())await walk(file);else{const bytes=await fs.readFile(file);manifest.push({path:path.relative(folder,file).split(path.sep).join('/'),bytes:bytes.length,sha256:sha(bytes)});}}}
await walk(folder);manifest.sort((a,b)=>a.path.localeCompare(b.path));
await fs.writeFile(path.join(folder,'RELEASE_MANIFEST.json'),JSON.stringify({version:'1.1.0',files:manifest},null,2)+'\n');
await new Promise((resolve,reject)=>{const stream=createWriteStream(output),zip=archiver('zip',{zlib:{level:9}});stream.on('close',resolve);stream.on('error',reject);zip.on('error',reject);zip.pipe(stream);zip.directory(folder,'StayDesk-v1.1');zip.finalize();});
const hash=sha(await fs.readFile(output));await fs.writeFile(output+'.sha256',hash+'  '+path.basename(output)+'\n');
console.log(JSON.stringify({archive:output,files:manifest.length+1,sha256:hash},null,2));

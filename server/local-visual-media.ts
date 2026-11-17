import type {Request,Response} from 'express';
import {fileTypeFromBuffer} from 'file-type';
import {mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
export const visualMediaLimit=250*1024*1024;
export async function saveVisualMedia(req:Request,res:Response,dir:string){
 const files:string[]=[];
 try{
  if(!Buffer.isBuffer(req.body)||!req.body.length){res.status(400).json({error:'Escolha uma imagem PNG, JPEG, WebP ou um vídeo MP4/MOV.'});return;}
  const type=await fileTypeFromBuffer(req.body);
  const video=type&&['video/mp4','video/quicktime','video/x-m4v'].includes(type.mime);
  if(!type||(!video&&!['image/png','image/jpeg','image/webp'].includes(type.mime))){res.status(400).json({error:'Formato não permitido. Use PNG, JPEG, WebP, MP4 ou MOV.'});return;}
  const mediaDir=join(dir,'site-media');await mkdir(mediaDir,{recursive:true,mode:0o700});
  const id=randomUUID();
  if(!video){const name=id+'.'+type.ext;await writeFile(join(mediaDir,name),req.body,{mode:0o600});res.status(201).json({url:'/api/site-media/'+name,mime:type.mime});return;}
  const localBinary=join(homedir(),'.local','bin','ffmpeg');
  const ffmpeg=process.env.FFMPEG_PATH||(existsSync(localBinary)?localBinary:'ffmpeg');
  const input=join(mediaDir,id+'.upload'),temp=join(mediaDir,id+'.converting.mp4'),poster=join(mediaDir,id+'.jpg'),output=join(mediaDir,id+'.mp4');
  files.push(input,temp,poster);await writeFile(input,req.body,{mode:0o600});
  await run(ffmpeg,['-nostdin','-i',input,'-map','0:v:0','-map','0:a:0?','-vf',"scale=w='min(720,iw)':h=-2",'-c:v','libx264','-preset','fast','-crf','26','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart','-map_metadata','-1','-y',temp],{timeout:300000,maxBuffer:2*1024*1024});
  await run(ffmpeg,['-nostdin','-i',temp,'-frames:v','1','-vf','scale=360:-2','-y',poster],{timeout:30000,maxBuffer:1024*1024});
  await rename(temp,output);files.splice(files.indexOf(poster),1);
  res.status(201).json({url:'/api/site-media/'+id+'.mp4',posterUrl:'/api/site-media/'+id+'.jpg',mime:'video/mp4'});
 }catch(error){
  const missing=(error as NodeJS.ErrnoException).code==='ENOENT';
  res.status(500).json({error:missing?'O conversor de vídeo não está disponível neste computador. Configure FFMPEG_PATH ou instale FFmpeg.':'Não foi possível converter o vídeo. Confira se o arquivo abre normalmente e tente novamente.'});
 }finally{await Promise.all(files.map(file=>unlink(file).catch(()=>{})));}
}

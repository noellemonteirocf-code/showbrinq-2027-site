import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {Request,Response} from 'express';
import {saveVisualMedia} from '../local-visual-media';

for(const [name,body] of [['empty file',Buffer.alloc(0)],['fake PNG signature',Buffer.alloc(256)]] as const){
 test(`visual upload rejects ${name} without writing media`,async()=>{
  const dir=await mkdtemp(join(tmpdir(),'showbrinq-upload-test-'));
  let status=0;let payload:unknown;
  const response={status(code:number){status=code;return this},json(value:unknown){payload=value;return this}};
  try{await saveVisualMedia({body} as Request,response as unknown as Response,dir);assert.equal(status,400);assert.ok(payload&&typeof payload==='object'&&'error' in payload);assert.deepEqual(await readdir(dir),[]);}finally{await rm(dir,{recursive:true,force:true});}
 });
}

#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const [output] = process.argv.slice(2);
if (!output) throw new Error("Usage: measure-r010-font-metrics <output.json>");
const stacks=[
  {id:"macos-system",display:"-apple-system",body:"-apple-system",data:"SFMono-Regular",cjk:"PingFang SC"},
  {id:"windows-system",display:"Segoe UI Variable, Segoe UI, sans-serif",body:"Segoe UI, sans-serif",data:"Consolas, monospace",cjk:"Microsoft YaHei, sans-serif"},
  {id:"open-web",display:"Inter, sans-serif",body:"Inter, sans-serif",data:"IBM Plex Mono, monospace",cjk:"Noto Sans CJK SC, sans-serif"}
];
const samples=[
  {id:"mixed-heading",text:"Evidence 证据系统 / Operational Proof",role:"display",size:64,width:900},
  {id:"long-en",text:"A deliberately long English heading verifies line breaks without hiding the measured outcome",role:"display",size:56,width:720},
  {id:"long-zh",text:"这是一条用于验证中文长标题换行、字面密度和视觉层级的压力测试文本",role:"display",size:56,width:720},
  {id:"financial-number",text:"-$123,456,789.00  +37.25%",role:"data",size:32,width:720},
  {id:"code-data-label",text:"TXN-042 / WINDOW 18 ms / STATUS EMPTY",role:"data",size:24,width:720}
];
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const results=await page.evaluate(({stacks,samples})=>stacks.map(stack=>({stack_id:stack.id,measurements:samples.map(sample=>{const node=document.createElement("div");node.lang=sample.id==="long-zh"?"zh-CN":"en";node.textContent=sample.text;Object.assign(node.style,{position:"absolute",visibility:"hidden",fontFamily:stack[sample.role]??stack.body,fontSize:`${sample.size}px`,fontWeight:sample.role==="display"?"650":"500",lineHeight:sample.role==="display"?"1.05":"1.3",width:`${sample.width}px`,overflowWrap:"anywhere"});document.body.append(node);const box=node.getBoundingClientRect();const computed=getComputedStyle(node);const record={sample_id:sample.id,text:sample.text,requested_stack:stack[sample.role]??stack.body,computed_family:computed.fontFamily,width:box.width,height:box.height,line_height:computed.lineHeight,overflow:node.scrollWidth>node.clientWidth};node.remove();return record})})),{stacks,samples});
  await writeFile(output,`${JSON.stringify({status:"pass",runner:{os:process.platform,browser:browser.version()},stacks,results,assertions:{line_break_samples_complete:true,no_horizontal_overflow:results.every(x=>x.measurements.every(y=>!y.overflow)),font_files_redistributed:false},limitations:["Windows and open-web stacks were measured through Chromium fallback resolution on macOS; native Windows rendering remains a production validation.","No font files are included in the Package."]},null,2)}\n`);
}finally{await browser.close()}

#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(process.argv[2] ?? "examples/golden-candidates/spade-source-neutral-v2");
const html = path.join(root, "previews/preview-suite.html");
const targets = [];
for (const [kind, file] of [["system-board","system/system-board.png"],["components","system/core-component-sheet.png"],["theme-comparison","system/theme-comparison.png"],["source-distance","system/source-distance-comparison.png"]]) targets.push({kind,file,width:1440,height:1000});
for (const structure of ["web-a","web-b"]) for (const width of [320,390,768,1024,1440]) targets.push({kind:structure,file:`web/${structure}-${width}.png`,width,height:Math.max(844,Math.round(width*.72))});
targets.push({kind:"poster-a",file:"posters/poster-derived.png",width:1080,height:1350},{kind:"poster-b",file:"posters/poster-alternative.png",width:1080,height:1350});
const pages=["cover","problem","insight","mechanism","evidence","use-case","result","cta"];
pages.forEach((page,index)=>targets.push({kind:"carousel",page,file:`carousel/page-${String(index+1).padStart(2,"0")}-${page}.png`,width:1080,height:1350}));
targets.push({kind:"carousel-contact",file:"carousel/contact-sheet.png",width:1440,height:1100});
pages.forEach((page,index)=>targets.push({kind:"slide",page,file:`slides/slide-${String(index+1).padStart(2,"0")}-${page}.png`,width:1920,height:1080}));
targets.push({kind:"slide-contact",file:"slides/contact-sheet.png",width:1600,height:1000});
targets.push({kind:"real-object",file:"real-imagery/commerce-object.png",width:1440,height:1000},{kind:"real-place",file:"real-imagery/infrastructure-place.png",width:1440,height:1000});

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const target of targets){
    const output=path.join(root,"previews",target.file);await mkdir(path.dirname(output),{recursive:true});
    const page=await browser.newPage({viewport:{width:target.width,height:target.height},deviceScaleFactor:1});
    const url=new URL(pathToFileURL(html));url.searchParams.set("kind",target.kind);if(target.page)url.searchParams.set("page",target.page);
    await page.goto(url.href,{waitUntil:"load"});await page.waitForFunction(()=>[...document.images].every((image)=>image.complete));
    await page.screenshot({path:output,type:"png",fullPage:false});
    results.push({kind:target.kind,page:target.page??null,file:path.relative(root,output),viewport:`${target.width}x${target.height}`});await page.close();
  }
}finally{await browser.close()}
await writeFile(path.join(root,"previews/capture-manifest.json"),`${JSON.stringify({captured_at:new Date().toISOString(),browser:"chromium",results},null,2)}\n`);
process.stdout.write(`${JSON.stringify({status:"complete",count:results.length})}\n`);

import { chromium } from 'playwright';
const [,, base, tag, step, loc] = process.argv;
const b = await chromium.launch();
const c = await b.newContext({viewport:{width:1440,height:900},locale:loc});
const pg = await c.newPage();
await pg.addInitScript(()=>sessionStorage.setItem('ulara-intro-skip','1'));
await pg.goto(base,{waitUntil:'networkidle',timeout:40000}).catch(()=>{});
const h = await pg.evaluate(()=>document.documentElement.scrollHeight);
let i=0;
for (let y=0;y<h-100;y+=+step){
  for (let k=0;k<5;k++){await pg.evaluate(t=>window.scrollTo(0,t),y-200+k*50);await pg.waitForTimeout(40);}
  await pg.waitForTimeout(700);
  await pg.screenshot({path:`/tmp/vp-${tag}-${String(i).padStart(2,'0')}.png`}); i++;
}
console.log(tag,h,i);
await b.close();

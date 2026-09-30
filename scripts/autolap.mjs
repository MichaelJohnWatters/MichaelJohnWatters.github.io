import puppeteer from 'puppeteer-core'
// build the same stadium centreline as track.js for waypoints
const R=42,Xr=0,Xl=-84,Zb=100,Zt=520,Cx=-42
const line=(x0,z0,x1,z1,n)=>{const p=[];for(let i=1;i<=n;i++){const t=i/n;p.push([x0+(x1-x0)*t,z0+(z1-z0)*t])}return p}
const arc=(cx,cz,r,a0,a1,n)=>{const p=[];for(let i=1;i<=n;i++){const a=a0+(a1-a0)*(i/n);p.push([cx+r*Math.cos(a),cz+r*Math.sin(a)])}return p}
const WP=[[Xr,Zb],...line(Xr,Zb,Xr,Zt,14),...arc(Cx,Zt,R,0,Math.PI,18),...line(Xl,Zt,Xl,Zb,14),...arc(Cx,Zb,R,Math.PI,2*Math.PI,18)]
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal','--enable-gpu']})
const page=await b.newPage();await page.setViewport({width:900,height:600})
const errs=[];page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,3000))
await page.evaluate(()=>{localStorage.removeItem('nightgarage.ghost');localStorage.removeItem('nightgarage.bestLap')})
await page.reload({waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,7000))
await page.evaluate(()=>window.__enterCar&&window.__enterCar(0));await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive&&window.__drive(0));await new Promise(r=>setTimeout(r,900))
await page.evaluate(()=>window.__place&&window.__place(0,105,8));await new Promise(r=>setTimeout(r,300))
const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a}
let held={W:false,A:false,D:false}
const set=async(k,on)=>{if(held[k]===on)return;held[k]=on;if(on)await page.keyboard.down('Key'+k);else await page.keyboard.up('Key'+k)}
await set('W',true)
const t0=Date.now()
while(Date.now()-t0<95000){
  const c=await page.evaluate(()=>({x:window.__car.x,z:window.__car.z,h:window.__car.heading,f:window.__car.fwd}))
  // nearest waypoint, aim ~4 ahead
  let bi=0,bd=1e9;for(let i=0;i<WP.length;i++){const d=(c.x-WP[i][0])**2+(c.z-WP[i][1])**2;if(d<bd){bd=d;bi=i}}
  const tgt=WP[(bi+3)%WP.length]
  const desired=Math.atan2(tgt[0]-c.x,tgt[1]-c.z)
  const err=norm(desired-c.h)
  await set('D',err<-0.04); await set('A',err>0.04)
  await set('W', c.f<16) // cap speed so it can corner
  const hud=await page.evaluate(()=>({laps:document.getElementById('lap-count')?.textContent,best:document.getElementById('lap-best')?.textContent}))
  if(hud.laps&&+hud.laps>=1&&Date.now()-t0>62000){break}
  await new Promise(r=>setTimeout(r,120))
}
await set('W',false);await set('A',false);await set('D',false)
await page.screenshot({path:"scripts/lap2.png"}); const g=await page.evaluate(()=>{const s=localStorage.getItem('nightgarage.ghost');return s?JSON.parse(s).samples?.length:null})
const fin=await page.evaluate(()=>({laps:document.getElementById('lap-count')?.textContent,best:document.getElementById('lap-best')?.textContent,pos:{x:+window.__car.x.toFixed(0),z:+window.__car.z.toFixed(0)}}))
console.log('final:',JSON.stringify(fin),' ghost saved:',g?g+' samples':'NO',' errs:',errs.length)
await b.close()

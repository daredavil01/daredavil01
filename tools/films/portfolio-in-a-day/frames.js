const {chromium}=require('playwright');const fs=require('fs');
const L=process.argv[2],WK=+process.argv[3]||4,FPS=30;
(async()=>{const b=await chromium.launch();const vp=L==='h'?{width:1920,height:1080}:{width:1080,height:1920};
 const dir=`frames-${L}`;fs.mkdirSync(dir,{recursive:true});
 const pages=[];for(let i=0;i<WK;i++){const p=await b.newPage({viewport:vp});p.on('pageerror',e=>console.log('ERR',e.message));await p.goto(`http://localhost:3010/tools/films/portfolio-in-a-day/film.html?l=${L}`);const F=await p.evaluate(()=>window.ready);pages.push([p,F]);}
 const F=pages[0][1];fs.writeFileSync(`film-${L}.json`,JSON.stringify(F));
 const N=Math.ceil(F.TOTAL*FPS);let next=0,done=0;const t0=Date.now();
 await Promise.all(pages.map(async([p])=>{while(true){const i=next++;if(i>=N)break;const f=`${dir}/${String(i).padStart(5,'0')}.jpg`;if(fs.existsSync(f)){done++;continue;}
   await p.evaluate(t=>render(t),i/FPS);await p.screenshot({path:f,type:'jpeg',quality:92});done++;if(done%300===0)console.log(L,done,'/',N,((Date.now()-t0)/1000|0)+'s');}}));
 await b.close();console.log('done',L,N);})();

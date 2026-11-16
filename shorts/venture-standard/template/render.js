const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{
 const [html,mode,out,dur]=process.argv.slice(2);const D=parseFloat(dur);
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.addInitScript(`window.DUR=${D}`);
 await p.goto('file://'+html);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
 if(mode==='still'){for(const t of (process.env.STILLS||'2.5,6.6,11.8,14,19.5,25.6,31.5,39,42').split(',').map(Number)){await p.evaluate(t=>render(t),t);await p.screenshot({path:`${out}/still_${t}.png`})}}
 else{const fps=30,n=Math.ceil(D*fps);
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium',out],{stdio:['pipe','inherit','inherit']});
  for(let i=0;i<n;i++){await p.evaluate(t=>render(t),i/fps);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));}
 await b.close();})();

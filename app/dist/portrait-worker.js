// Local portrait styling; landmarks locate edits, never infer personality.
function regionMask(w,h,points,polygons,blur=0){
 const c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.filter=`blur(${blur}px)`;
 for(const ids of polygons){ctx.beginPath();ids.forEach((id,i)=>{const p=points[id];if(i)ctx.lineTo(p.x*w,p.y*h);else ctx.moveTo(p.x*w,p.y*h)});ctx.closePath();ctx.fill()}
 return ctx.getImageData(0,0,w,h).data;
}
self.portraitWarp=function(data,w,h,points,mode,intensity,geometryOnly=false,adjustments){
 const presets={wealth:{tone:18,warmth:25,browDensity:18,browTilt:8,smile:24,lipVolume:8,noseWidth:0},love:{tone:22,warmth:12,browDensity:8,browTilt:-12,smile:40,lipVolume:22,noseWidth:0},pro:{tone:10,warmth:-8,browDensity:32,browTilt:18,smile:15,lipVolume:0,noseWidth:0}};
 const settings=adjustments||presets[mode],value=k=>Math.max(-100,Math.min(100,Number(settings[k])||0))/100;
 const out=new Uint8ClampedArray(data.length),eye=Math.hypot((points[33].x-points[263].x)*w,(points[33].y-points[263].y)*h);
 const axis={x:(points[263].x-points[33].x)*w/eye,y:(points[263].y-points[33].y)*h/eye},up={x:axis.y,y:-axis.x};
 const amount=Math.max(0,Math.min(2,Number(intensity)||0)),regions=[];
 const add=(idx,radius,horizontal,vertical)=>{const p=points[idx];regions.push({x:p.x*w,y:p.y*h,r:eye*radius,dx:eye*(axis.x*horizontal+up.x*vertical)*amount,dy:eye*(axis.y*horizontal+up.y*vertical)*amount})};
 add(61,.21,0,value('smile')*.065);add(291,.21,0,value('smile')*.065);
 add(105,.16,0,value('browArch')*.035);add(334,.16,0,value('browArch')*.035);
 add(70,.19,0,value('browTilt')*.045);add(300,.19,0,value('browTilt')*.045);
 add(0,.16,0,value('lipVolume')*.025);add(17,.16,0,-value('lipVolume')*.025);
 add(98,.13,-value('noseWidth')*.035,0);add(327,.13,value('noseWidth')*.035,0);
 const brows=[[70,63,105,66,107,55,65,52,53,46],[336,296,334,293,300,276,283,282,295,285]];
 const exclusions=[...brows,[33,160,158,133,153,144],[362,385,387,263,373,380],[61,40,37,0,267,270,291,321,314,17,84,91]];
 const face=geometryOnly?null:regionMask(w,h,points,[[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]],eye*.025);
 const exclude=geometryOnly?null:regionMask(w,h,points,exclusions,eye*.014),brow=geometryOnly?null:regionMask(w,h,points,brows,eye*(.009+Math.max(0,value('browSoftness'))*.022));
 const lip=geometryOnly?null:regionMask(w,h,points,[[61,40,37,0,267,270,291,321,314,17,84,91]],eye*.006);
 const mouth=geometryOnly?null:regionMask(w,h,points,[[78,81,13,311,308,402,14,87]],eye*.003);
 let soft=null;if(!geometryOnly&&value('smooth')>0){const input=new OffscreenCanvas(w,h),ic=input.getContext('2d');ic.putImageData(new ImageData(new Uint8ClampedArray(data),w,h),0,0);const blur=new OffscreenCanvas(w,h),bc=blur.getContext('2d');bc.filter='blur('+Math.max(1,w*.002)+'px)';bc.drawImage(input,0,0);soft=bc.getImageData(0,0,w,h).data}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let dx=0,dy=0;for(const r of regions){const d=((x-r.x)**2+(y-r.y)**2)/(r.r*r.r);if(d<1){const weight=(1-d)**3;dx+=r.dx*weight;dy+=r.dy*weight}}
  const sx=Math.max(0,Math.min(w-1,x-dx)),sy=Math.max(0,Math.min(h-1,y-dy));
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),fx=sx-x0,fy=sy-y0,idx=(y*w+x)*4,source=(y0*w+x0)*4;
  const skin=face?face[source+3]/255*(1-exclude[source+3]/255):0,browWeight=brow?brow[source+3]/255:0;
  for(let c=0;c<4;c++){
   const a=data[source+c],b=data[(y0*w+x1)*4+c],cc=data[(y1*w+x0)*4+c],d=data[(y1*w+x1)*4+c];let v=(a*(1-fx)+b*fx)*(1-fy)+(cc*(1-fx)+d*fx)*fy;
   if(c<3&&!geometryOnly){
    const lum=data[source]*.2126+data[source+1]*.7152+data[source+2]*.0722;
    if(soft){const delta=soft[source+c]-v;v+=delta*skin*Math.max(0,value('smooth'))*amount*.65*Math.exp(-Math.abs(delta)/24)}
    const red=Math.max(0,data[source]-(data[source+1]+data[source+2])/2-18);
    v+=skin*amount*(value('tone')*30+value('warmth')*[15,3,-13][c]+value('light')*25+value('shadows')*32*(1-lum/255));
    v-=skin*amount*Math.max(0,value('redness'))*red*[.35,-.07,-.04][c];
    const density=value('browDensity')*amount*browWeight;v=density>=0?v*(1-density*.36):v+(255-v)*(-density)*.25;
    v+=browWeight*amount*value('browColor')*[24,10,-8][c];
    const lipWeight=lip[source+3]/255*(1-mouth[source+3]/255),tint=Math.abs(value('lipColor'))*amount*.38;
    const target=value('lipColor')>=0?[177,64,85]:[187,105,75];v=v*(1-lipWeight*tint)+target[c]*lipWeight*tint;
    v+=lipWeight*amount*Math.max(0,value('lipGloss'))*Math.max(0,(lum-70)/185)*30;
    v=lum+(v-lum)*(1+value('saturation')*amount*.45);
    v=(v-128)*(1+value('contrast')*amount*.35)+128;
   }
   out[idx+c]=v;
  }
 }
 return out;
}
let segmenter;
self.replaceBackground=async function(canvas,background,options={}){
 const blur=Math.max(0,Math.min(30,Number(options.blur)||0)),t=options.transform||{x:0,y:0,scale:1},strokes=options.strokes||[];
 if((!background||background==='original')&&!blur&&!strokes.length&&t.x===0&&t.y===0&&t.scale===1)return;
 try{
  if(!segmenter){const files=await Vision.FilesetResolver.forVisionTasks('/vendor/wasm');segmenter=await Vision.ImageSegmenter.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputCategoryMask:false,outputConfidenceMasks:true})}
  const w=canvas.width,h=canvas.height,source=new OffscreenCanvas(w,h),sc=source.getContext('2d');sc.drawImage(canvas,0,0);
  const result=segmenter.segment(source),mask=new OffscreenCanvas(w,h),mc=mask.getContext('2d');
  try{const m=result.confidenceMasks?.[0];if(!m)throw Error('mask');const values=m.getAsFloat32Array(),small=new OffscreenCanvas(m.width,m.height),ctx=small.getContext('2d'),pixels=ctx.createImageData(m.width,m.height);for(let i=0;i<values.length;i++){const a=Math.max(0,Math.min(1,(values[i]-.15)/.7));pixels.data[i*4+3]=Math.round(a*a*(3-2*a)*255)}ctx.putImageData(pixels,0,0);mc.drawImage(small,0,0,w,h)}finally{result.close()}
  if(options.edge){const refined=new OffscreenCanvas(w,h),rc=refined.getContext('2d');rc.filter='blur('+Math.max(.3,Math.min(100,options.edge)/100*w*.002)+'px)';rc.drawImage(mask,0,0);mc.clearRect(0,0,w,h);mc.drawImage(refined,0,0)}
  for(const stroke of strokes){if(!stroke.points.length)continue;mc.globalCompositeOperation=stroke.restore?'source-over':'destination-out';mc.strokeStyle=mc.fillStyle='white';mc.lineWidth=stroke.radius*w*2;mc.lineCap=mc.lineJoin='round';mc.beginPath();stroke.points.forEach((p,i)=>i?mc.lineTo(p.x*w,p.y*h):mc.moveTo(p.x*w,p.y*h));mc.stroke();const first=stroke.points[0];mc.beginPath();mc.arc(first.x*w,first.y*h,stroke.radius*w,0,Math.PI*2);mc.fill()}
  const foreground=new OffscreenCanvas(w,h),fc=foreground.getContext('2d');fc.drawImage(source,0,0);fc.globalCompositeOperation='destination-in';fc.drawImage(mask,0,0);
  const bg=new OffscreenCanvas(w,h),bc=bg.getContext('2d');
  if(background==='custom'){
   if(!options.image)throw Error('배경 사진을 먼저 골라주세요.');let bitmap;try{bitmap=await createImageBitmap(await(await fetch(options.image)).blob());const scale=Math.max(w/bitmap.width,h/bitmap.height);bc.drawImage(bitmap,(w-bitmap.width*scale)/2,(h-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale)}finally{bitmap?.close()}
  }else if(background==='original')bc.drawImage(source,0,0);
  else if(background!=='transparent'){
   if(background==='studio'){const gradient=bc.createRadialGradient(w*.5,h*.3,0,w*.5,h*.3,h);gradient.addColorStop(0,'#f1f3f7');gradient.addColorStop(1,'#a9b5c8');bc.fillStyle=gradient}else bc.fillStyle=({white:'#fff',ivory:'#eee3d2',gray:'#c9c9cb',lavender:'#ded6ee',rose:'#f4dfe5'})[background]||'#fff';bc.fillRect(0,0,w,h);
  }
  if(options.match&&background!=='original'&&background!=='transparent'){
   const tiny=new OffscreenCanvas(1,1),tc=tiny.getContext('2d');tc.drawImage(bg,0,0,1,1);const avg=tc.getImageData(0,0,1,1).data;fc.globalCompositeOperation='source-atop';fc.fillStyle='rgba('+avg[0]+','+avg[1]+','+avg[2]+','+Math.max(0,Math.min(.15,options.match/100*.15))+')';fc.fillRect(0,0,w,h);
  }
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
  if(background!=='transparent'){ctx.save();ctx.filter=blur?`blur(${blur*w/900}px)`:'none';const pad=blur?w*.05:0;ctx.drawImage(bg,-pad,-pad,w+pad*2,h+pad*2);ctx.restore()}
  const scale=Math.max(.5,Math.min(1.5,t.scale)),x=(w-w*scale)/2+Math.max(-.4,Math.min(.4,t.x))*w,y=(h-h*scale)/2+Math.max(-.4,Math.min(.4,t.y))*h;
  ctx.save();if(options.shadow&&background!=='transparent'&&background!=='original'){ctx.shadowColor='rgba(20,16,30,'+Math.min(.45,options.shadow/100*.45)+')';ctx.shadowBlur=w*.035;ctx.shadowOffsetX=w*.015;ctx.shadowOffsetY=w*.025}ctx.drawImage(foreground,x,y,w*scale,h*scale);ctx.restore();
 }catch(e){throw Error(e?.message==='배경 사진을 먼저 골라주세요.'?e.message:'배경을 분리하지 못했어요. 원래 배경으로 바꾸거나 다시 시도해 주세요.')}
};

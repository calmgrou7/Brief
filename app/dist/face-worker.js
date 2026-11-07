/* Local-only image processing worker. Never sends photographs or landmarks over a network. */
importScripts('/vendor/vision_bundle.js','/portrait-worker.js');
let detector;
async function getDetector(){
 if(!detector){const files=await Vision.FilesetResolver.forVisionTasks('/vendor/wasm');detector=await Vision.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/face_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',numFaces:2,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,outputFaceBlendshapes:true});}
 return detector;
}
function validate(faces,blend){
 if(!faces.length)throw Error('얼굴이 잘 보이는 사진으로 다시 골라주세요.');
 if(faces.length!==1)throw Error('한 명만 나온 사진으로 다시 골라주세요.');
 const p=faces[0], eye=Math.hypot(p[33].x-p[263].x,p[33].y-p[263].y);
 if(eye<.10)throw Error('얼굴이 너무 작아요. 얼굴이 더 크게 나온 사진을 골라주세요.');
 const roll=Math.abs(p[33].y-p[263].y)/eye, nose=p[1].x, mid=(p[33].x+p[263].x)/2;
 if(roll>.24||Math.abs(nose-mid)>eye*.24)throw Error('고개를 기울이지 않은 정면 사진으로 다시 골라주세요.');
 if([10,152,234,454].some(i=>p[i].x<.015||p[i].x>.985||p[i].y<.015||p[i].y>.985))throw Error('얼굴 전체가 보이도록 자르기 범위를 넓혀주세요.');
 const c=blend?.[0]?.categories||[];
 if(c.some(x=>['eyeBlinkLeft','eyeBlinkRight','jawOpen'].includes(x.categoryName)&&x.score>.65))throw Error('눈을 뜨고 입을 편안히 다문 사진을 골라주세요.');
 return p.map(({x,y,z})=>({x,y,z}));
}
async function handle(m){
 try{
  if(m.type==='detect'){const model=await getDetector();let result;try{result=model.detect(m.bitmap)}finally{m.bitmap.close()}const points=validate(result.faceLandmarks,result.faceBlendshapes);self.postMessage({id:m.id,points});}
  if(m.type==='render'){const pixels=self.portraitWarp(new Uint8ClampedArray(m.pixels),m.width,m.height,m.points,m.mode,m.intensity,m.geometryOnly,m.adjustments);const canvas=new OffscreenCanvas(m.width,m.height);canvas.getContext('2d').putImageData(new ImageData(pixels,m.width,m.height),0,0);await self.replaceBackground(canvas,m.background,m.backgroundOptions);const blob=await canvas.convertToBlob({type:'image/png'});self.postMessage({id:m.id,blob});}
 }catch(e){if(m.bitmap)try{m.bitmap.close()}catch{};self.postMessage({id:m.id,error:e instanceof Error&&/[가-힣]/.test(e.message)?e.message:(m.type==='detect'?'사진 처리 도구를 불러오지 못했어요. 다시 시도하거나 다른 사진을 골라주세요.':'사진 보정을 완료하지 못했어요. 다시 시도해 주세요.')})}
};


let taskQueue=Promise.resolve();
self.onmessage=({data})=>{taskQueue=taskQueue.then(()=>handle(data)).catch(()=>{})};

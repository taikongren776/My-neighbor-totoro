import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed = 42;
const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const range = (a, b) => a + rand() * (b - a);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch { $('loading').innerHTML = '<p>这片森林需要 WebGL 支持</p><small>请开启浏览器硬件加速后重新打开。</small>'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
$('scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#183d3c');
scene.fog = new THREE.FogExp2('#183d3c', .038);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .045;
controls.minDistance = 6; controls.maxDistance = 26; controls.maxPolarAngle = Math.PI * .47;
controls.minPolarAngle = .4; controls.enablePan = false; controls.rotateSpeed = .45;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .26, .65, .82);
composer.addPass(bloom); composer.addPass(new OutputPass());
const hemi = new THREE.HemisphereLight('#a6dcd3', '#23362b', 2.1); scene.add(hemi);
const moon = new THREE.DirectionalLight('#b4dfdf', 3.1);
moon.position.set(-4, 12, 7); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -13, right: 13, top: 14, bottom: -13 });
moon.shadow.bias = -.0005; moon.shadow.normalBias = .035; scene.add(moon);
const rim = new THREE.DirectionalLight('#78a994', 2.5); rim.position.set(3, 7, -8); scene.add(rim);
const warm = new THREE.PointLight('#ffd294', 33, 13, 2); warm.position.set(5.8, 4.3, 1.5); scene.add(warm);
const material = (color, roughness = .85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const gray = material('#778a84'); const cream = material('#e1dbb5'); const dark = material('#162725');
const sphere = new THREE.SphereGeometry(1, 40, 28);
function ellipsoid(parent, mat, position, scale) { const m = new THREE.Mesh(sphere, mat); m.position.set(...position); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function rod(parent, a, b, radius, mat, endRadius = radius) { const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b); const d = bv.clone().sub(av); const m = new THREE.Mesh(new THREE.CylinderGeometry(endRadius, radius, d.length(), 9), mat); m.position.copy(av.add(bv).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; parent.add(m); return m; }
function curve(parent, points, radius, mat) { const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); const m = new THREE.Mesh(new THREE.TubeGeometry(path, 20, radius, 7, false), mat); parent.add(m); return m; }
function canvasTexture(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const groundTex = canvasTexture(512, 512, (c,w,h) => { c.fillStyle='#243e36'; c.fillRect(0,0,w,h); for(let i=0;i<24000;i++){const v=Math.floor(range(30,75));c.fillStyle=`rgba(${v},${v+15},${v+7},.24)`;c.fillRect(rand()*w,rand()*h,range(1,5),range(1,3));} });
groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.repeat.set(12,12);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(150,150),material('#728176',.47,{map:groundTex})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true;scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(75,7),material('#2b4744',.22,{metalness:.25}));road.rotation.x=-Math.PI/2;road.position.set(0,.012,5.5);road.receiveShadow=true;scene.add(road);
const mud = material('#3e5141');
for(let i=0;i<75;i++){const x=range(-20,20);const z=range(-7,1.3);if(Math.abs(x-1)<4&&z>-1)continue;ellipsoid(scene,mud,[x,range(-.2,-.05),z],[range(.3,1.3),range(.13,.4),range(.3,.9)]);}
const puddleMat = material('#73948a',.08,{metalness:.65,transparent:true,opacity:.5});
for(let i=0;i<35;i++){const p = new THREE.Mesh(new THREE.CircleGeometry(range(.15,1.3),36),puddleMat);p.rotation.x=-Math.PI/2;p.scale.y=range(.2,.55);p.position.set(range(-15,15),.025,range(1.5,10));scene.add(p);}
// A gentle, round silhouette built entirely from geometry.
const totoro = new THREE.Group();totoro.position.set(1.3,.08,.15);scene.add(totoro);
ellipsoid(totoro,gray,[0,2.15,0],[1.47,1.95,1.05]);
ellipsoid(totoro,gray,[0,3.45,.01],[1.15,1.02,.89]);
ellipsoid(totoro,cream,[0,1.98,.79],[1.16,1.46,.4]);
for(const side of [-1,1]){
 const ear=ellipsoid(totoro,gray,[side*.69,4.56,-.04],[.235,.72,.25]);ear.rotation.z=side*-.12;
 ellipsoid(totoro,material('#576e66'),[side*.69,4.59,.175],[.12,.48,.035]);
 const arm=ellipsoid(totoro,gray,[side*1.22,2.12,.12],[.39,1.02,.43]);arm.rotation.z=side*.22;
 ellipsoid(totoro,gray,[side*.68,.3,.35],[.56,.33,.7]);
 for(let j=0;j<3;j++)ellipsoid(totoro,material('#c5c4ab'),[side*.68+(j-1)*.15,.23,.96],[.055,.065,.14]);
 ellipsoid(totoro,material('#efefda'),[side*.49,3.66,.789],[.22,.23,.105]);
 ellipsoid(totoro,dark,[side*.465,3.66,.886],[.077,.1,.042]);
 ellipsoid(totoro,material('#fff9db'),[side*.45-.02,3.7,.922],[.025,.031,.014]);
 for(let j=0;j<3;j++)curve(totoro,[[side*.83,3.25+j*.12,.74],[side*1.18,3.24+j*.17,.77],[side*1.68,3.19+j*.23,.8]],.013,dark);
}
ellipsoid(totoro,dark,[0,3.49,.961],[.2,.125,.115]);
curve(totoro,[[-.18,3.23,.898],[0,3.2,.935],[.18,3.23,.898]],.018,dark);
for(let row=0;row<2;row++){const n=row===0?3:4;for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.46;const y=2.65-row*.42;const z=.79+.4*Math.sqrt(Math.max(.1,1-x*x/1.35-(y-1.98)**2/2.1));curve(totoro,[[x-.13,y-.08,z],[x,y+.035,z+.015],[x+.13,y-.08,z]],.048,gray);}}
ellipsoid(totoro,gray,[0,.7,-1.0],[.57,.48,.9]);
// A tiny leaf, wet with rain.
const leafMat=material('#688c4c',.48,{side:THREE.DoubleSide});
const leaf=ellipsoid(totoro,leafMat,[.1,4.28,.12],[.47,.05,.27]);leaf.rotation.z=-.2;
rod(totoro,[.1,4.28,.1],[.23,4.52,.08],.018,leafMat);
function umbrella(parent, x,y,z, radius, color){
 const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);const positions=[],normals=[],uv=[],indices=[];const seg=72,rings=12;
 for(let j=0;j<=rings;j++){const t=j/rings;for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2;const r=radius*t;const scallop=Math.cos(a*8)*.035*t**6;positions.push(Math.cos(a)*r,.62*(1-t*t)+scallop,Math.sin(a)*r);uv.push(i/seg,t);}}
 for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i;indices.push(a,a+seg+1,a+1,a+1,a+seg+1,a+seg+2);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const canopy=new THREE.Mesh(geo,material(color,.44,{side:THREE.DoubleSide,metalness:.16}));canopy.castShadow=true;canopy.receiveShadow=true;g.add(canopy);
 const rib=material('#526b61',.5);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const points=[];for(let j=0;j<=8;j++){const t=j/8;points.push([Math.cos(a)*radius*t,.635*(1-t*t)+.012,Math.sin(a)*radius*t]);}curve(g,points,.012,rib);}
 rod(g,[0,-2.8,0],[0,.8,0],.027,material('#9a9a7c',.3,{metalness:.6}));curve(g,[[0,-2.8,0],[0,-3.03,0],[.18,-3.13,0],[.3,-2.97,0]],.041,material('#544632'));
 return g;
}
const bigUmbrella=umbrella(scene,1.5,5.05,.25,2.1,'#233e36');bigUmbrella.rotation.z=-.095;
// Satsuki's yellow coat, short hair and little red boots.
const girl=new THREE.Group();girl.position.set(-1.1,.07,.9);girl.rotation.y=.17;scene.add(girl);
const yellow=material('#d0a347',.7);const skin=material('#edbf91');const hair=material('#292b25');const boot=material('#8c4936',.5);
for(const side of [-1,1]){rod(girl,[side*.16,.15,0],[side*.16,.68,0],.105,skin);ellipsoid(girl,boot,[side*.16,.16,.085],[.15,.18,.24]);}
const coat=new THREE.Mesh(new THREE.ConeGeometry(.48,1.1,32),yellow);coat.position.y=1.02;coat.scale.z=.72;coat.castShadow=true;girl.add(coat);
ellipsoid(girl,skin,[0,1.77,.02],[.32,.37,.29]);ellipsoid(girl,hair,[0,1.93,-.06],[.35,.27,.31]);
for(let j=0;j<6;j++)ellipsoid(girl,hair,[(j-2.5)*.105,1.98,.22],[.085,.16,.07]);
for(const side of [-1,1]){ellipsoid(girl,hair,[side*.29,1.78,0],[.07,.26,.22]);ellipsoid(girl,dark,[side*.115,1.78,.296],[.024,.035,.018]);}
rod(girl,[-.27,1.39,0],[-.43,.95,.14],.12,yellow);rod(girl,[.27,1.39,.04],[.44,1.25,.35],.12,yellow);ellipsoid(girl,skin,[.43,1.28,.39],[.095,.1,.09]);
for(let j=0;j<3;j++)ellipsoid(girl,material('#7f733f'),[0,1.27-j*.19,.24+j*.055],[.025,.025,.015]);
const smallUmbrella=umbrella(scene,-1.03,2.65,1.0,1.04,'#a34f38');smallUmbrella.scale.y=.78;
// The old, illuminated bus stop.
const stop=new THREE.Group();stop.position.set(4.8,0,.5);stop.rotation.y=.05;scene.add(stop);
const rust=material('#626f60',.45,{metalness:.45});rod(stop,[0,.1,0],[0,4.45,0],.065,rust);
ellipsoid(stop,material('#394f44'),[0,.12,0],[.46,.15,.36]);
const signTex=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#dcd9b8';c.fillRect(0,0,w,h);c.fillStyle='#7b443b';c.fillRect(0,0,w,112);c.fillStyle='#efdfb7';c.font='bold 40px serif';c.textAlign='center';c.fillText('七 国 山',256,75);c.fillStyle='#3b5546';c.font='bold 72px serif';c.fillText('稲荷前',256,236);c.font='25px sans-serif';c.fillText('INARI-MAE',256,294);c.fillStyle='#7b443b';c.fillRect(70,340,372,3);c.font='25px serif';c.fillText('森 と つ な が る',256,403);});
const sign=new THREE.Mesh(new THREE.CylinderGeometry(.63,.63,.11,64),material('#dddac0',.8));sign.rotation.x=Math.PI/2;sign.position.y=4.07;stop.add(sign);
const face=new THREE.Mesh(new THREE.CircleGeometry(.59,64),material('#ffffff',.8,{map:signTex}));face.position.set(0,4.07,.061);stop.add(face);
const timetable=canvasTexture(256,384,c=>{c.fillStyle='#d0c7a2';c.fillRect(0,0,256,384);c.fillStyle='#52604b';c.font='26px serif';c.textAlign='center';c.fillText('時 刻 表',128,50);for(let j=0;j<8;j++){c.fillRect(22,85+j*31,212,1);c.font='14px monospace';c.fillText(`${6+j*2} : 25    ${7+j*2} : 48`,128,108+j*31);}});
const board=new THREE.Mesh(new THREE.BoxGeometry(.59,.9,.08),material('#b6b294'));board.position.set(0,2.9,0);stop.add(board);
const times=new THREE.Mesh(new THREE.PlaneGeometry(.54,.84),material('#fff',.85,{map:timetable}));times.position.set(0,2.9,.045);stop.add(times);
rod(scene,[6.4,0,-.5],[6.4,5.9,-.5],.12,material('#384b3f'));curve(scene,[[6.4,5.5,-.5],[6.35,5.9,-.5],[5.8,6,-.5],[5.6,5.7,-.5]],.075,rust);
const lampMat=material('#ffdfa1',.3,{emissive:'#ffce79',emissiveIntensity:4});ellipsoid(scene,lampMat,[5.6,5.56,-.5],[.16,.2,.16]);
const hood=new THREE.Mesh(new THREE.ConeGeometry(.35,.23,24),rust);hood.position.set(5.6,5.83,-.5);scene.add(hood);
warm.position.set(5.6,5.3,-.3);
// Forest layers, trunks and broad clusters of leaves.
const bark=material('#273d31');const foliage=[material('#244d3a'),material('#305b40'),material('#386345'),material('#1e4437')];
const crownGeo=new THREE.IcosahedronGeometry(1,2);
for(let i=0;i<75;i++){
 const x=range(-29,29),z=range(-28,-4);const h=range(8,17),r=range(.22,.65);
 rod(scene,[x,0,z],[x+range(-1,1),h,z],r,bark,r*.55);
 for(let j=0;j<3;j++){const a=range(0,Math.PI*2);rod(scene,[x,h*.6,z],[x+Math.cos(a)*2.4,h*.82,z+Math.sin(a)*2.4],r*.4,bark,.06);const crown=new THREE.Mesh(crownGeo,foliage[Math.floor(rand()*4)]);crown.position.set(x+Math.cos(a)*1.4,h-j*.85,z+Math.sin(a)*1.7);crown.scale.set(range(2.1,3.8),range(1.4,2.3),range(2,3));crown.castShadow=true;scene.add(crown);}
}
// Foreground tree frames the right edge.
rod(scene,[9,0,2],[9.9,14,1],.67,bark,.4);
for(let i=0;i<8;i++){const m=new THREE.Mesh(crownGeo,foliage[i%4]);m.position.set(8+range(-4,4),8+range(0,4),range(-1,3));m.scale.set(3,1.5,2);scene.add(m);}
// Thousands of small, individually colored blades keep the forest floor soft.
const grassGeo=new THREE.ConeGeometry(.045,.55,3);grassGeo.translate(0,.27,0);
const grass=new THREE.InstancedMesh(grassGeo,material('#60845b',.9),6000);const dummy=new THREE.Object3D();const color=new THREE.Color();
for(let i=0;i<6000;i++){let x=range(-23,23),z=range(-12,4);if(z>-.7&&x>-2.3&&x<5.5)z=-2-range(0,8);dummy.position.set(x,.01,z);dummy.rotation.set(range(-.3,.3),rand()*6.28,range(-.3,.3));dummy.scale.setScalar(range(.45,1.8));dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);grass.setColorAt(i,color.setHSL(range(.22,.34),range(.18,.4),range(.15,.35)));}scene.add(grass);
const fernGeo=new THREE.SphereGeometry(1,7,5);const ferns=new THREE.InstancedMesh(fernGeo,material('#41784e',.65),2000);let fi=0;
for(let i=0;i<80;i++){const x=range(-15,15),z=range(-7,2);if(x>-2.5&&x<5.4&&z>-.5)continue;for(let j=0;j<5;j++){const a=j/5*Math.PI*2;for(let k=1;k<5;k++){const d=k*.16;for(const side of [-1,1]){if(fi>=2000)break;dummy.position.set(x+Math.cos(a)*d+Math.sin(a)*side*.09,.1+Math.sin(d*2)*.55,z+Math.sin(a)*d-Math.cos(a)*side*.09);dummy.scale.set(.17*(1-k*.12),.025,.075);dummy.rotation.set(0,-a+side*.55,-.3);dummy.updateMatrix();ferns.setMatrixAt(fi++,dummy.matrix);}}}}ferns.count=fi;scene.add(ferns);
// A few soot sprites hiding at the edge of the path.
for(let i=0;i<5;i++){const g=new THREE.Group();g.position.set(3.2+i*.22,.15,-.4-i*.06);scene.add(g);ellipsoid(g,dark,[0,0,0],[.13,.13,.13]);for(const s of [-1,1]){ellipsoid(g,cream,[s*.045,.03,.118],[.04,.045,.022]);ellipsoid(g,dark,[s*.042,.03,.139],[.016,.02,.01]);}}
const rainCount=2600;const rainPositions=new Float32Array(rainCount*6);const rainSpeed=new Float32Array(rainCount);
for(let i=0;i<rainCount;i++){const j=i*6;rainPositions[j]=range(-22,22);rainPositions[j+1]=range(0,19);rainPositions[j+2]=range(-15,16);rainSpeed[i]=range(9,16);rainPositions[j+3]=rainPositions[j]-.045;rainPositions[j+4]=rainPositions[j+1]+range(.16,.35);rainPositions[j+5]=rainPositions[j+2];}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));rainGeo.setDrawRange(0,Math.floor(rainCount*.65)*2);
const rainMaterial=new THREE.LineBasicMaterial({color:'#baded6',transparent:true,opacity:.28,depthWrite:false});const rainLines=new THREE.LineSegments(rainGeo,rainMaterial);rainLines.frustumCulled=false;scene.add(rainLines);
const rippleMat=new THREE.MeshBasicMaterial({color:'#a8cdc0',transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});const ripples=[];
for(let i=0;i<45;i++){const m=new THREE.Mesh(new THREE.RingGeometry(.93,1,32),rippleMat.clone());m.rotation.x=-Math.PI/2;m.position.set(range(-9,10),.035,range(1.4,8));scene.add(m);ripples.push({mesh:m,phase:rand()});}
const glowTex=canvasTexture(64,64,(c)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff9cb');g.addColorStop(.12,'#dbea9a');g.addColorStop(.4,'#a7d86b70');g.addColorStop(1,'#87ba5400');c.fillStyle=g;c.fillRect(0,0,64,64);});
const flies=[];for(let i=0;i<65;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:'#d8ef9a',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));const base=new THREE.Vector3(range(-10,10),range(.3,4),range(-6,3));m.position.copy(base);m.scale.setScalar(range(.06,.15));scene.add(m);flies.push({mesh:m,base,phase:range(0,6.28)});}
const homePos=new THREE.Vector3(8.5,5.5,16.5);const homeTarget=new THREE.Vector3(-1.0,2.6,0);
const shotPositions=[new THREE.Vector3(7,4.8,13.7),new THREE.Vector3(-7.4,4.4,12.4),new THREE.Vector3(3.6,3.8,8.8)];
const shotTargets=[new THREE.Vector3(1.2,2.65,0),new THREE.Vector3(.8,2.8,0),new THREE.Vector3(.8,2.6,.45)];
let mode='home',shot=0,elapsed=0,shotTime=0,rainLevel=.65,transition=true;
const desiredPos=homePos.clone(),desiredTarget=homeTarget.clone();
function responsiveHome(){homePos.set(innerWidth<800?10:8.5,5.5,innerWidth<800?21:16.5);homeTarget.set(innerWidth<800?-.9:-1,2.6,0);}
responsiveHome();camera.position.copy(homePos);controls.target.copy(homeTarget);controls.update();
const names=['雨夜 · 初遇','森林 · 低语','微光 · 陪伴'];const labels=['01 / THE ENCOUNTER','02 / FOREST WHISPERS','03 / A LITTLE MAGIC'];
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function selectShot(index,announce=true){shot=index;shotTime=0;transition=true;mode='shot';document.body.classList.add('cinematic');$('view-label').textContent='返回';$('view').setAttribute('aria-label','返回初始视角');document.querySelectorAll('.chapter').forEach((el,i)=>{el.classList.toggle('selected',i===index);el.setAttribute('aria-pressed',String(i===index));});$('shot-label').textContent=labels[index];if(announce)notify(names[index]+' · 拖动可自由探索');}
function home(){mode='home';shot=0;transition=true;document.body.classList.remove('cinematic');$('view-label').textContent='自由';$('view').setAttribute('aria-label','切换自由视角');$('shot-label').textContent='A MOMENT IN THE RAIN';$('cinema-label').textContent='开启电影之旅';document.querySelectorAll('.chapter').forEach((el,i)=>{el.classList.toggle('selected',i===0);el.setAttribute('aria-pressed',String(i===0));});}
$('cinema').onclick=()=>{selectShot(0,false);mode='cinema';notify('电影之旅已开启 · 三个镜头，慢慢相遇');};
$('world').onclick=home;
$('view').onclick=()=>{if(mode!=='home'){home();notify('回到初遇的那一刻');}else{selectShot(0,false);desiredPos.copy(shotPositions[0]);desiredTarget.copy(shotTargets[0]);mode='free';notify('自由视角 · 拖动旋转，滚轮缩放');}};
document.querySelectorAll('.chapter').forEach(el=>el.onclick=()=>selectShot(Number(el.dataset.shot)));
controls.addEventListener('start',()=>{mode='free';transition=false;document.body.classList.add('cinematic');$('shot-label').textContent='YOUR OWN LITTLE MOMENT';$('view-label').textContent='返回';$('view').setAttribute('aria-label','返回初始视角');});
$('settings').onclick=()=>{const open=$('settings-panel').hidden;$('settings-panel').hidden=!open;$('settings').setAttribute('aria-expanded',String(open));};
$('close-settings').onclick=()=>{$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');};
$('story').onclick=()=>$('notes').showModal();$('close-notes').onclick=()=>$('notes').close();$('notes').addEventListener('click',e=>{if(e.target===$('notes')){const r=$('notes').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('notes').close();}});
$('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{notify('当前窗口不支持全屏，可在浏览器中打开体验');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('notes').open)home();});
let audioCtx,noiseGain,soundOn=false;
function updateRain(){rainLevel=Number($('rain').value)/100;$('rain-value').textContent=`${$('rain').value}%`;rainGeo.setDrawRange(0,Math.floor(rainCount*rainLevel)*2);if(noiseGain)noiseGain.gain.setTargetAtTime(soundOn?rainLevel*.23:0,audioCtx.currentTime,.4);}
function updateLight(){$('light-value').textContent=`${$('light').value}%`;renderer.toneMappingExposure=.55+Number($('light').value)*.0122;}
$('rain').oninput=updateRain;$('light').oninput=updateLight;$('reset').onclick=()=>{$('rain').value=65;$('light').value=55;updateRain();updateLight();notify('森林恢复了最初的模样');};
$('sound').onclick=async()=>{try{if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();const b=audioCtx.createBuffer(2,audioCtx.sampleRate*4,audioCtx.sampleRate);for(let c=0;c<2;c++){let prev=0;const data=b.getChannelData(c);for(let i=0;i<data.length;i++){prev=(prev+Math.random()*.12-.06)/1.025;data[i]=prev*3.6;}}const source=audioCtx.createBufferSource();source.buffer=b;source.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2800;noiseGain=audioCtx.createGain();noiseGain.gain.value=0;source.connect(filter).connect(noiseGain).connect(audioCtx.destination);source.start();}await audioCtx.resume();soundOn=!soundOn;$('sound').classList.toggle('on',soundOn);$('sound').setAttribute('aria-label',soundOn?'关闭雨声':'开启雨声');$('sound').setAttribute('aria-pressed',String(soundOn));updateRain();notify(soundOn?'雨落在伞上，也落在心里。':'雨声已关闭');}catch{notify('音频暂时无法播放，请重试');}};
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);responsiveHome();if(mode==='home')transition=true;});
let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;elapsed+=dt;
 if(!reducedMotion){totoro.scale.y=1+Math.sin(elapsed*1.25)*.008;bigUmbrella.rotation.z=-.095+Math.sin(elapsed*.7)*.012;}
 if(mode==='home'){desiredPos.copy(homePos);if(!reducedMotion)desiredPos.x+=Math.sin(elapsed*.15)*.18;desiredTarget.copy(homeTarget);transition=true;}
 if(mode==='shot'||mode==='cinema'){shotTime+=dt;if(mode==='cinema'&&shotTime>16){selectShot((shot+1)%3,false);mode='cinema';}desiredPos.copy(shotPositions[shot]);desiredTarget.copy(shotTargets[shot]);if(!reducedMotion){const a=shotTime*.035;desiredPos.x+=Math.sin(a)*1.5;desiredPos.z-=Math.sin(shotTime*.07)*.9;}transition=true;}
 if(transition){const factor=1-Math.exp(-dt*1.3);camera.position.lerp(desiredPos,factor);controls.target.lerp(desiredTarget,factor);}controls.update();
 if(!reducedMotion){const count=Math.floor(rainCount*rainLevel);for(let i=0;i<count;i++){const j=i*6,fall=rainSpeed[i]*dt;rainPositions[j+1]-=fall;rainPositions[j+4]-=fall;rainPositions[j]-=dt*.5;rainPositions[j+3]-=dt*.5;if(rainPositions[j+1]<0){rainPositions[j+1]+=19;rainPositions[j+4]+=19;}}rainGeo.attributes.position.needsUpdate=true;
 for(const r of ripples){const t=(elapsed*.7+r.phase)%1;r.mesh.visible=rainLevel>.01;r.mesh.scale.setScalar(.08+t*.36);r.mesh.material.opacity=(1-t)*.2*rainLevel;}
 for(const f of flies){f.mesh.position.set(f.base.x+Math.sin(elapsed*.4+f.phase)*.25,f.base.y+Math.sin(elapsed*.6+f.phase)*.16,f.base.z);f.mesh.material.opacity=.35+.65*Math.sin(elapsed*.8+f.phase)**2;}}
 composer.render();
}
renderer.compile(scene,camera);requestAnimationFrame(animate);setTimeout(()=>$('loading').classList.add('done'),600);
// Small read-only diagnostics for checking this procedural scene.
window.__forest={get state(){return{mode,shot,rainLevel,soundOn,objects:scene.children.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};

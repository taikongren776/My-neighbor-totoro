import * as THREE from 'three';

// Sculpted radial profiles and swept surfaces keep the characters continuous.
// All assets are generated locally; no external models or texture requests.
const sphere = new THREE.SphereGeometry(1, 40, 28);
const detailSphere = new THREE.SphereGeometry(1, 18, 12);
const UP = new THREE.Vector3(0, 1, 0);
let seed = 19788;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .88, ...extra});
function mesh(parent, geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function oval(parent, material, position, scale) {
  const geometry = Math.max(...scale) <= .12 ? detailSphere : sphere;
  const m = mesh(parent, geometry, material); m.position.set(...position); m.scale.set(...scale); return m;
}
function line(parent, points, radius, material) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 28, radius, 8, false), material);
}
function rod(parent, start, end, radius, material) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), delta = b.clone().sub(a);
  const m = mesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), 12), material);
  m.position.copy(a.add(b).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(UP, delta.normalize()); return m;
}
function texture(width, height, draw, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const t = new THREE.CanvasTexture(canvas); if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
const furBump = texture(512,512,(ctx,w,h) => {
  ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h);
  for(let i=0;i<28000;i++){const v=100+Math.floor(random()*55);ctx.strokeStyle=`rgb(${v},${v},${v})`;ctx.lineWidth=.5+random()*.6;
    const x=random()*w,y=random()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*2,y+2+random()*5);ctx.stroke();}
},false);
const fur = mat('#7a827a',{bumpMap:furBump,bumpScale:.022});
const claw = mat('#b6b49b',{roughness:.6});
const ink = mat('#252c28');
const eyeWhite = mat('#e9e5ce',{roughness:.58});
const eyeBlack = mat('#0c1815',{roughness:.28});
const highlight = mat('#f6f1d9',{roughness:.2});

// radius, height — wider haunches, a soft shoulder and an uninterrupted head.
const profile = new THREE.CatmullRomCurve3([
  [0,.22],[.64,.25],[1.15,.43],[1.47,.86],[1.62,1.48],[1.64,1.96],
  [1.51,2.6],[1.28,3.23],[1.12,3.77],[.88,4.13],[.46,4.37],[0,4.43]
].map(([r,y])=>new THREE.Vector3(r,y,0)),false,'centripetal');
const bodyProfile = profile.getPoints(112);
function radiusAt(y) {
  for(let i=1;i<bodyProfile.length;i++) if(bodyProfile[i].y>=y){const a=bodyProfile[i-1],b=bodyProfile[i];return THREE.MathUtils.lerp(a.x,b.x,(y-a.y)/(b.y-a.y));}
  return .001;
}
function front(x,y,offset=0){const r=radiusAt(y);return Math.sqrt(Math.max(0,r*r-x*x))*.76+offset;}
function bodyMap(){
  return texture(2048,1024,(ctx,w,h)=>{
    const image=ctx.createImageData(w,h),data=image.data;
    for(let py=0;py<h;py++){
      const y=(1-py/(h-1))*4.43,r=radiusAt(y);
      for(let px=0;px<w;px++){
        const a=px/(w-1)*Math.PI*2-Math.PI,x=Math.sin(a)*r;
        const e=(x/1.285)**2+((y-1.94)/1.43)**2;
        const irregular=.005*Math.sin(x*71+y*47)+.004*Math.sin(y*93-x*29);
        const belly=Math.cos(a)>0?1-THREE.MathUtils.smoothstep(e+irregular,.97,1.025):0;
        const grain=(random()-.5)*5+Math.sin(px*.037+py*.021)*1.3;
        const gray=[117,128,121],cream=[220,211,172],k=(py*w+px)*4;
        for(let c=0;c<3;c++)data[k+c]=gray[c]*(1-belly)+cream[c]*belly+grain;
        data[k+3]=255;
      }
    }
    ctx.putImageData(image,0,0);
    const uv=(x,y)=>[(Math.asin(x/radiusAt(y))+Math.PI)/(2*Math.PI)*w,(1-y/4.43)*h];
    ctx.fillStyle='#68756d';
    for(let row=0;row<2;row++){
      const count=row===0?3:4;
      for(let j=0;j<count;j++){
        const x=(j-(count-1)/2)*.48,y=2.88-row*.39;
        const points=[[-.16,-.08],[-.065,.075],[0,.115],[.065,.075],[.16,-.08],[.07,-.035],[0,.035],[-.07,-.035]];
        ctx.beginPath();points.forEach(([dx,dy],i)=>{const p=uv(x+dx,y+dy);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fill();
      }
    }
    // Fine directional strokes soften the cream-to-grey edge and the painted surface.
    for(let i=0;i<15000;i++){
      const x=random()*w,y=random()*h;ctx.strokeStyle=random()>.5?'rgba(255,246,219,.065)':'rgba(38,52,43,.05)';
      ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*2,y+2+random()*4);ctx.stroke();
    }
  });
}
function swept(parent, points, radii, material, flatten=1) {
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const segments=40,sides=24,frames=path.computeFrenetFrames(segments,false),vertices=[],indices=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=path.getPointAt(t),ri=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(ri)),r=THREE.MathUtils.lerp(radii[j],radii[j+1],ri-j);
    for(let k=0;k<=sides;k++){
      const a=k/sides*Math.PI*2,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*flatten);
      vertices.push(v.x,v.y,v.z);
      if(i<segments&&k<sides){const n=i*(sides+1)+k;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,material);
}
function pointedClaw(parent, position, direction, size=.15) {
  const m=mesh(parent,new THREE.ConeGeometry(size*.26,size,14),claw);
  m.position.set(...position);m.quaternion.setFromUnitVectors(UP,new THREE.Vector3(...direction).normalize());return m;
}

function makeUmbrella(parent,{position,radius,height,shaftLength,color,tilt=0}) {
  const g=new THREE.Group();g.position.set(...position);g.rotation.z=tilt;g.userData.restTilt=tilt;parent.add(g);
  const segments=128,rings=20,positions=[],colors=[],indices=[];
  const c=new THREE.Color();
  const surface=(t,a)=>{
    const panel=(1-Math.cos(a*8))*.5;
    const r=radius*t*(1-.035*panel*t**8);
    return [Math.cos(a)*r,height*(1-t**1.65)-.055*panel*t**5,Math.sin(a)*r];
  };
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
    const t=j/rings,a=i/segments*Math.PI*2;positions.push(...surface(t,a));
    c.set(color).multiplyScalar(1+.045*Math.cos(a*8));colors.push(c.r,c.g,c.b);
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const n=j*(segments+1)+i;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  mesh(g,geometry,mat('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.62,metalness:.035}));
  const seam=mat(new THREE.Color(color).multiplyScalar(1.25));const metal=mat('#758078',{metalness:.7,roughness:.36});
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2,points=[];
    for(let j=0;j<=12;j++){const p=surface(j/12,a);p[1]+=.006;points.push(p);}line(g,points,.007,seam);
    const ribPoints=points.map(p=>[p[0],p[1]-.023,p[2]]);line(g,ribPoints,.008,metal);
    const tip=surface(1,a);oval(g,metal,tip,[.026,.017,.026]);
    const start=surface(.44,a);rod(g,[0,-.35,0],[start[0],start[1]-.04,start[2]],.009,metal);
  }
  const rim=[];for(let i=0;i<=128;i++)rim.push(surface(1,i/128*Math.PI*2));line(g,rim,.01,seam);
  rod(g,[0,-shaftLength,0],[0,height+.12,0],.022,metal);
  oval(g,metal,[0,height+.08,0],[.035,.09,.035]);
  const handle=mat('#70543b',{roughness:.65});line(g,[[0,-shaftLength+.12,0],[0,-shaftLength-.06,0],[.07,-shaftLength-.13,0],[.16,-shaftLength-.1,0],[.18,-shaftLength,0]],.034,handle);
  const water=mat('#a2b8b2',{roughness:.15,metalness:.1,transparent:true,opacity:.58});
  for(let i=0;i<30;i++){const a=random()*Math.PI*2,t=.2+random()*.75,p=surface(t,a);p[1]+=.008;oval(g,water,p,[.012,.008,.025]);}
  return g;
}

export function createCharacters(scene) {
  const totoro=new THREE.Group();totoro.name='Totoro — continuous sculpt';totoro.position.set(1.3,.035,.15);scene.add(totoro);
  const bodyGeometry=new THREE.LatheGeometry(bodyProfile.map(p=>new THREE.Vector2(p.x,p.y)),128,-Math.PI);
  const positions=bodyGeometry.attributes.position,uv=bodyGeometry.attributes.uv;
  for(let i=0;i<positions.count;i++){positions.setZ(i,positions.getZ(i)*.76);uv.setY(i,positions.getY(i)/4.43);}
  bodyGeometry.computeVertexNormals();
  const bodyMaterial=mat('#ffffff',{map:bodyMap(),bumpMap:furBump,bumpScale:.016});
  mesh(totoro,bodyGeometry,bodyMaterial);
  for(const side of [-1,1]){
    // Leaf-shaped ears, with a narrow base and a gently asymmetric pointed tip.
    const earPoints=[[0,0],[.12,.035],[.2,.28],[.185,.58],[.11,.87],[.02,1.12],[0,1.15]].map(([r,y])=>new THREE.Vector3(r,y,0));
    const earProfile=new THREE.CatmullRomCurve3(earPoints).getPoints(38);
    const earGeo=new THREE.LatheGeometry(earProfile.map(p=>new THREE.Vector2(p.x,p.y)),40);
    const ep=earGeo.attributes.position;
    for(let i=0;i<ep.count;i++){const y=ep.getY(i);ep.setX(i,ep.getX(i)+side*.17*y*y);ep.setZ(i,ep.getZ(i)*.63-.07*y*y);}earGeo.computeVertexNormals();
    const ear=mesh(totoro,earGeo,fur);ear.position.set(side*.63,4.14,-.025);ear.rotation.z=side*-.045;
    // Feet sink into the body; the pointed claws emerge from the toes.
    oval(totoro,fur,[side*.77,.24,.27],[.5,.27,.62]);
    for(let j=0;j<3;j++)pointedClaw(totoro,[side*.77+(j-1)*.15,.15,.83],[0,-.18,1],.16);
    // Small, widely spaced eyes lie close to the facial surface.
    const x=side*.49,y=3.85,z=front(x,y);
    const eye=oval(totoro,eyeWhite,[x,y,z+.016],[.172,.182,.065]);eye.rotation.y=side*.23;
    oval(totoro,eyeBlack,[x-side*.024,y+.005,z+.076],[.061,.078,.031]);
    oval(totoro,highlight,[x-side*.024-.015,y+.031,z+.105],[.017,.022,.009]);
    for(let j=0;j<3;j++){
      const y0=3.46+j*.115;
      line(totoro,[[side*.96,y0,front(side*.96,y0,.012)],[side*1.35,y0+(j-1)*.025,.67],[side*1.84,y0+(j-1)*.13,.68]],.009,ink);
    }
  }
  // A broad, low nose with a shaped muzzle and a quiet little mouth.
  const nose=oval(totoro,ink,[0,3.69,front(0,3.69,.035)],[.21,.105,.12]);nose.rotation.x=-.15;
  oval(totoro,mat('#414c43'),[-.055,3.727,front(0,3.69,.142)],[.055,.016,.006]);
  line(totoro,[[-.13,3.46,front(-.13,3.46,.013)],[0,3.445,front(0,3.445,.014)],[.13,3.46,front(.13,3.46,.013)]],.011,ink);
  // One arm hangs, the other curves forward to grip a pole outside the body.
  swept(totoro,[[-1.24,2.85,-.015],[-1.55,2.35,.08],[-1.62,1.64,.2],[-1.42,1.18,.39]],[.03,.29,.31,.26,.02],fur);
  for(let j=0;j<3;j++)pointedClaw(totoro,[-1.48+j*.09,1.18,.57],[.2,-1,.6],.12);
  swept(totoro,[[1.24,2.85,-.015],[1.57,2.44,.15],[1.61,2.08,.54],[1.22,2.25,1.02]],[.03,.29,.31,.27,.04],fur);
  oval(totoro,fur,[1.2,2.27,1.04],[.25,.23,.22]);
  for(let j=0;j<3;j++){
    line(totoro,[[1.35,2.39-j*.105,1.08],[1.2,2.39-j*.105,1.25],[1.04,2.37-j*.105,1.18]],.056,fur);
    pointedClaw(totoro,[1.015,2.36-j*.105,1.16],[-1,-.2,-.4],.1);
  }
  oval(totoro,fur,[0,.73,-1.06],[.52,.43,.82]);
  const bigUmbrella=makeUmbrella(totoro,{position:[1.16,5.49,1.12],radius:2.22,height:.67,shaftLength:3.28,color:'#283d37'});

  // Satsuki: shaped face, separate hair silhouette, tailored coat and rounded sleeves.
  const girl=new THREE.Group();girl.name='Satsuki — raincoat and umbrella';girl.position.set(-1.2,.025,.95);girl.rotation.y=.12;scene.add(girl);
  const yellow=mat('#d4ac54',{roughness:.72});const seam=mat('#a5823e');const lining=mat('#b99748');
  const skin=mat('#f0c69b',{roughness:.8});const hair=mat('#302d25',{roughness:.91,bumpMap:furBump,bumpScale:.007});
  const boots=mat('#9f503d',{roughness:.6});const sole=mat('#5c4232');
  for(const side of [-1,1]){
    rod(girl,[side*.155,.24,.01],[side*.155,.67,.01],.082,skin);
    const foot=oval(girl,boots,[side*.16,.14,.09],[.145,.13,.235]);foot.rotation.y=side*-.07;
    oval(girl,sole,[side*.16,.065,.1],[.15,.048,.24]);
    const shaft=mesh(girl,new THREE.CylinderGeometry(.108,.12,.26,24),boots);shaft.position.set(side*.155,.26,.01);
    const cuff=mesh(girl,new THREE.TorusGeometry(.106,.015,8,24),lining);cuff.rotation.x=Math.PI/2;cuff.position.set(side*.155,.395,.01);
  }
  const coatProfile=new THREE.CatmullRomCurve3([[0,.56],[.34,.56],[.43,.6],[.395,.77],[.31,1.06],[.29,1.39],[.235,1.56],[.115,1.63],[0,1.63]].map(([r,y])=>new THREE.Vector3(r,y,0))).getPoints(55);
  const coatGeo=new THREE.LatheGeometry(coatProfile.map(p=>new THREE.Vector2(p.x,p.y)),64);
  const cp=coatGeo.attributes.position;
  for(let i=0;i<cp.count;i++){const y=cp.getY(i),a=Math.atan2(cp.getX(i),cp.getZ(i)),fold=(Math.cos(a*9)+Math.sin(a*5))*.008*Math.max(0,1.4-y);cp.setX(i,cp.getX(i)+Math.sin(a)*fold);cp.setZ(i,(cp.getZ(i)+Math.cos(a)*fold)*.78);}
  coatGeo.computeVertexNormals();mesh(girl,coatGeo,yellow);
  rod(girl,[0,1.53,0],[0,1.8,0],.11,skin);
  // Jaw is narrower than the temples, with round cheeks.
  const faceGeo=new THREE.SphereGeometry(1,48,36),fp=faceGeo.attributes.position;
  for(let i=0;i<fp.count;i++){const y=fp.getY(i);fp.setX(i,fp.getX(i)*(y<-.2?1+(y+.2)*.2:1));}faceGeo.computeVertexNormals();
  const face=mesh(girl,faceGeo,skin);face.position.set(0,1.94,.035);face.scale.set(.315,.345,.28);
  for(const side of [-1,1]){
    oval(girl,skin,[side*.305,1.93,.015],[.052,.085,.045]);
    oval(girl,eyeWhite,[side*.112,1.965,.289],[.052,.064,.015]);
    oval(girl,eyeBlack,[side*.112+.011,1.974,.302],[.027,.043,.012]);
    oval(girl,highlight,[side*.112+.007,1.99,.313],[.008,.011,.005]);
    line(girl,[[side*.067,2.066,.292],[side*.112,2.08,.29],[side*.159,2.066,.27]],.009,hair);
    oval(girl,mat('#d59a7a'),[side*.18,1.87,.259],[.047,.02,.006]);
  }
  oval(girl,skin,[0,1.909,.308],[.034,.043,.044]);
  line(girl,[[-.04,1.818,.29],[0,1.807,.298],[.043,1.824,.285]],.007,mat('#985b48'));
  const cap=mesh(girl,new THREE.SphereGeometry(1,48,28,0,Math.PI*2,0,1.83),hair);cap.position.set(0,1.98,.003);cap.scale.set(.334,.335,.3);
  for(const side of [-1,1]){
    swept(girl,[[side*.24,2.15,.02],[side*.322,1.98,.015],[side*.325,1.78,-.015],[side*.275,1.7,-.035]],[.025,.075,.072,.008],hair,.8);
    for(let j=0;j<3;j++)swept(girl,[[side*(.19+j*.04),1.91,-.18],[side*(.22+j*.045),1.76,-.19],[side*(.25+j*.045),1.71,-.15]],[.04,.045,.002],hair);
  }
  for(let j=0;j<7;j++){
    const x=(j-3)*.075;
    swept(girl,[[x*.84,2.21,.21],[x,2.14,.272],[x+.025,2.065+(j%2)*.025,.282]],[.035,.052,.002],hair,.4);
  }
  // Folded collar panels and stitched front placket.
  const collarMat=mat('#e5c579');
  for(const side of [-1,1]){
    const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*.145,-.025);shape.lineTo(side*.18,-.18);shape.lineTo(side*.05,-.115);shape.closePath();
    const c=mesh(girl,new THREE.ShapeGeometry(shape),collarMat);c.position.set(0,1.61,.15);c.rotation.x=-.24;c.material.side=THREE.DoubleSide;
    line(girl,[[side*.21,.98,.244],[side*.21,.88,.267],[side*.3,.89,.23]],.006,seam);
  }
  line(girl,[[0,1.43,.23],[0,1.13,.247],[0,.86,.294],[0,.62,.337]],.006,seam);
  for(let i=0;i<4;i++){const y=1.4-i*.205;oval(girl,seam,[.025,y,.24+(1.4-y)*.115],[.018,.018,.009]);}
  swept(girl,[[-.21,1.47,0],[-.34,1.29,.04],[-.39,1.08,.12]],[.04,.12,.11,.09],yellow);
  oval(girl,lining,[-.39,1.09,.12],[.104,.045,.105]);oval(girl,skin,[-.39,1.013,.14],[.076,.1,.073]);
  swept(girl,[[.21,1.47,.02],[.36,1.27,.13],[.35,1.39,.4]],[.04,.125,.11,.085],yellow);
  oval(girl,lining,[.35,1.39,.4],[.09,.052,.083]);oval(girl,skin,[.35,1.445,.45],[.079,.084,.075]);
  for(let i=0;i<3;i++)line(girl,[[.4,1.49-i*.035,.46],[.36,1.49-i*.035,.52],[.31,1.48-i*.035,.49]],.017,skin);
  const smallUmbrella=makeUmbrella(girl,{position:[.35,3.02,.465],radius:1.1,height:.4,shaftLength:1.6,color:'#a75b43'});
  return {totoro,girl,bigUmbrella,smallUmbrella};
}

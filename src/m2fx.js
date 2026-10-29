/* ================= ЭФФЕКТЫ ИЗ МОДЕЛЕЙ КЛИЕНТА (M2) =================
   Излучатели частиц и шлейфы из Spells\*.m2 клиента 1.12 (выгружены в assets/fx/m2fx.json).
   Симуляция повторяет клиент по разбору azeroth-survivors-re: рождение (плоскость/сфера/сплайн),
   скорость с разбросом, гравитация, сопротивление, цвет/размер/кадр по жизни частицы в три ключа,
   мерцание, вращение, хвосты; шлейфы — лента из рёбер. Кости модели анимируются по её 0-й анимации.
   Оси WoW (x вперёд, y влево, z вверх) -> локальные оси юнита (y, z, x). */
const M2={defs:null,tex:{},vis:null,live:[],mats:{}};
function m2Load(){return fetch("assets/fx/m2fx.json").then(r=>r.json()).then(j=>{M2.defs=j.models;M2.vis=j.spells;}).catch(()=>{});}
function m2Tex(name){if(!name)return null;let t=M2.tex[name];if(!t){t=new THREE.TextureLoader().load(`assets/fx/m2/${name}.webp`);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;M2.tex[name]=t;}return t;}
function m2Mat(tex,blend){const k=tex+"|"+blend;let m=M2.mats[k];if(m)return m;
  const add=blend===3||blend===4,key=blend===1;
  m=new THREE.ShaderMaterial({uniforms:{map:{value:m2Tex(tex)}},transparent:blend!==0,depthWrite:!add&&blend!==2,depthTest:true,side:THREE.DoubleSide,
    blending:add?THREE.CustomBlending:THREE.NormalBlending,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneFactor,
    vertexShader:"attribute vec4 col;varying vec4 vC;varying vec2 vU;void main(){vC=col;vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:`uniform sampler2D map;varying vec4 vC;varying vec2 vU;void main(){vec4 t=texture2D(map,vU)*vC;${key?"if(t.a<.5)discard;":""}gl_FragColor=t;}`});
  return M2.mats[k]=m;}
/* --- дорожки анимации --- */
function m2Samp(tr,t,def){if(!tr)return def;const k=tr.k;if(!k.length)return def;
  if(tr.g)t=tr.p>0?(now%tr.p):0;else if(tr.p>0&&t>tr.p)t=t%tr.p;
  if(k.length===1||t<=k[0][0])return k[0][1];const L=k[k.length-1];if(t>=L[0])return L[1];
  let i=1;while(k[i][0]<t)i++;const a=k[i-1],b=k[i];if(tr.i===0)return a[1];
  const f=(t-a[0])/((b[0]-a[0])||1);if(Array.isArray(a[1]))return a[1].map((v,j)=>v+(b[1][j]-v)*f);return a[1]+(b[1]-a[1])*f;}
const _m2q=new THREE.Quaternion(),_m2v=new THREE.Vector3(),_m2s=new THREE.Vector3(),_m2a=new THREE.Matrix4(),_m2b=new THREE.Matrix4();
/* матрицы костей в осях WoW на момент t */
/* кость-«билборд» (флаг 0x8 — к камере целиком, 0x40 — только вокруг вертикали): ось x кости смотрит на камеру,
   поворот задаётся в осях родителя, чтобы в мире получилось нужное направление */
const _m2bw=new THREE.Matrix4(),_m2br=new THREE.Matrix4(),_m2k=new THREE.Vector3(),_m2rr=new THREE.Vector3(),_m2uu=new THREE.Vector3();
function m2Billboard(W,P,fl){_m2bw.copy(W);if(P)_m2bw.multiply(P);_m2br.extractRotation(_m2bw);
  const e=camera.matrixWorld.elements;_m2k.set(e[8],e[9],e[10]);
  if(fl&0x8){_m2rr.set(e[0],e[1],e[2]);_m2uu.set(e[4],e[5],e[6]);}
  else{_m2uu.set(0,0,1).transformDirection(_m2br);_m2k.addScaledVector(_m2uu,-_m2k.dot(_m2uu));if(_m2k.lengthSq()<1e-8)_m2k.set(e[8],e[9],e[10]);_m2k.normalize();_m2rr.crossVectors(_m2uu,_m2k);}
  _m2bw.makeBasis(_m2k,_m2rr,_m2uu);_m2br.transpose().multiply(_m2bw);_m2q.setFromRotationMatrix(_m2br);}
function m2Bones(def,t,out,W){const B=def.bones;
  for(let i=0;i<B.length;i++){const b=B[i],M=out[i]||(out[i]=new THREE.Matrix4());
    const tr=m2Samp(b.t,t,null),rq=m2Samp(b.r,t,null),sc=m2Samp(b.s,t,null);
    if(rq){_m2q.set(rq[0],rq[1],rq[2],rq[3]);if(_m2q.lengthSq()>1e-8)_m2q.normalize();else _m2q.set(0,0,0,1);}else _m2q.set(0,0,0,1);
    if(W&&(b.fl&0x48))m2Billboard(W,b.par>=0&&b.par<i?out[b.par]:null,b.fl);
    _m2v.set(b.pv[0],b.pv[1],b.pv[2]);if(tr)_m2v.x+=tr[0],_m2v.y+=tr[1],_m2v.z+=tr[2];
    _m2s.set(sc?sc[0]:1,sc?sc[1]:1,sc?sc[2]:1);M.compose(_m2v,_m2q,_m2s);
    M.multiply(_m2a.makeTranslation(-b.pv[0],-b.pv[1],-b.pv[2]));
    if(b.par>=0&&b.par<i)M.premultiply(out[b.par]);}
  return out;}
/* --- случайные числа и мерцание как в клиенте --- */
function m2Rng(e){let x=e.rng;x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;e.rng=x;return x;}
const m2R01=e=>(m2Rng(e)>>>8)/16777216,m2S11=e=>m2R01(e)*2-1;
const M2_TW=(()=>{const e={rng:0xC0FFEE11};const a=[];for(let i=0;i<128;i++)a.push(m2R01(e));return a})();
const m2Twn=(sp,age,ph)=>M2_TW[((Math.min(255,Math.max(0,sp*age))|0)+ph)&127];
/* цвет/размер/кадр по жизни: два отрезка с серединой mid */
function m2Life(p,u,o){const mid=Math.min(1,Math.max(1e-3,p.mid));let k0,k1,t,seg;
  if(u<=mid){k0=0;k1=1;t=u/mid;seg=0}else{k0=1;k1=2;t=(u-mid)/Math.max(1e-3,1-mid);seg=1}
  t=Math.min(1,Math.max(0,t))*.99+.005;const A=p.col[k0],B=p.col[k1];
  o.r=A[0]+(B[0]-A[0])*t;o.g=A[1]+(B[1]-A[1])*t;o.b=A[2]+(B[2]-A[2])*t;o.a=A[3]+(B[3]-A[3])*t;o.s=p.sc[k0]+(p.sc[k1]-p.sc[k0])*t;
  const rep=p.rep[seg],ct=rep!==1&&rep?((t*rep)%1):t;
  const cell=r=>{const b=r[0],e=r[1];const base=e>=b?b:b+1,span=e>=b?e-b+1:e-b-1;return Math.floor(base+span*ct)&255};
  o.hc=cell(p.hc[seg]);o.tc=cell(p.tc[seg]);return o;}
function m2Params(p,t){return{sp:m2Samp(p.speed,t,0),sv:m2Samp(p.svar,t,0),lat:m2Samp(p.lat,t,0),lon:m2Samp(p.lon,t,0),g:m2Samp(p.grav,t,0),
  life:m2Samp(p.life,t,1),al:m2Samp(p.al,t,0),aw:m2Samp(p.aw,t,0),zs:m2Samp(p.zs,t,0)};}
function m2Bez(P,s,u){const w=[(1-u)**3,3*u*(1-u)**2,3*u*u*(1-u),u**3];return[0,1,2].map(c=>w[0]*P[s][c]+w[1]*P[s+1][c]+w[2]*P[s+2][c]+w[3]*P[s+3][c]);}
/* рождение частицы в осях излучателя (WoW): позиция и направление, затем поворот R(+Z,90°) */
function m2Emit(e,p,q){const o=p.pos;let lx,ly,lz,dx=0,dy=0,dz=0;
  if(p.shape===3&&p.spline){const P=p.spline,n=(P.length-1)/3,t=Math.min(1,Math.max(0,q.al))+m2R01(e)*(Math.min(1,Math.max(0,q.aw))-Math.min(1,Math.max(0,q.al)));
    const seg=Math.min(n-1,Math.floor(t*n)),pt=m2Bez(P,seg*3,t*n-seg);lx=pt[0];ly=pt[1];lz=pt[2];
    if(q.zs){const L=Math.hypot(lx,ly,lz-q.zs)||1;dx=lx/L;dy=ly/L;dz=(lz-q.zs)/L}
    return[o[0]-ly,o[1]+lx,o[2]+lz,-dy,dx,dz];}
  if(p.shape===2){const r=q.al+m2R01(e)*Math.max(0,q.aw-q.al),la=m2S11(e)*q.lat,lo=m2S11(e)*q.lon;
    const sx=Math.cos(la)*Math.cos(lo),sy=Math.cos(la)*Math.sin(lo),sz=Math.sin(la);lx=r*sx;ly=r*sy;lz=r*sz;
    if(q.zs){const L=Math.hypot(lx,ly,lz-q.zs)||1;dx=lx/L;dy=ly/L;dz=(lz-q.zs)/L}else if(p.fl&0x100){dz=1}else{dx=sx;dy=sy;dz=sz}}
  else{lx=m2S11(e)*.5*q.al;ly=m2S11(e)*.5*q.aw;lz=0;
    if(q.zs){const L=Math.hypot(lx,ly,lz-q.zs)||1;dx=lx/L;dy=ly/L;dz=(lz-q.zs)/L}
    else{const th=m2S11(e)*q.lat,ph=m2S11(e)*q.lon;dx=Math.sin(th)*Math.cos(ph);dy=Math.sin(th)*Math.sin(ph);dz=Math.cos(th)}}
  return[o[0]-ly,o[1]+lx,o[2]+lz,-dy,dx,dz];}
/* WoW -> локальные оси юнита */
const M2_AX=new THREE.Matrix4().set(0,1,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,1);
const _m2p=new THREE.Vector3(),_m2d=new THREE.Vector3(),_m2o={},_m2c=new THREE.Vector3(),_m2r=new THREE.Vector3(),_m2u=new THREE.Vector3(),_m2t=new THREE.Vector3();
/* запуск эффекта: anchor(o) записывает позицию в o.pos и поворот в o.yaw; once — разовый (каст/попадание) */
function m2Play(name,anchor,o){if(!M2.defs)return null;const def=M2.defs[name];if(!def)return null;o=o||{};
  const fx={def,anchor,t:0,once:!!o.once,stopped:false,dead:false,scale:o.scale||1,world:new THREE.Matrix4(),bones:[],pos:new THREE.Vector3(),yaw:0,
    em:def.parts.map((p,i)=>({p,ps:[],acc:0,gate:false,rng:(Math.random()*4294967295>>>0)||1,mesh:null})),
    rb:def.ribs.map(r=>({r,edges:[],acc:0,mesh:null})),maxT:o.once?Math.min(3,Math.max(.4,def.dur||1)):Infinity};
  M2.live.push(fx);return fx;}
function m2Stop(fx){if(fx)fx.stopped=true;}
function m2Geo(cap){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(cap*12),3));
  g.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(cap*8),2));g.setAttribute("col",new THREE.BufferAttribute(new Float32Array(cap*16),4));
  const idx=new Uint16Array(cap*6);for(let i=0;i<cap;i++){idx.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6)}g.setIndex(new THREE.BufferAttribute(idx,1));
  g.setDrawRange(0,0);return g;}
const M2_CAP=400;
function m2Update(dt){if(!M2.live.length)return;
  camera.updateMatrixWorld();const cr=_m2r.setFromMatrixColumn(camera.matrixWorld,0).normalize(),cu=_m2u.setFromMatrixColumn(camera.matrixWorld,1).normalize();
  for(let i=M2.live.length-1;i>=0;i--){const fx=M2.live[i],def=fx.def;
    if(!fx.stopped&&fx.anchor){const a=fx.anchor(fx);if(a===false)fx.stopped=true;}
    fx.t+=dt;if(fx.once&&fx.t>fx.maxT)fx.stopped=true;
    const tt=def.loop?fx.t:Math.min(fx.t,def.dur||fx.t);
    fx.world.makeRotationY(fx.yaw).multiply(M2_AX);fx.world.elements[12]=fx.pos.x;fx.world.elements[13]=fx.pos.y;fx.world.elements[14]=fx.pos.z;
    if(fx.scale!==1)fx.world.multiply(_m2b.makeScale(fx.scale,fx.scale,fx.scale));
    m2Bones(def,tt,fx.bones,fx.world);
    let alive=false;
    if(def.mesh)m2Mesh(fx,tt);
    for(const e of fx.em)if(m2Particles(fx,e,dt,tt,cr,cu))alive=true;
    for(const r of fx.rb)if(m2Ribbon(fx,r,dt,tt,cr))alive=true;
    if(fx.stopped&&!alive){m2Free(fx);M2.live.splice(i,1);}}}
function m2Free(fx){for(const e of fx.em){if(e.mesh)scene.remove(e.mesh);if(e.pool)for(const g of e.pool)for(const m of g)scene.remove(m);}for(const r of fx.rb)if(r.mesh)scene.remove(r.mesh);if(fx.ms)for(const m of fx.ms)scene.remove(m);}
/* сетка модели: скиннинг на процессоре, цвет и прозрачность по дорожкам, анимация текстуры */
const M2_BL={0:[0,0],1:[0,0],2:[THREE.SrcAlphaFactor,THREE.OneMinusSrcAlphaFactor],3:[THREE.OneFactor,THREE.OneFactor],4:[THREE.SrcAlphaFactor,THREE.OneFactor],
  5:[THREE.DstColorFactor,THREE.ZeroFactor],6:[THREE.DstColorFactor,THREE.SrcColorFactor]};
function m2MeshMat(b){const t=M2.tex["r:"+b.tex]||(M2.tex["r:"+b.tex]=(()=>{const x=new THREE.TextureLoader().load(`assets/fx/m2/${b.tex}.webp`);x.flipY=false;x.wrapS=x.wrapT=THREE.RepeatWrapping;return x})());
  const bl=M2_BL[b.blend]||M2_BL[4];
  return new THREE.ShaderMaterial({uniforms:{map:{value:t},tint:{value:new THREE.Vector4(1,1,1,1)},uvm:{value:new THREE.Matrix3()}},
    transparent:b.blend>=2,depthWrite:b.blend<2&&!(b.rf&0x10),side:THREE.DoubleSide,
    blending:b.blend>=2?THREE.CustomBlending:THREE.NoBlending,blendSrc:bl[0]||THREE.OneFactor,blendDst:bl[1]||THREE.ZeroFactor,
    vertexShader:"uniform mat3 uvm;varying vec2 vU;void main(){vU=(uvm*vec3(uv,1.)).xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:`uniform sampler2D map;uniform vec4 tint;varying vec2 vU;void main(){vec4 t=texture2D(map,vU)*tint;${b.blend===1?"if(t.a<.5)discard;":""}gl_FragColor=t;}`});}
const _m2mv=new THREE.Vector3(),_m2acc=new THREE.Vector3(),_m2W=[];
function m2Mesh(fx,tt){const me=fx.def.mesh,N=me.p.length/3;
  if(!fx.ms){fx.mpos=new Float32Array(N*3);fx.ms=me.b.map(b=>{const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(fx.mpos,3));
      g.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(me.uv),2));g.setIndex(b.tri);const m=new THREE.Mesh(g,m2MeshMat(b));m.frustumCulled=false;m.renderOrder=4+(b.pri||0)*.01;m.matrixAutoUpdate=false;scene.add(m);return m});}
  const vis=!fx.stopped;
  for(let i=0;i<fx.bones.length;i++)(_m2W[i]||(_m2W[i]=new THREE.Matrix4())).multiplyMatrices(fx.world,fx.bones[i]);
  if(vis)for(let v=0;v<N;v++){_m2acc.set(0,0,0);let ws=0;
    for(let k=0;k<4;k++){const w=me.bw[v*4+k];if(!w)continue;const bi=me.bi[v*4+k],M=_m2W[bi];if(!M)continue;
      _m2mv.set(me.p[v*3],me.p[v*3+1],me.p[v*3+2]).applyMatrix4(M);_m2acc.addScaledVector(_m2mv,w/255);ws+=w/255;}
    if(!ws){_m2acc.set(me.p[v*3],me.p[v*3+1],me.p[v*3+2]).applyMatrix4(fx.world);ws=1;}
    fx.mpos[v*3]=_m2acc.x/ws;fx.mpos[v*3+1]=_m2acc.y/ws;fx.mpos[v*3+2]=_m2acc.z/ws;}
  me.b.forEach((b,j)=>{const m=fx.ms[j];m.visible=vis;if(!vis)return;m.geometry.attributes.position.needsUpdate=true;
    const C=b.ci>=0&&me.colors[b.ci],rgb=C?m2Samp(C.c,tt,[1,1,1]):[1,1,1];let a=C?m2Samp(C.a,tt,1):1;
    if(b.tw!=null&&me.trans[b.tw])a*=m2Samp(me.trans[b.tw],tt,1);
    m.material.uniforms.tint.value.set(rgb[0],rgb[1],rgb[2],a);
    const TA=b.ta!=null&&b.ta!==65535&&me.ta[b.ta];
    if(TA){const tr=m2Samp(TA.t,tt,null),rq=m2Samp(TA.r,tt,null),sc=m2Samp(TA.s,tt,null);
      _m2q.set(0,0,0,1);if(rq){_m2q.set(rq[0],rq[1],rq[2],rq[3]);if(_m2q.lengthSq()>1e-8)_m2q.normalize();else _m2q.set(0,0,0,1);}
      _m2v.set(.5+(tr?tr[0]:0),.5+(tr?tr[1]:0),0);_m2s.set(sc?sc[0]:1,sc?sc[1]:1,1);_m2bw.compose(_m2v,_m2q,_m2s).multiply(_m2a.makeTranslation(-.5,-.5,0));
      const e=_m2bw.elements;m.material.uniforms.uvm.value.set(e[0],e[4],e[12],e[1],e[5],e[13],0,0,1);}});
  return vis;}
function m2Particles(fx,e,dt,tt,cr,cu){const p=e.p,model=!!(p.fl&0x10),B=fx.bones[p.bone]||_m2a.identity();
  const q=m2Params(p,tt);
  /* 1. старение и движение */
  const g=q.g;
  for(let k=e.ps.length-1;k>=0;k--){const s=e.ps[k];s.age+=dt;if(s.age>=s.life){e.ps.splice(k,1);continue}
    const vx=s.v[0],vy=s.v[1],vz=s.v[2];s.x+=vx*dt;s.y+=vy*dt;s.z+=vz*dt;
    if(model){s.z-=.5*g*dt*dt;s.v[2]-=g*dt}else{s.y-=.5*g*dt*dt;s.v[1]-=g*dt}
    if(p.drag){const f=Math.min(1,dt*p.drag);s.v[0]-=f*s.v[0];s.v[1]-=f*s.v[1];s.v[2]-=f*s.v[2]}
    if(p.shape===2&&(p.fl&0x80)&&(vx*(s.x-s.ox)+vy*(s.y-s.oy)+vz*(s.z-s.oz))>0)e.ps.splice(k,1);}
  /* 2. рождение */
  if(!fx.stopped){const en=m2Samp(p.en,tt,1)>.5,rate=en?Math.max(0,m2Samp(p.rate,tt,0)):0,gate=rate>0;
    if(!en)e.acc=0;
    if(p.fl&0x8000){if(gate&&!e.gate)e.acc=Math.trunc(rate)}else if(gate)e.acc+=rate*dt;e.gate=gate;
    _m2b.multiplyMatrices(fx.world,B);
    while(e.acc>=1&&e.ps.length<M2_CAP){e.acc--;const r=m2Emit(e,p,q),sp=q.sp*(1+q.sv*m2S11(e));
      const s={age:(p.fl&0x8000)?0:m2R01(e)*dt,life:q.life,ph:m2Rng(e),x:0,y:0,z:0,v:[0,0,0],ox:0,oy:0,oz:0};
      if(model){_m2p.set(r[0],r[1],r[2]).applyMatrix4(B);
        _m2d.set(r[3]*sp,r[4]*sp,r[5]*sp);const L=_m2d.length();if(L>0){_m2d.transformDirection(B).multiplyScalar(L)}
        _m2t.set(p.pos[0],p.pos[1],p.pos[2]).applyMatrix4(B);s.ox=_m2t.x;s.oy=_m2t.y;s.oz=_m2t.z;}
      else{_m2p.set(r[0],r[1],r[2]).applyMatrix4(_m2b);_m2d.set(r[3]*sp,r[4]*sp,r[5]*sp);const L=_m2d.length();if(L>0)_m2d.transformDirection(_m2b).multiplyScalar(L*fx.scale);
        _m2t.set(p.pos[0],p.pos[1],p.pos[2]).applyMatrix4(_m2b);s.ox=_m2t.x;s.oy=_m2t.y;s.oz=_m2t.z;
        if(p.fl&0x2000){_m2p.y=m2Life(p,0,_m2o).s;}}
      s.x=_m2p.x;s.y=_m2p.y;s.z=_m2p.z;s.v[0]=_m2d.x;s.v[1]=_m2d.y;s.v[2]=_m2d.z;e.ps.push(s);}}
  /* 3. отрисовка */
  if(!e.ps.length){if(e.mesh)e.mesh.visible=false;return!fx.stopped&&false}
  if(p.model&&M2.defs[p.model]&&M2.defs[p.model].mesh)return m2PartModels(fx,e,p,model?_m2b.multiplyMatrices(fx.world,B):null);
  if(!e.mesh){if(!p.tex)return true;e.mesh=new THREE.Mesh(m2Geo(M2_CAP*(p.ht===2?2:1)),m2Mat(p.tex,p.blend));e.mesh.frustumCulled=false;e.mesh.renderOrder=5;scene.add(e.mesh);}
  e.mesh.visible=true;const G=e.mesh.geometry,P=G.attributes.position.array,U=G.attributes.uv.array,C=G.attributes.col.array;
  const cols=p.cols,rows=p.rows,ic=1/cols,ir=1/rows,sh=Math.log2(cols)|0;let n=0;const cap=M2_CAP*(p.ht===2?2:1);
  const M=model?_m2b.multiplyMatrices(fx.world,B):null,sc=fx.scale;
  for(const s of e.ps){if(n>=cap)break;const tw=p.tw;const noise=m2Twn(tw[0],s.age,s.ph);if(tw[1]<1&&noise>tw[1])continue;
    const L=m2Life(p,Math.min(1,s.age/s.life),_m2o),twk=Math.abs(tw[3]-tw[2])<1e-6?1:noise*(tw[3]-tw[2])+tw[2],half=L.s*twk*sc;
    const c=_m2c.set(s.x,s.y,s.z);if(M)c.applyMatrix4(M);
    const put=(cell,corners,uvs)=>{const cx=cell&(cols-1),cy=cell>>sh,u0=cx*ic,u1=u0+ic,v0=1-cy*ir,v1=v0-ir;
      for(let j=0;j<4;j++){const o=(n*4+j);P[o*3]=corners[j*3];P[o*3+1]=corners[j*3+1];P[o*3+2]=corners[j*3+2];
        const uv=uvs[j];U[o*2]=uv[0]?u1:u0;U[o*2+1]=uv[1]?v0:v1;C[o*4]=L.r;C[o*4+1]=L.g;C[o*4+2]=L.b;C[o*4+3]=L.a;}n++;};
    if(p.ht!==1){let rx=cr.x,ry=cr.y,rz=cr.z,ux=cu.x,uy=cu.y,uz=cu.z;
      if(p.fl&0x1000){_m2t.set(0,1,0).transformDirection(fx.world);rx=_m2t.x;ry=_m2t.y;rz=_m2t.z;_m2t.set(-1,0,0).transformDirection(fx.world);ux=_m2t.x;uy=_m2t.y;uz=_m2t.z;}
      if(p.spin){let a=p.spin*s.age;if(a<0&&(s.ph&0x20))a=-a;const sa=Math.sin(a),ca=Math.cos(a);
        const nrx=rx*ca+ux*sa,nry=ry*ca+uy*sa,nrz=rz*ca+uz*sa;ux=ux*ca-rx*sa;uy=uy*ca-ry*sa;uz=uz*ca-rz*sa;rx=nrx;ry=nry;rz=nrz;}
      rx*=half;ry*=half;rz*=half;ux*=half;uy*=half;uz*=half;
      put(L.hc,[c.x-rx-ux,c.y-ry-uy,c.z-rz-uz, c.x+rx-ux,c.y+ry-uy,c.z+rz-uz, c.x+rx+ux,c.y+ry+uy,c.z+rz+uz, c.x-rx+ux,c.y-ry+uy,c.z-rz+uz],[[0,0],[1,0],[1,1],[0,1]]);}
    if(p.ht>=1){const te=(p.fl&0x400)?Math.min(p.tail,s.age):p.tail;_m2d.set(s.v[0],s.v[1],s.v[2]);if(M)_m2d.transformDirection(M).multiplyScalar(Math.hypot(s.v[0],s.v[1],s.v[2]));
      const tx=-_m2d.x*te,ty=-_m2d.y*te,tz=-_m2d.z*te,tr=tx*cr.x+ty*cr.y+tz*cr.z,tu=tx*cu.x+ty*cu.y+tz*cu.z,l2=tr*tr+tu*tu;
      if(l2<7.7e-4){const rx=cr.x*half,ry=cr.y*half,rz=cr.z*half,ux=cu.x*half,uy=cu.y*half,uz=cu.z*half;
        put(L.tc,[c.x-rx-ux,c.y-ry-uy,c.z-rz-uz, c.x+rx-ux,c.y+ry-uy,c.z+rz-uz, c.x+rx+ux,c.y+ry+uy,c.z+rz+uz, c.x-rx+ux,c.y-ry+uy,c.z-rz+uz],[[0,0],[1,0],[1,1],[0,1]]);}
      else{const il=half/Math.sqrt(l2),px=(cu.x*tr-cr.x*tu)*il,py=(cu.y*tr-cr.y*tu)*il,pz=(cu.z*tr-cr.z*tu)*il;
        put(L.tc,[c.x-px,c.y-py,c.z-pz, c.x+px,c.y+py,c.z+pz, c.x+tx+px,c.y+ty+py,c.z+tz+pz, c.x+tx-px,c.y+ty-py,c.z+tz-pz],[[0,0],[0,1],[1,1],[1,0]]);}}}
  G.attributes.position.needsUpdate=G.attributes.uv.needsUpdate=G.attributes.col.needsUpdate=true;G.setDrawRange(0,n*6);
  return true;}
/* частица-модель: вместо плоской картинки рисуется маленькая модель из клиента (воронка Прилива сил, вихрь, конус) */
const _m2pm=new THREE.Matrix4(),_m2pr=new THREE.Matrix4();
function m2PartModels(fx,e,p,M){const me=M2.defs[p.model].mesh,pool=e.pool||(e.pool=[]);let n=0;
  if(!me.geo){me.geo=me.b.map(b=>{const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(me.p),3));g.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(me.uv),2));g.setIndex(b.tri);return g});}
  for(const s of e.ps){if(n>=24)break;const L=m2Life(p,Math.min(1,s.age/s.life),_m2o),sc=L.s*fx.scale;if(sc<=1e-4||L.a<=.003)continue;
    const g=pool[n]||(pool[n]=me.b.map((b,j)=>{const m=new THREE.Mesh(me.geo[j],m2MeshMat(b));m.frustumCulled=false;m.matrixAutoUpdate=false;m.renderOrder=5;scene.add(m);return m}));
    const c=_m2c.set(s.x,s.y,s.z);if(M)c.applyMatrix4(M);
    _m2pm.copy(fx.world);_m2pm.multiply(_m2pr.makeRotationZ((p.spin||0)*s.age));_m2pm.multiply(_m2pr.makeScale(sc/fx.scale,sc/fx.scale,sc/fx.scale));
    _m2pm.elements[12]=c.x;_m2pm.elements[13]=c.y;_m2pm.elements[14]=c.z;
    me.b.forEach((b,j)=>{const m=g[j];m.visible=true;m.matrix.copy(_m2pm);let a=L.a;if(b.tw!=null&&me.trans[b.tw])a*=m2Samp(me.trans[b.tw],s.age,1);m.material.uniforms.tint.value.set(L.r,L.g,L.b,a);});n++;}
  for(let k=n;k<pool.length;k++)for(const m of pool[k])m.visible=false;
  return true;}
/* шлейф: рёбра рождаются с частотой eps, живут elife, лента между ними */
function m2Ribbon(fx,R,dt,tt,cr){const r=R.r,B=fx.bones[r.bone]||_m2a.identity();
  for(let k=R.edges.length-1;k>=0;k--){const ed=R.edges[k];ed.age+=dt;if(ed.age>=r.elife){R.edges.splice(k,1);continue}if(r.grav){ed.vy-=r.grav*dt;ed.y+=ed.vy*dt;}}
  if(!fx.stopped&&m2Samp(r.vis,tt,1)>.5){_m2b.multiplyMatrices(fx.world,B);
    _m2p.set(r.pos[0],r.pos[1],r.pos[2]).applyMatrix4(_m2b);_m2d.set(0,0,1).transformDirection(_m2b);
    const ha=m2Samp(r.ha,tt,0)*fx.scale,hb=m2Samp(r.hb,tt,0)*fx.scale,col=m2Samp(r.col,tt,[1,1,1]),al=m2Samp(r.alpha,tt,1);
    R.acc+=dt*Math.max(r.eps,30);
    const head=R.edges[R.edges.length-1];
    if(R.acc>=1||!head){R.acc=0;R.edges.push({x:_m2p.x,y:_m2p.y,z:_m2p.z,ux:_m2d.x,uy:_m2d.y,uz:_m2d.z,ha,hb,c:col,a:al,age:0,vy:0});}
    else Object.assign(head,{x:_m2p.x,y:_m2p.y,z:_m2p.z,ux:_m2d.x,uy:_m2d.y,uz:_m2d.z,ha,hb,c:col,a:al});}
  const E=R.edges;if(E.length<2){if(R.mesh)R.mesh.visible=false;return E.length>0}
  if(!R.mesh){if(!r.tex)return true;R.mesh=new THREE.Mesh(m2Geo(128),m2Mat(r.tex,r.blend==null?4:r.blend===2?2:r.blend===1?1:r.blend>=3?4:0));R.mesh.frustumCulled=false;R.mesh.renderOrder=5;scene.add(R.mesh);}
  R.mesh.visible=true;const G=R.mesh.geometry,P=G.attributes.position.array,U=G.attributes.uv.array,C=G.attributes.col.array;
  const cw=1/r.cols,ch=1/r.rows;let n=0;
  for(let k=E.length-1;k>0&&n<128;k--){const a=E[k],b=E[k-1];
    const vs=[[a,a.ha],[b,b.ha],[b,-b.hb],[a,-a.hb]],us=[a.age/r.elife,b.age/r.elife];
    for(let j=0;j<4;j++){const[ed,h]=vs[j],o=n*4+j;P[o*3]=ed.x+ed.ux*h;P[o*3+1]=ed.y+ed.uy*h;P[o*3+2]=ed.z+ed.uz*h;
      U[o*2]=(j===0||j===3?us[0]:us[1])*cw;U[o*2+1]=j<2?1:1-ch;C[o*4]=ed.c[0];C[o*4+1]=ed.c[1];C[o*4+2]=ed.c[2];C[o*4+3]=ed.a;}n++;}
  G.attributes.position.needsUpdate=G.attributes.uv.needsUpdate=G.attributes.col.needsUpdate=true;G.setDrawRange(0,n*6);return true;}
/* --- точки крепления на модели юнита --- */
const _m2w=new THREE.Vector3();
function m2At(u,slot,fx){const m=u.model;if(!u.alive&&fx&&!fx.once)return false;fx.yaw=u.facing;
  if(!m||!m.g.visible){fx.pos.set(u.pos.x,u.y+1.2,u.pos.z);return}
  let b=null;if(slot==="rhand")b=m.spellBone;else if(slot==="lhand")b=m.handL;else if(slot==="head"||slot==="breath")b=m.head;
  if(b){m.g.updateMatrixWorld(true);b.getWorldPosition(fx.pos);if(slot==="head")fx.pos.y+=.05;
    if(slot==="breath"){fx.pos.x+=Math.sin(u.facing)*.25;fx.pos.z+=Math.cos(u.facing)*.25;}return}
  fx.pos.set(u.pos.x,u.y+(slot==="chest"?1.25:0),u.pos.z);}
/* кит заклинания (стадия precast/cast/impact/state/channel) на юните; возвращает список запущенных эффектов */
function m2Kit(u,id,stage,once){const v=M2.vis&&M2.vis[id];if(!v||!v[stage]||!u)return null;const out=[];
  for(const slot in v[stage]){const name=v[stage][slot];
    if(slot==="world"){const x=u.pos.x,z=u.pos.z,y=u.y,f=u.facing;out.push(m2Play(name,fx=>{fx.pos.set(x,y,z);fx.yaw=f},{once}));continue}
    out.push(m2Play(name,fx=>m2At(u,slot,fx),{once}));}
  return out.filter(Boolean);}
/* разовый визуал (каст на заклинателе, попадание на цели); у второго игрока проигрывается по событию */
function spellVis(u,id,stage){m2Kit(u,id,stage,true);}
const m2Has=(id,stage)=>!!(M2.vis&&M2.vis[id]&&M2.vis[id][stage]);
/* постоянные визуалы: подготовка/поддержание из u.cast, состояния из аур */
function m2Sync(){if(!M2.vis)return;
  for(const u of units){const want={},hid=u.team!==player.team&&!canSee(player,u);
    if(u.alive&&!hid&&u.cast){const st=u.cast.channel?"channel":"precast";if(m2Has(u.cast.id,st))want[u.cast.id+":"+st]=[u,u.cast.id,st];}
    if(u.alive&&!hid)for(const a of u.auras){const id=a.vis||AURA_SPELL[a.name];if(id&&m2Has(id,"state")&&a.until>now)want[id+":state"]=[u,id,"state"];}
    const cur=u.m2fx||(u.m2fx={});
    for(const k in cur)if(!want[k]){cur[k].forEach(m2Stop);delete cur[k];}
    for(const k in want)if(!cur[k]){const[w,id,st]=want[k];cur[k]=m2Kit(w,id,st,false)||[];}}}
function m2Clear(){for(const fx of M2.live)m2Free(fx);M2.live.length=0;for(const u of units)u.m2fx=null;}
/* аура -> заклинание по русскому имени способности */
const AURA_SPELL={};
let fxSpell=null,fxLaunched=false;
const m2Skip=()=>!!(fxSpell&&m2Has(fxSpell,"impact"));
function m2Names(){for(const c of [...CLASSES,"common"]){const A=B[c]&&B[c].abilities;if(!A)continue;for(const id in A)if(A[id]&&A[id].name)AURA_SPELL[A[id].name]=id;}}

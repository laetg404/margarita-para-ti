(() => {
  const canvas = document.getElementById('flower');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('hint');
  const replay = document.getElementById('replay');

  const W = 850, H = 750, TOTAL = 13;
  const CENTER_Y = 80, GROUND = -195, R0 = 22;
  const STEM_TOP = CENTER_Y - 4, STEM_BOTTOM = GROUND - 10;
  const rng = mulberry32(7);
  const FALL_DURATION = 1600;
  const PETAL_PAUSE = 650;
  let petals = [], destinations = [], grass = [];
  let stemProgress = 0, leafScale = 0, visible = [], fallen = [];
  let phase = 'stem', phaseStart = 0, petalFrame = 0, currentPetal = 0;
  let message = '', messageLines = null, messageStart = 0, lastTime = 0;
  let timers = [];

  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rand = (a,b) => a + rng() * (b-a);
  const choice = arr => arr[Math.floor(rng()*arr.length)];
  function mix(c1,c2,t) {
    t=Math.max(0,Math.min(1,t));
    const a=[1,3,5].map(i=>parseInt(c1.slice(i,i+2),16));
    const b=[1,3,5].map(i=>parseInt(c2.slice(i,i+2),16));
    return '#'+a.map((v,k)=>Math.round(v+(b[k]-v)*t).toString(16).padStart(2,'0')).join('').toUpperCase();
  }
  function polygon(points, fill, stroke=fill, width=1) {
    if (!points.length) return;
    ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]);
    for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
    if (stroke && width>0) { ctx.strokeStyle=stroke; ctx.lineWidth=width; ctx.stroke(); }
  }
  function line(points,color,width=1) {
    if (points.length<2) return;
    ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke();
  }
  function petalGeometry(length,width) {
    const profile=[];
    for(let k=0;k<=28;k++) {
      const t=k/28, hw=width*Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(t,1.3))),.75);
      profile.push({t,x:R0+length*t,hw});
    }
    const outline=profile.map(p=>[p.x,p.hw]).concat(profile.slice(1,-1).reverse().map(p=>[p.x,-p.hw]));
    function layer(max) {
      const top=[];
      for(const p of profile) if(p.t<=max) top.push([p.x,p.hw*Math.sqrt(Math.max(0,1-Math.pow(p.t/max,3)))]);
      return top.concat(top.slice(1,-1).reverse().map(p=>[p[0],-p[1]]));
    }
    const veins=[0,.45,-.45].map(f=>profile.filter(p=>p.t>=.1&&p.t<=.84).map(p=>[p.x,p.hw*f]));
    return {outline,layers:[[layer(.62),'#F6F2E6'],[layer(.36),'#EEE5CE']],veins};
  }
  for(let i=0;i<TOTAL;i++) {
    const length=rand(98,113), width=rand(15,18.5);
    petals.push({angle:i*(360/TOTAL)+rand(-3,3),pivot:R0+length*.5,geo:petalGeometry(length,width)});
  }
  const xs=Array.from({length:TOTAL},(_,k)=>-170+k*(340/(TOTAL-1)));
  for(let i=xs.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[xs[i],xs[j]]=[xs[j],xs[i]];}
  for(let i=0;i<TOTAL;i++) destinations.push([xs[i]+rand(-8,8),GROUND-rand(8,42),choice([-1,1])*rand(220,420)]);
  for(let x=-430;x<=430;x+=16) grass.push([x+rand(-5,5),rand(16,40),rand(-9,9),choice(['#5F9A52','#6FAE5F','#4C8444'])]);

  function transform(points,cx,cy,angle,pivot,scale=1) {
    const c=Math.cos(angle),s=Math.sin(angle);
    return points.map(([x,y])=>{const lx=x-pivot,ly=y*scale;return [cx+lx*c-ly*s,cy+lx*s+ly*c];});
  }
  function flowerPose(i) {
    const p=petals[i],a=p.angle*Math.PI/180;
    return [p.pivot*Math.cos(a),CENTER_Y+p.pivot*Math.sin(a),a];
  }
  function fallPose(i,p) {
    const [x0,y0,a0]=flowerPose(i),[tx,ty,turn]=destinations[i];
    const smooth=p*p*(3-2*p),acc=Math.pow(p,1.7);
    const sway=16*Math.sin(p*Math.PI*3)*(1-p)*(i%2===0?1:-1);
    return [x0+(tx-x0)*smooth+sway,y0+(ty-y0)*acc,a0+turn*Math.PI/180*smooth];
  }
  function drawPetal(i,pose,scale=1,shadow=true) {
    const [cx,cy,a]=pose,p=petals[i],g=p.geo;
    if(shadow) polygon(transform(g.outline,cx+3,cy-3,a,p.pivot,scale),'#EBDFC9');
    polygon(transform(g.outline,cx,cy,a,p.pivot,scale),'#FFFFFF','#CFC8B3',1.2);
    for(const [pts,color] of g.layers) polygon(transform(pts,cx,cy,a,p.pivot,scale),color);
    for(const v of g.veins) line(transform(v,cx,cy,a,p.pivot,scale),'#E2DCCB',1);
  }
  const seeds=[];
  for(let n=1;n<=140;n++) {
    const a=n*137.50776*Math.PI/180,r=2.4*Math.sqrt(n),x=r*Math.cos(a),y=r*Math.sin(a),rmax=2.4*Math.sqrt(140);
    let color=mix('#B5650A','#F4C442',Math.pow(r/rmax,.8));
    const light=(-x+y)/(2*rmax);
    color=light>0?mix(color,'#FFF0A0',light*.6):mix(color,'#8A4A06',-light*.5);
    seeds.push([x,y,color]);
  }
  function drawCenter() {
    ctx.fillStyle='#A86A0E';ctx.beginPath();ctx.arc(0,CENTER_Y,34,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#D99A1A';ctx.beginPath();ctx.arc(0,CENTER_Y,31,0,Math.PI*2);ctx.fill();
    for(const [x,y,color] of seeds){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,CENTER_Y+y,2.5,0,Math.PI*2);ctx.fill();}
  }
  function stemX(y) {const u=(STEM_TOP-y)/(STEM_TOP-STEM_BOTTOM);return 6*Math.sin(2*Math.PI*u);}
  function drawStem() {
    if(stemProgress<=0)return;
    const actual=STEM_BOTTOM+(STEM_TOP-STEM_BOTTOM)*stemProgress,pts=[];
    for(let k=0;k<=40;k++){const y=STEM_BOTTOM+(STEM_TOP-STEM_BOTTOM)*k/40;if(y<=actual)pts.push([stemX(y),y]);}
    if(pts.length<2)return;
    line(pts,'#3F6E3A',10);line(pts,'#5C9A4F',7);line(pts.map(([x,y])=>[x+1.8,y]),'#86BC74',2);
  }
  function drawLeaf(bx,by,angle,length,width,curve) {
    if(leafScale<=0)return;
    length*=leafScale;width*=leafScale;
    const a=angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),px=-dy,py=dx,n=18;
    const center=t=>{const d=curve*length*t*t*.35;return [bx+dx*length*t+px*d,by+dy*length*t+py*d];};
    const half=t=>width*Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(t,.8))),.85);
    const centers=Array.from({length:n+1},(_,k)=>center(k/n));
    const sideA=centers.map((c,k)=>[c[0]+px*half(k/n),c[1]+py*half(k/n)]);
    const sideB=centers.map((c,k)=>[c[0]-px*half(k/n),c[1]-py*half(k/n)]);
    polygon(sideA.concat(centers.slice().reverse()),'#7DB86E','#3F7340',1.2);
    polygon(sideB.concat(centers.slice().reverse()),'#5E9B55','#3F7340',1.2);
    line(centers.slice(0,-1),'#3F7340',1.5);
    for(const t of [.22,.42,.62]) {const c0=center(t),c1=center(t+.15),w=half(t+.15)*.85;line([c0,[c1[0]+px*w,c1[1]+py*w]],'#4C8645',1);line([c0,[c1[0]-px*w,c1[1]-py*w]],'#4C8645',1);}
  }
  function groundY(x){return GROUND+7*Math.sin(x/37)+3*Math.sin(x/11);}
  function drawGround() {
    const band=[[-430,-380]];for(let x=-430;x<=430;x+=10)band.push([x,groundY(x)]);band.push([430,-380]);
    polygon(band,'#A8CB8E');
    for(const [x,h,tilt,color] of grass){const base=groundY(x)-2;polygon([[x-3,base],[x+tilt,base+h],[x+3,base]],color);}
  }
  function drawScene(flying=null) {
    ctx.clearRect(-425,-375,W,H);
    drawStem();drawLeaf(stemX(-60),-60,148,105,21,.5);drawLeaf(stemX(-115),-115,32,105,21,-.5);drawGround();
    for(const i of fallen)drawPetal(i,fallPose(i,1),1,false);
    if(stemProgress>=1&&visible.length===0){ctx.fillStyle='#5E9A55';ctx.beginPath();ctx.arc(0,CENTER_Y,17,0,Math.PI*2);ctx.fill();}
    for(const i of visible){if(fallen.includes(i)||(flying&&i===flying.index))continue;drawPetal(i,flowerPose(i));}
    if(visible.length===TOTAL)drawCenter();
    if(flying){const scale=1-.55*(1-flying.progress)*Math.abs(Math.sin(flying.progress*Math.PI*4));drawPetal(flying.index,fallPose(flying.index,flying.progress),scale);}
  }
  function drawText() {
    if(messageLines){ctx.fillStyle='#795B55';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='italic 20px Georgia,serif';
      const gap=35,startY=(messageLines.length-1)*gap/2;
      messageLines.forEach((s,i)=>ctx.fillText(s,0,-(startY-i*gap)));
    } else if(message){ctx.fillStyle='#795B55';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='italic 25px Georgia,serif';ctx.fillText(message,0,-270);}
  }
  function render(flying=null) {
    ctx.save();ctx.translate(W/2,H/2);ctx.scale(1,-1);drawScene(flying);ctx.restore();
    if(message||messageLines){ctx.save();ctx.translate(W/2,H/2);drawText();ctx.restore();}
  }
  function setMessage(text){message=text;messageLines=null;hint.textContent=text||'Hecha especialmente para ti ♡';}
  function start() {
    timers.forEach(clearTimeout);timers=[];
    stemProgress=0;leafScale=0;visible=[];fallen=[];phase='stem';phaseStart=performance.now();petalFrame=0;currentPetal=0;message='';messageLines=null;hint.textContent='Hecha especialmente para ti ♡';
    lastTime=0;requestAnimationFrame(loop);
  }
  function later(fn,ms){timers.push(setTimeout(fn,ms));}
  function loop(now) {
    if(!lastTime)lastTime=now;
    const dt=now-phaseStart;
    let flying=null;
    if(phase==='stem'){
      const t=Math.min(1,dt/1200);stemProgress=t*t*(3-2*t);render();
      if(t>=1){phase='leaves';phaseStart=now;}
    } else if(phase==='leaves'){
      const t=Math.min(1,dt/420);leafScale=t*t*(3-2*t);render();
      if(t>=1){phase='build';phaseStart=now;}
    } else if(phase==='build'){
      if(dt>250){visible.push(visible.length);phaseStart=now;}
      render();
      if(visible.length>=TOTAL){phase='flowerPause';phaseStart=now;}
    } else if(phase==='flowerPause'){
      render();if(dt>500){setMessage('Una pequeña margarita para ti, mi princesa... ♡');phase='introPause';phaseStart=now;}
    } else if(phase==='introPause'){
      render();if(dt>1800){phase='fall';phaseStart=now;currentPetal=0;petalFrame=0;}
    } else if(phase==='fall'){

  if(currentPetal>=TOTAL){
    phase='ending';
    phaseStart=now;
    setMessage('¡Me quieres! ♡');
    render();
    return;
  }
  const p=Math.min(1, (now-phaseStart)/FALL_DURATION);

  flying={
    index:currentPetal,
    progress:p
  };

  const phrase=currentPetal%2===0
    ? 'Me quieres...'
    : 'No me quieres...';

  setMessage(phrase);
  render(flying);
  if(p>=1){

    fallen.push(currentPetal);

    phase='petalPause';
    phaseStart=now;
  }

} else if(phase==='petalPause'){

    render();
    if(now-phaseStart>=PETAL_PAUSE){
  
      currentPetal++;
  
      phase='fall';
      phaseStart=now;
    }
  }
    } else if(phase==='ending'){
      render();if(dt>2500){setMessage('¡Te amo, mi amorcito preciosa! ♡');phase='lovePause';phaseStart=now;}
    } else if(phase==='lovePause'){
      render();if(dt>2500){message='';messageLines=['¡Feliz cumpleaños, vida mía! ♡','Todos los días celebro tu vida,','porque tu existencia le da sentido','a mi existencia.'];hint.textContent=messageLines.join(' ');phase='final';render();}
    } else if(phase==='final'){render();return;}
    requestAnimationFrame(loop);
  }
  function petalFrameDone(){return petalFrame>34;}
  replay.addEventListener('click',start);
  start();
})();

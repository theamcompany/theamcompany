(() => {
  const canvas = document.getElementById('gameCanvas'), ctx = canvas.getContext('2d');
  const W=960,H=540, keys={left:false,right:false,jump:false};
  const G={gravity:.58,maxFall:14,run:3.7,jump:12.2,world:70000};
  let level=1,running=false,paused=false,last=0,checkpoint=0,score=0,coins=0,time=0,won=false,cameraX=0;
  let maxUnlocked=Math.max(1,Math.min(10,Number(localStorage.getItem('amRunUnlocked')||1)));
  let p, platforms=[], movers=[], spikes=[], mobs=[], coinList=[], bombs=[], particles=[], boss=null, shake=0;
  let audio=null;
  const names=['First Steps','Wild Garden','Factory Floor','Crimson Cliffs','Sky Ruins','Night Run','High Watch','Bombardment','Titan Gate','AM Titan'];
  const palette=[['#151515','#24221f'],['#182019','#273028'],['#1a1d24','#292e38'],['#241b1b','#392727']];
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  function sound(type){
    try{
      audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume();
      const o=audio.createOscillator(), g=audio.createGain(); o.connect(g);g.connect(audio.destination);
      const f={jump:[330,.07,'square'],coin:[880,.09,'sine'],hit:[100,.12,'sawtooth'],hurt:[75,.18,'sawtooth'],cp:[520,.2,'triangle'],win:[440,.4,'sine'],boss:[65,.3,'sawtooth']}[type]||[220,.08,'sine'];
      o.type=f[2];o.frequency.setValueAtTime(f[0],audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,f[0]*.55),audio.currentTime+f[1]);g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.07,audio.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+f[1]);o.start();o.stop(audio.currentTime+f[1]+.02);
    }catch(e){}
  }
  function rng(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
  function buildLevel(n){
    const r=rng(9000+n*777), diff=n, L=[]; movers=[];spikes=[];mobs=[];coinList=[];bombs=[];particles=[];boss=null;
    L.push({x:0,y:470,w:1250,h:70});
    let x=900, y=410;
    while(x<G.world-1100){
      const gap=80+r()*150, w=150+r()*260; y=300+r()*145;
      if(y>445)y=445;
      const plat={x,y,w,h:22};L.push(plat);
      if(r()<.34)spikes.push({x:plat.x+35+r()*(plat.w-70),y:plat.y-16,w:48,h:16});
      if(r()<.72){const count=1+(r()<.32?1:0);for(let j=0;j<count;j++)coinList.push({x:plat.x+45+j*35,y:plat.y-34,r:7,t:0,taken:false});}
      if(r()<.15){movers.push({x:plat.x+20,y:plat.y-80,w:120,h:18,baseX:plat.x+20,baseY:plat.y-80,range:90+r()*120,t: r()*6,axis:r()<.5?'x':'y',speed:.018+r()*.012,dx:0,dy:0});}
      if(r()<.55){const type=r()<Math.min(.55,.18+diff*.04)?'charger':r()<.45?'armored':'slime';mobs.push(enemy(type,plat.x+Math.min(plat.w-35,70+r()*(plat.w-80)),plat.y-32,diff,r));}
      if(diff>=7&&r()<.24)mobs.push(enemy('bird',plat.x+60,Math.max(110,plat.y-120),diff,r));
      x=plat.x+plat.w+gap;
    }
    L.push({x:G.world-1100,y:455,w:1100,h:85});
    for(let i=0;i<9;i++){const cx=500+i*210+(r()*70-35);coinList.push({x:cx,y:410-r()*120,r:7,t:0,taken:false});}
    if(n===10){boss={x:G.world-950,y:330,w:150,h:125,hp:50,maxHp:50,vx:1.8,cool:100,flash:0,dead:false};for(let i=0;i<8;i++)spikes.push({x:G.world-1050+i*90,y:439,w:50,h:16});}
    else {for(let i=0;i<12;i++)spikes.push({x:G.world-1050+i*75,y:439,w:42,h:16});}
    platforms=L;return L;
  }
  function enemy(type,x,y,diff,r){
    const data={slime:[30,28,1,.8],charger:[34,32,2,1.1],armored:[38,38,4,.55],bird:[42,26,2,.9]}[type];
    return {type,x,y,w:data[0],h:data[1],hp:data[2]+Math.floor(diff/4),maxHp:data[2]+Math.floor(diff/4),vx:type==='bird'?(r()<.5?-1:1)*data[3]:data[3]*(r()<.5?-1:1),vy:0,baseY:y,phase:r()*6,cool:70+r()*80,dead:false,hitFlash:0};
  }
  function loadLevel(n){
    level=n; buildLevel(n); checkpoint=0;score=0;coins=0;time=0;won=false;cameraX=0;
    p={x:60,y:420,w:25,h:40,vx:0,vy:0,hp:3,maxHp:3,onGround:false,ground:null,inv:0,anim:0};
    $('levelTitle').textContent=`Level ${n} — ${names[n-1]}`;$('lvlHud').textContent=`${n}/10`;$('hpHud').textContent='3';$('cpHud').textContent='Start';$('coinHud').textContent='0';$('timeHud').textContent='0:00';
    $('gameMessage').textContent=n===10?'Final level: defeat the AM Titan, then reach the exit.':'Explore, collect hidden coins, activate checkpoints and reach the exit.';
    buildLevels();running=false;paused=false;updateButtons();draw();
  }
  function buildLevels(){const el=$('levelSelect');el.innerHTML='';for(let i=1;i<=10;i++){const b=document.createElement('button');b.className='level-btn'+(i===level?' active':'');b.textContent=i;b.disabled=i>maxUnlocked;b.onclick=()=>loadLevel(i);el.appendChild(b)}}
  function updateButtons(){$('playBtn').classList.toggle('active',running&&!paused);$('pauseBtn').classList.toggle('active',paused)}
  function respawn(loseLife=true){
    if(loseLife){p.hp--;sound('hurt');shake=10;if(p.hp<=0){p.hp=p.maxHp;score=Math.max(0,score-20)}}
    const x=checkpoint?Math.max(60,checkpoint):60;p.x=x;p.y=360;p.vx=p.vy=0;p.inv=100;bombs=[];$('hpHud').textContent=p.hp;
  }
  function setCheckpoint(x){if(x>checkpoint){checkpoint=x;score+=25;sound('cp');p.hp=Math.min(p.maxHp,p.hp+1);$('cpHud').textContent=`${Math.floor(x/1000)}km`;burst(x,440,'cp')}}
  function moveEntity(o,dt){
    const oldY=o.y; o.vy+=G.gravity*dt;o.vy=clamp(o.vy,-99,G.maxFall);o.x+=o.vx*dt;
    o.onGround=false;o.ground=null;
    for(const q of [...platforms,...movers]){
      if(o.x+o.w>q.x&&o.x<q.x+q.w&&oldY+o.h<=q.y+8&&o.y+o.h>=q.y&&o.vy>=0){o.y=q.y-o.h;o.vy=0;o.onGround=true;o.ground=q;break}
    }
    o.y+=o.vy*dt;
  }
  function update(dt){
    time+=dt/60;$('timeHud').textContent=`${Math.floor(time/60)}:${String(Math.floor(time)%60).padStart(2,'0')}`;
    for(const m of movers){const oldX=m.x,oldY=m.y;m.t+=m.speed*dt;const s=Math.sin(m.t)*m.range;if(m.axis==='x')m.x=m.baseX+s;else m.y=m.baseY+s;m.dx=m.x-oldX;m.dy=m.y-oldY;if(p.ground===m){p.x+=m.dx;p.y+=m.dy}}
    const dir=(keys.right?1:0)-(keys.left?1:0);p.vx=dir*G.run;if(!dir)p.vx*=.82;
    if(keys.jump&&p.onGround){p.vy=-G.jump;p.onGround=false;keys.jump=false;sound('jump')}
    const beforeY=p.y;moveEntity(p,dt);p.anim+=dt*(Math.abs(p.vx)>0.2?0.28:0.08);p.x=clamp(p.x,0,G.world-p.w);
    if(p.y>H+100){respawn(true)}
    if(p.inv>0)p.inv-=dt;
    for(const q of spikes){if(hit(p,q)&&p.vy>=0){respawn(true);break}}
    for(const c of coinList){if(!c.taken&&hit(p,{x:c.x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2})){c.taken=true;coins++;score+=5;sound('coin');burst(c.x,c.y,'coin')}}
    for(let i=1;i<=10;i++){const cx=i*1650-500;if(p.x>cx)setCheckpoint(cx)}
    for(const m of mobs){if(m.dead)continue;m.hitFlash=Math.max(0,m.hitFlash-dt);m.cool-=dt;
      if(m.type==='bird'){m.y=m.baseY+Math.sin(performance.now()/420+m.phase)*28;m.x+=m.vx*dt;if(m.x<100||m.x>G.world-500)m.vx*=-1;if(m.cool<=0){bombs.push({x:m.x+15,y:m.y+20,vx:0,vy:1.8,r:8,life:250});m.cool=100+Math.random()*100}}
      else {m.x+=m.vx*dt;if(m.x<40||m.x>G.world-300)m.vx*=-1;if(m.type==='charger'&&Math.abs(p.x-m.x)<260)m.vx=(p.x<m.x?-1:1)*(2.0+level*.08);}
      m.vy=0;
      if(hit(p,m)){if(p.vy>0&&p.y+p.h-m.y<18){m.hp--;p.vy=-7.5;score+=10;sound('hit');m.hitFlash=8;burst(m.x,m.y,'hit');if(m.hp<=0)m.dead=true}else respawn(true)}
    }
    for(const b of bombs){b.vy+=.3*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(hit(p,{x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2})){b.life=0;respawn(true);burst(b.x,b.y,'bomb')}if(b.y>500){b.life=0;burst(b.x,b.y,'bomb')}}bombs=bombs.filter(b=>b.life>0);
    if(boss&&!boss.dead){boss.flash=Math.max(0,boss.flash-dt);boss.cool-=dt;boss.x+=boss.vx*dt;if(boss.x<G.world-1050||boss.x>G.world-250)boss.vx*=-1;if(boss.cool<=0){boss.cool=75;for(let i=-2;i<=2;i++)bombs.push({x:boss.x+boss.w/2,y:boss.y+70,vx:i*1.1,vy:-5,r:11,life:260});sound('boss')}if(hit(p,boss)){if(p.vy>0&&p.y+p.h-boss.y<25){boss.hp--;p.vy=-9;boss.flash=8;score+=20;sound('hit');if(boss.hp<=0){boss.dead=true;score+=500;sound('win');burst(boss.x+70,boss.y+60,'boss');$('gameMessage').textContent='The AM Titan has fallen. Reach the exit!'}}else respawn(true)}}
    if(p.x>G.world-150){if(!boss||boss.dead)completeLevel()}
    particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=.1*dt;q.life-=dt});particles=particles.filter(q=>q.life>0);
    const target=clamp(p.x-W*.38,0,G.world-W);cameraX+=(target-cameraX)*.12;if(shake>0)shake-=dt;
  }
  function completeLevel(){if(won)return;won=true;running=false;score+=Math.max(0,Math.floor(600-time));if(level<10){maxUnlocked=Math.max(maxUnlocked,level+1);localStorage.setItem('amRunUnlocked',maxUnlocked);$('gameMessage').textContent=`Level ${level} complete! Level ${level+1} unlocked.`}else $('gameMessage').textContent='All 10 levels complete — AM Titan defeated!';sound('win');buildLevels();updateButtons()}
  function burst(x,y,type){for(let i=0;i<14;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-1)*5,life:25+Math.random()*25,type})}
  function draw(){
    const L=palette[(level-1)%palette.length];ctx.fillStyle=L[0];ctx.fillRect(0,0,W,H);ctx.fillStyle=L[1];for(let i=0;i<18;i++){const x=((i*320-cameraX*.18)%22000+22000)%22000;ctx.fillRect(x,120+(i%5)*45,140,3)}
    ctx.save();ctx.translate(-cameraX+(shake?Math.random()*shake-shake/2:0),0);
    for(const q of platforms){ctx.fillStyle='#d1b78e';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.fillStyle='#8b755a';ctx.fillRect(q.x,q.y,q.w,4)}
    for(const q of movers){ctx.fillStyle='#a99578';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.fillStyle='#eee4d2';ctx.fillRect(q.x+8,q.y+5,q.w-16,3)}
    for(const s of spikes){ctx.fillStyle='#b56e58';ctx.beginPath();ctx.moveTo(s.x,s.y+s.h);ctx.lineTo(s.x+s.w/2,s.y);ctx.lineTo(s.x+s.w,s.y+s.h);ctx.fill()}
    for(const c of coinList)if(!c.taken){c.t+=.08;ctx.fillStyle='#d9b55f';ctx.beginPath();ctx.ellipse(c.x,c.y,7+Math.sin(c.t)*2,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0ad';ctx.fillRect(c.x-1,c.y-4,2,8)}
    for(const m of mobs)if(!m.dead){ctx.save();if(m.hitFlash)ctx.globalAlpha=.45; if(m.type==='bird'){ctx.fillStyle='#918f8a';ctx.beginPath();ctx.ellipse(m.x+21,m.y+13,21,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d0a15c';ctx.beginPath();ctx.moveTo(m.x+35,m.y+11);ctx.lineTo(m.x+49,m.y+16);ctx.lineTo(m.x+35,m.y+20);ctx.fill();ctx.fillStyle='#181818';ctx.fillRect(m.x+24,m.y+7,4,4)}else{ctx.fillStyle=m.type==='armored'?'#65676a':m.type==='charger'?'#a85f55':'#75906f';ctx.fillRect(m.x,m.y,m.w,m.h);ctx.fillStyle='#171717';ctx.fillRect(m.x+7,m.y+8,4,4);ctx.fillRect(m.x+m.w-11,m.y+8,4,4);if(m.type==='armored'){ctx.strokeStyle='#eee';ctx.strokeRect(m.x+3,m.y+3,m.w-6,m.h-6)}}ctx.restore()}
    for(const b of bombs){ctx.fillStyle='#282522';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d4b36b';ctx.fillRect(b.x-2,b.y-b.r-6,4,7)}
    if(boss&&!boss.dead){ctx.fillStyle=boss.flash?'#fff':'#5e526e';ctx.fillRect(boss.x,boss.y,boss.w,boss.h);ctx.fillStyle='#d2b16a';ctx.fillRect(boss.x+22,boss.y+18,boss.w-44,15);ctx.fillStyle='#111';ctx.fillRect(boss.x+30,boss.y+53,14,14);ctx.fillRect(boss.x+boss.w-44,boss.y+53,14,14);ctx.fillRect(boss.x+40,boss.y+92,boss.w-80,9);ctx.fillStyle='#555';ctx.fillRect(boss.x,boss.y-15,boss.w,7);ctx.fillStyle='#d2b16a';ctx.fillRect(boss.x,boss.y-15,boss.w*boss.hp/boss.maxHp,7)}
    if(!(p.inv>0&&Math.floor(p.inv/6)%2===0)){ctx.fillStyle='#eee';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#d0a15c';ctx.fillRect(p.x+4,p.y+6,17,7);ctx.fillStyle='#171717';ctx.fillRect(p.x+6,p.y+23,4,4);ctx.fillRect(p.x+16,p.y+23,4,4);ctx.fillRect(p.x+6,p.y+31,14,4);if(Math.abs(p.vx)>.2){ctx.fillRect(p.x+3,p.y+p.h-1,7,4);ctx.fillRect(p.x+15,p.y+p.h-1,7,4)}}
    for(const q of particles){ctx.fillStyle=q.type==='coin'?'#d9b55f':q.type==='cp'?'#eee':q.type==='boss'?'#fff':'#d8c7a9';ctx.fillRect(q.x,q.y,5,5)}
    ctx.fillStyle='#eee';ctx.fillRect(G.world-150,370,8,100);ctx.fillStyle='#d2b16a';ctx.beginPath();ctx.moveTo(G.world-142,370);ctx.lineTo(G.world-85,388);ctx.lineTo(G.world-142,407);ctx.fill();ctx.restore();
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(15,15,280,42);ctx.fillStyle='#fff';ctx.font='12px DM Sans';ctx.fillText(`SCORE ${score}   COINS ${coins}`,28,33);ctx.fillText(`DISTANCE ${Math.floor(p.x/100)}m`,28,49);
    if(paused||!running){ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='500 32px Playfair Display';ctx.fillText(won?'LEVEL COMPLETE':paused?'PAUSED':'READY',W/2,H/2);ctx.font='12px DM Sans';ctx.fillText(won?'Choose another level or continue.':paused?'Press Play to continue.':'Press Play to start.',W/2,H/2+28);ctx.textAlign='left'}
  }
  function loop(t){const dt=Math.min(2.2,(t-last)/16.67||1);last=t;if(running&&!paused)update(dt);draw();requestAnimationFrame(loop)}
  function keyDown(e){if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','d','w','A','D','W'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')keys.left=true;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')keys.right=true;if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'||e.key===' ')keys.jump=true}
  function keyUp(e){if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')keys.left=false;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')keys.right=false}
  addEventListener('keydown',keyDown);addEventListener('keyup',keyUp);
  document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();if(k==='jump')keys.jump=true;else keys[k]=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();if(k!=='jump')keys[k]=false}))});
  $('playBtn').onclick=()=>{if(!won){running=true;paused=false;sound('coin');updateButtons()}};$('pauseBtn').onclick=()=>{if(running){paused=!paused;updateButtons()}};$('restartBtn').onclick=()=>loadLevel(level);
  loadLevel(1);requestAnimationFrame(loop);
})();

'use strict';
/* ---------- audio: click sounds ---------- */
var AU={ctx:null,sfxBus:null,musBus:null,sfxOn:true,vol:.55,cur:null,playing:false,R:null,last:0};
var PREF_KEY='bx_prefs';
function loadPrefs(){try{var p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');if(typeof p.sfx==='boolean')AU.sfxOn=p.sfx;if(typeof p.vol==='number')AU.vol=p.vol;if(typeof p.track==='string')AU.cur=p.track;if(typeof p.season==='string'&&SEASONS[p.season])SEASON=p.season}catch(e){}}
function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify({sfx:AU.sfxOn,vol:AU.vol,track:AU.cur,season:SEASON}))}catch(e){}
  if(typeof pushSettings==='function') pushSettings({sfx_on:AU.sfxOn,volume:AU.vol,focus_track:(['lofi','box','rain','ocean','forest','pad'].indexOf(AU.cur)>-1?AU.cur:null)});}
function ac(){
  if(!AU.ctx){
    var C=window.AudioContext||window.webkitAudioContext;
    if(!C) return null;
    try{
      AU.ctx=new C();
      AU.sfxBus=AU.ctx.createGain();AU.sfxBus.gain.value=.55;AU.sfxBus.connect(AU.ctx.destination);
      AU.musBus=AU.ctx.createGain();AU.musBus.gain.value=AU.vol;AU.musBus.connect(AU.ctx.destination);
    }catch(e){AU.ctx=null;return null}
  }
  if(AU.ctx.state==='suspended') AU.ctx.resume();
  return AU.ctx;
}
function tone(f,d,type,v,when,to,dest){
  var c=ac();if(!c) return;
  var t=c.currentTime+Math.max(0,when||0),o=c.createOscillator(),g=c.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f,t);
  if(to) o.frequency.exponentialRampToValueAtTime(to,t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.12,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g);g.connect(dest||AU.sfxBus);o.start(t);o.stop(t+d+.05);
}
var SFX={
  pop:function(){tone(520+Math.random()*140,.1,'sine',.14,0,900)},
  toggle:function(){tone(520,.08,'sine',.13);tone(780,.11,'sine',.13,.07)},
  add:function(){tone(660,.1,'sine',.13,0,990);tone(990,.15,'triangle',.1,.09)},
  success:function(){[523,659,784,1047].forEach(function(f,i){tone(f,.3,'triangle',.15,i*.09)})},
  coin:function(){tone(988,.09,'square',.05);tone(1319,.4,'square',.05,.08)},
  bloom:function(){[392,494,587,784,988].forEach(function(f,i){tone(f,.5,'sine',.11,i*.1)})},
  chime:function(){[784,988,1175,1568].forEach(function(f,i){tone(f,.9,'sine',.12,i*.16)})},
  error:function(){tone(240,.2,'sine',.13,0,170)},
  meow:function(){tone(720,.16,'sine',.13,0,1050);tone(1050,.24,'sine',.11,.14,560)},
  woof:function(){tone(260,.1,'sawtooth',.09,0,150);tone(240,.12,'sawtooth',.09,.15,140)},
  squeak:function(){tone(1250,.07,'sine',.11,0,1600);tone(1500,.09,'sine',.09,.09,1900)},
  ribbit:function(){tone(190,.1,'square',.06,0,120);tone(210,.12,'square',.06,.14,130)},
  munch:function(){tone(300,.05,'triangle',.12,0,200);tone(280,.05,'triangle',.12,.1,190);tone(300,.05,'triangle',.12,.2,200)}
};
function sfx(n){if(!AU.sfxOn) return;try{SFX[n]()}catch(e){}}

/* ---------- audio: focus music (all generated in the browser) ---------- */
function noiseBuf(c,kind){
  var n=c.sampleRate*4,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0),last=0;
  for(var i=0;i<n;i++){var w=Math.random()*2-1;if(kind==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.2}else d[i]=w*.6}
  return b;
}
function makeReg(c){
  var R={src:[],ivs:[],dead:false,out:c.createGain()};
  R.out.gain.value=0;R.out.connect(AU.musBus);
  R.osc=function(type,f){var o=c.createOscillator();o.type=type;o.frequency.value=f;R.src.push(o);return o};
  R.noise=function(kind){var s=c.createBufferSource();s.buffer=noiseBuf(c,kind);s.loop=true;R.src.push(s);return s};
  R.every=function(fn,ms,jit){var run=function(){if(R.dead) return;fn();setTimeout(run,ms+(jit?Math.random()*jit:0))};setTimeout(run,ms/2)};
  R.iv=function(fn,ms){R.ivs.push(setInterval(fn,ms))};
  R.start=function(){R.src.forEach(function(s){s.start()});var t=c.currentTime;R.out.gain.setValueAtTime(0,t);R.out.gain.linearRampToValueAtTime(1,t+1.6)};
  R.stop=function(){
    R.dead=true;R.ivs.forEach(clearInterval);
    var t=c.currentTime;R.out.gain.cancelScheduledValues(t);R.out.gain.setValueAtTime(R.out.gain.value,t);R.out.gain.linearRampToValueAtTime(0,t+.7);
    setTimeout(function(){R.src.forEach(function(s){try{s.stop()}catch(e){}});try{R.out.disconnect()}catch(e){}},900);
  };
  return R;
}
function kface(cx,cy){return '<ellipse cx="'+(cx-4)+'" cy="'+cy+'" rx="1.2" ry="1.5" fill="#3A2A2A"/><ellipse cx="'+(cx+4)+'" cy="'+cy+'" rx="1.2" ry="1.5" fill="#3A2A2A"/><path d="M'+(cx-2.2)+' '+(cy+3.4)+'q2.2 2 4.4 0" stroke="#3A2A2A" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="'+(cx-7)+'" cy="'+(cy+3)+'" rx="2" ry="1.2" fill="#FF9FB5" opacity=".8"/><ellipse cx="'+(cx+7)+'" cy="'+(cy+3)+'" rx="2" ry="1.2" fill="#FF9FB5" opacity=".8"/>'}
var TRACKS=[
  {id:'lofi',name:'Cozy lo-fi',desc:'Soft keys, lazy beat',
    icon:'<svg viewBox="0 0 32 32"><path d="M9 8c-1-1.6 1-2.6 0-4.4M15 8c-1-1.6 1-2.6 0-4.4" stroke="#B5C4BB" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M5 11h17v8a7.5 7.5 0 0 1-7.5 7.5h-2A7.5 7.5 0 0 1 5 19z" fill="#F6C9A0"/><path d="M22 13h2.6a3.6 3.6 0 0 1 0 7.2H22" stroke="#F6C9A0" stroke-width="2.6" fill="none"/>'+kface(13.5,18)+'</svg>',
    build:function(c,R){
      var beat=60/72,chords=[[146.8,174.6,220,261.6],[98,123.5,146.8,174.6],[130.8,164.8,196,246.9],[110,130.8,164.8,196]];
      var lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;lp.connect(R.out);
      var cr=R.noise('white'),chp=c.createBiquadFilter(),cg=c.createGain();chp.type='highpass';chp.frequency.value=4500;cg.gain.value=.01;cr.connect(chp);chp.connect(cg);cg.connect(R.out);
      var nb=noiseBuf(c,'white');
      function hit(t,freq,kind,vol,dur){
        var s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),T=c.currentTime+Math.max(0,t);
        s.buffer=nb;f.type=kind;f.frequency.value=freq;g.gain.setValueAtTime(vol,T);g.gain.exponentialRampToValueAtTime(.0001,T+dur);
        s.connect(f);f.connect(g);g.connect(R.out);s.start(T,Math.random()*3);s.stop(T+dur+.02);
      }
      function key(f,t,d){tone(f,d,'sine',.07,t,null,lp);tone(f*2,d*.6,'triangle',.02,t,null,lp)}
      var nextT=c.currentTime+.2,step=0;
      function sched(){
        if(R.dead) return;
        while(nextT<c.currentTime+.4){
          var bar=Math.floor(step/8)%4,s=step%8,t=nextT-c.currentTime+(s%2?beat*.06:0);
          if(s===0) chords[bar].forEach(function(f,i){key(f,t+i*.03,beat*3.2)});
          if((s===3||s===5)&&Math.random()<.45) key(chords[bar][Math.floor(Math.random()*4)]*2,t,beat*1.4);
          if(s===0||s===4) tone(130,.2,'sine',.24,t,45,R.out);
          if(s===2||s===6) hit(t,1800,'bandpass',.05,.09);
          if(s%2===1) hit(t,7500,'highpass',.03,.04);
          nextT+=beat/2;step++;
        }
      }
      R.iv(sched,120);sched();
    }},
  {id:'box',name:'Music box',desc:'Tiny twinkly bells',
    icon:'<svg viewBox="0 0 32 32"><path d="M16 3l3.6 7.6 8.2 1-6 5.7 1.6 8.2L16 21.4 8.6 25.5l1.6-8.2-6-5.7 8.2-1z" fill="#FFD25E" stroke="#F2B640" stroke-width="1.4" stroke-linejoin="round"/>'+kface(16,15)+'</svg>',
    build:function(c,R){
      var del=c.createDelay(1),fb=c.createGain(),wet=c.createGain(),bus=c.createGain();
      del.delayTime.value=.42;fb.gain.value=.38;wet.gain.value=.5;
      del.connect(fb);fb.connect(del);del.connect(wet);wet.connect(R.out);bus.connect(R.out);bus.connect(del);
      var sc=[523.25,587.33,659.25,783.99,880,1046.5,1174.66],pos=2;
      R.every(function(){
        pos=clamp(pos+Math.floor(Math.random()*5)-2,0,sc.length-1);
        tone(sc[pos],1.8,'sine',.09,0,null,bus);tone(sc[pos]*2,.9,'triangle',.025,0,null,bus);
        if(Math.random()<.25) tone(sc[pos]/2,2,'sine',.06,.15,null,bus);
      },700,900);
    }},
  {id:'rain',name:'Soft rain',desc:'Cozy window rain',
    icon:'<svg viewBox="0 0 32 32"><path d="M9 20a5.5 5.5 0 0 1 .8-10.9A7 7 0 0 1 23.3 10 5 5 0 0 1 23 20z" fill="#BFDDF5"/><path d="M11 23l-1.2 3M17 23l-1.2 3M23 23l-1.2 3" stroke="#5FA8E6" stroke-width="2" stroke-linecap="round"/>'+kface(16,14.5)+'</svg>',
    build:function(c,R){
      var w=R.noise('white'),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),g=c.createGain();
      hp.type='highpass';hp.frequency.value=900;lp.type='lowpass';lp.frequency.value=7000;g.gain.value=.2;
      w.connect(hp);hp.connect(lp);lp.connect(g);g.connect(R.out);
      var b=R.noise('brown'),bl=c.createBiquadFilter(),bg=c.createGain();bl.type='lowpass';bl.frequency.value=260;bg.gain.value=.45;b.connect(bl);bl.connect(bg);bg.connect(R.out);
      R.every(function(){tone(2000+Math.random()*1800,.05,'sine',.02,0,null,R.out)},160,380);
    }},
  {id:'ocean',name:'Ocean waves',desc:'Slow rolling shore',
    icon:'<svg viewBox="0 0 32 32"><path d="M3 15c3-4 5-4 8 0s5 4 8 0 5-4 8 0v13H3z" fill="#7DC4F0"/><path d="M3 15c3-4 5-4 8 0s5 4 8 0 5-4 8 0" stroke="#B5E3FC" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+kface(16,21)+'</svg>',
    build:function(c,R){
      var n=R.noise('brown'),lp=c.createBiquadFilter(),g=c.createGain(),lfo=R.osc('sine',.09),lg=c.createGain();
      lp.type='lowpass';lp.frequency.value=800;g.gain.value=.42;lg.gain.value=.3;lfo.connect(lg);lg.connect(g.gain);n.connect(lp);lp.connect(g);g.connect(R.out);
      var w=R.noise('white'),hp=c.createBiquadFilter(),wg=c.createGain(),l2=R.osc('sine',.11),l2g=c.createGain();
      hp.type='highpass';hp.frequency.value=2600;wg.gain.value=.05;l2g.gain.value=.04;l2.connect(l2g);l2g.connect(wg.gain);w.connect(hp);hp.connect(wg);wg.connect(R.out);
    }},
  {id:'forest',name:'Forest birds',desc:'Breeze and chirps',
    icon:'<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="10.5" fill="#FFE08A"/><path d="M26 16.5l4.2 1.8-4.2 1.8z" fill="#F29C4B"/><path d="M14 6.5c0-2 2-3 3-1.5" stroke="#4FA36A" stroke-width="2" fill="none" stroke-linecap="round"/>'+kface(15,16)+'</svg>',
    build:function(c,R){
      var n=R.noise('brown'),lp=c.createBiquadFilter(),g=c.createGain(),lfo=R.osc('sine',.05),lg=c.createGain();
      lp.type='lowpass';lp.frequency.value=480;g.gain.value=.22;lg.gain.value=.1;lfo.connect(lg);lg.connect(g.gain);n.connect(lp);lp.connect(g);g.connect(R.out);
      R.every(function(){
        var k=2+Math.floor(Math.random()*3),base=2400+Math.random()*1400;
        for(var i=0;i<k;i++) tone(base+i*120,.09,'sine',.04,i*.13,base+700+i*120,R.out);
      },1800,3500);
    }},
  {id:'pad',name:'Dreamy pad',desc:'Warm floating hum',
    icon:'<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#D7C8FF"/><circle cx="23" cy="9.5" r="2.6" fill="#C2B0F5"/><circle cx="8.5" cy="20" r="2" fill="#C2B0F5"/>'+kface(16,15)+'</svg>',
    build:function(c,R){
      var chords=[[110,164.8,220,261.6],[87.3,130.8,174.6,220],[130.8,196,261.6,329.6],[98,146.8,196,246.9]];
      var lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=650;lp.Q.value=.7;lp.connect(R.out);
      var lfo=R.osc('sine',.07),lg=c.createGain();lg.gain.value=220;lfo.connect(lg);lg.connect(lp.frequency);
      var oscs=[];
      chords[0].forEach(function(f,i){[-6,6].forEach(function(dt){var o=R.osc('sawtooth',f),g=c.createGain();o.detune.value=dt;g.gain.value=.05;o.connect(g);g.connect(lp);oscs.push([o,i])})});
      var ci=0;
      R.every(function(){ci=(ci+1)%chords.length;var t=c.currentTime;oscs.forEach(function(p){p[0].frequency.setTargetAtTime(chords[ci][p[1]],t,1.6)})},9000);
    }}
];
function playTrack(id){
  var c=ac();
  if(!c){toast('Sound is not available in this browser.');return}
  var tr=TRACKS.filter(function(t){return t.id===id})[0];if(!tr) return;
  stopMusic(true);
  var R=makeReg(c);
  try{tr.build(c,R);R.start()}catch(e){toast('That sound could not start.');return}
  AU.R=R;AU.cur=id;AU.playing=true;savePrefs();renderDock();
}
function stopMusic(silent){
  if(AU.R){AU.R.stop();AU.R=null}
  AU.playing=false;
  if(!silent) renderDock();
}
function setVol(v){AU.vol=clamp(v,0,1);if(AU.musBus) AU.musBus.gain.value=AU.vol;savePrefs()}

/* focus timer */
var FT={mins:25,end:0,run:false,iv:null};
function ftFmt(ms){var s=Math.max(0,Math.round(ms/1000));return pad(Math.floor(s/60))+':'+pad(s%60)}
function ftStart(){FT.end=Date.now()+FT.mins*60000;FT.run=true;clearInterval(FT.iv);FT.iv=setInterval(ftTick,1000);renderDock()}
function ftStop(){FT.run=false;clearInterval(FT.iv);renderDock()}
function ftTick(){
  var left=FT.end-Date.now();
  if(left<=0){
    FT.run=false;clearInterval(FT.iv);sfx('chime');burst(innerWidth-60,innerHeight-80,14);
    toast('Focus session complete. Time for a little stretch!');renderDock();return;
  }
  $$('[data-ft]').forEach(function(el){el.textContent=ftFmt(left)});
}

/* focus room dock */
var DK={open:false};
var HEADPHONES='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 24v-4a12 12 0 0 1 24 0v4" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><rect x="5" y="22" width="8" height="13" rx="4" fill="#fff"/><rect x="27" y="22" width="8" height="13" rx="4" fill="#fff"/><path d="M20 28c-3-2-4.4-3.6-4.4-5.2a2.3 2.3 0 0 1 4.4-1 2.3 2.3 0 0 1 4.4 1c0 1.6-1.4 3.2-4.4 5.2z" fill="#fff"/></svg>';
function dockPanel(left){
  return '<section class="focuspan" role="dialog" aria-label="Focus room">'+
  '<div class="fp-head"><div class="fp-mascot">'+mascot({phones:true,mood:AU.playing?'cheer':'happy'})+'</div><div><h2>Focus room</h2><p class="hint">Pick a sound and settle in.</p></div><button class="iconbtn" data-act="dockclose" data-fk="close" aria-label="Close focus room">&times;</button></div>'+
  '<div class="tracks">'+TRACKS.map(function(t){
    var on=AU.playing&&AU.cur===t.id;
    return '<button class="strk'+(AU.cur===t.id?' sel':'')+(on?' playing':'')+'" data-act="track" data-id="'+t.id+'" data-fk="t-'+t.id+'" aria-pressed="'+on+'"><span class="ti">'+t.icon+'</span><span><b>'+t.name+'</b><small>'+t.desc+'</small></span></button>';
  }).join('')+'</div>'+
  '<div class="fp-ctrl"><button class="btn primary" data-act="ptoggle" data-fk="pt">'+(AU.playing?'Pause':'Play')+'</button><label class="vol"><span>Volume</span><input type="range" id="vol" min="0" max="100" value="'+Math.round(AU.vol*100)+'"></label></div>'+
  '<div class="fp-timer"><h3>Focus timer</h3><div class="pills" role="group" aria-label="Session length">'+[15,25,45].map(function(m){return '<button class="pill" data-act="ftime" data-m="'+m+'" data-fk="m'+m+'" aria-pressed="'+(FT.mins===m)+'"'+(FT.run?' disabled':'')+'>'+m+' min</button>'}).join('')+'</div>'+
  '<div class="ftrow"><span class="ftime" data-ft>'+ftFmt(left)+'</span>'+(FT.run?'<button class="btn small" data-act="fstop" data-fk="fs">Stop</button>':'<button class="btn small primary" data-act="fstart" data-fk="fs">Start</button>')+'</div></div>'+
  '<label class="check" style="margin:14px 0 0"><input type="checkbox" id="sfxToggle"'+(AU.sfxOn?' checked':'')+'><span>Cute click sounds</span></label>'+
  '<p class="fp-note">Every sound is made live in your browser, so there is nothing to download.</p></section>';
}
function renderDock(){
  var d=$('#dock');if(!d) return;
  if(!S||!S.loggedIn){d.innerHTML='';return}
  var fk=document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.fk:null;
  var left=FT.run?FT.end-Date.now():FT.mins*60000;
  d.innerHTML=(DK.open?dockPanel(left):'')+
    '<button class="dockbtn'+(AU.playing?' on':'')+'" data-act="dock" data-fk="dock" aria-expanded="'+DK.open+'" aria-label="Focus room: music and timer">'+HEADPHONES+(AU.playing?'<span class="notes-float"><i>&#9834;</i><i>&#9835;</i></span>':'')+(FT.run?'<span class="dockt" data-ft>'+ftFmt(left)+'</span>':'')+'</button>';
  if(fk){var n=d.querySelector('[data-fk="'+fk+'"]');if(n) n.focus()}
}


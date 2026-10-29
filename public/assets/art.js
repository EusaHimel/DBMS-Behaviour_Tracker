'use strict';
/* shared palettes and prices (used while this file loads) */
var SEASON_PRICE={classic:0,summer:50,spring:100,fall:150,winter:200};
var FLOWER_COLORS=['#E8779B','#F29C4B','#EF6C8E','#F5C242','#C98BE8'];
var TREE_COLORS=[['#7B5CD6','#9C82EA','#5B3FB5'],['#C160C8','#DC8AE0','#9A43A3'],['#E56FA2','#F3A0C4','#C24B84']];
/* ---------- plant art ---------- */
function plantSVG(kind,v,wilted){
  v=v||0;
  var body='';
  if(kind==='grass'){
    body='<path d="M40 116C40 102 36 92 30 84C42 88 46 100 47 116Z" fill="var(--plant-leaf)"/><path d="M47 116C47 96 50 80 54 68C58 82 56 100 54 116Z" fill="var(--plant-leaf-2)"/><path d="M54 116C56 102 62 92 72 88C68 98 62 106 60 116Z" fill="var(--plant-leaf)"/>';
  } else if(kind==='sprout'){
    body='<path d="M50 116C50 104 51 96 50 88" stroke="var(--plant-stem)" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M50 92C36 92 26 82 24 68C40 66 50 76 50 92Z" fill="var(--plant-leaf)"/><path d="M50 86C62 84 74 74 76 60C60 58 50 68 50 86Z" fill="var(--plant-leaf-2)"/>';
  } else if(kind==='flower'){
    var fc=SEASONS[SEASON].flowers,col=fc[v%fc.length], petals='';
    for(var k=0;k<5;k++) petals+='<ellipse cx="50" cy="38" rx="9" ry="14" transform="rotate('+(k*72)+' 50 52)" fill="'+col+'"/>';
    body='<path d="M50 116C48 100 52 84 50 60" stroke="var(--plant-stem)" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M50 100C36 100 26 92 24 80C38 78 48 86 50 100Z" fill="var(--plant-leaf)"/><path d="M50 90C62 90 72 82 74 70C60 68 51 76 50 90Z" fill="var(--plant-leaf-2)"/>'+petals+'<circle cx="50" cy="52" r="7" fill="#F5C242"/>';
  } else {
    var tc=SEASONS[SEASON].trees,c=tc[v%tc.length];
    body='<path d="M44 116C46 102 47 86 46 66L54 66C53 86 54 102 56 116Z" fill="var(--trunk)"/><path d="M50 88C57 84 63 80 67 73" stroke="var(--trunk)" stroke-width="3" fill="none" stroke-linecap="round"/>'+
      '<circle cx="30" cy="54" r="17" fill="'+c[2]+'"/><circle cx="70" cy="54" r="17" fill="'+c[2]+'"/><circle cx="50" cy="60" r="15" fill="'+c[2]+'"/>'+
      '<circle cx="50" cy="38" r="24" fill="'+c[0]+'"/><circle cx="32" cy="48" r="15" fill="'+c[0]+'"/><circle cx="68" cy="48" r="15" fill="'+c[0]+'"/>'+
      '<circle cx="42" cy="28" r="12" fill="'+c[1]+'"/><circle cx="63" cy="26" r="11" fill="'+c[1]+'"/><circle cx="29" cy="44" r="7" fill="'+c[1]+'"/>'+
      '<g fill="#fff" fill-opacity=".75"><circle cx="40" cy="40" r="2"/><circle cx="58" cy="36" r="2"/><circle cx="70" cy="50" r="2"/><circle cx="26" cy="56" r="2"/><circle cx="52" cy="54" r="2"/></g>'+
      '<g stroke="'+c[1]+'" stroke-width="1.4" stroke-linecap="round"><path d="M28 68v10M72 68v8M40 72v9M60 72v10"/></g>'+
      '<g fill="'+c[1]+'"><circle cx="28" cy="80" r="3"/><circle cx="72" cy="78" r="3"/><circle cx="40" cy="83" r="3"/><circle cx="60" cy="84" r="3"/></g>';
  }
  var face='';
  if(kind==='flower') face='<circle cx="47.6" cy="51" r="1.1" fill="#3A2A2A"/><circle cx="52.4" cy="51" r="1.1" fill="#3A2A2A"/><path d="M48.3 54q1.7 1.7 3.4 0" stroke="#3A2A2A" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="45.6" cy="54" r="1.3" fill="#FF8FB1" opacity=".7"/><circle cx="54.4" cy="54" r="1.3" fill="#FF8FB1" opacity=".7"/>';
  else if(kind==='tree') face='<circle cx="43" cy="45" r="1.9" fill="#3A2A2A"/><circle cx="57" cy="45" r="1.9" fill="#3A2A2A"/><path d="M46.5 49.5q3.5 3.4 7 0" stroke="#3A2A2A" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="39" cy="49" rx="3" ry="1.8" fill="#FF9FBF" opacity=".75"/><ellipse cx="61" cy="49" rx="3" ry="1.8" fill="#FF9FBF" opacity=".75"/>';
  else face='<ellipse cx="50" cy="113" rx="15" ry="6.5" fill="#9B7350"/><circle cx="45" cy="112" r="1.5" fill="#3A2A2A"/><circle cx="55" cy="112" r="1.5" fill="#3A2A2A"/><path d="M47.5 114.6q2.5 2 5 0" stroke="#3A2A2A" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="41.5" cy="115" rx="2" ry="1.1" fill="#FFAFC4" opacity=".8"/><ellipse cx="58.5" cy="115" rx="2" ry="1.1" fill="#FFAFC4" opacity=".8"/>';
  if(wilted){
    face='<path d="M45 111q5-4 10 0" stroke="#5A4A3A" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    body='<g transform="rotate(-7 50 100)" style="filter:saturate(.35) grayscale(.4) brightness(.85)">'+body+'</g>'+
      '<ellipse cx="34" cy="114" rx="5" ry="2.6" fill="#9A7A4E" opacity=".8"/><ellipse cx="66" cy="115" rx="5" ry="2.4" fill="#9A7A4E" opacity=".8"/>';
  }
  return '<svg viewBox="0 0 100 120" aria-hidden="true" focusable="false"><ellipse cx="50" cy="116" rx="22" ry="4" fill="rgba(0,0,0,.16)"/>'+body+face+'</svg>';
}
function birdSVG(){
  return '<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M16 22L2 15L14 29Z" fill="#2B67A3"/><ellipse cx="28" cy="24" rx="14" ry="9" fill="#3B82C4"/><ellipse cx="30" cy="28" rx="9" ry="4" fill="#EAF4FB"/><circle cx="42" cy="17" r="7" fill="#3B82C4"/><path d="M48 17L58 20L48 23Z" fill="#F2A33A"/><circle cx="44" cy="15.5" r="1.7" fill="#fff"/><circle cx="44.4" cy="15.5" r=".8" fill="#14251D"/><path class="wing" d="M24 22C20 8 34 6 38 18C32 20 28 22 24 22Z" fill="#7DB8EA"/></svg>';
}
function butterflySVG(){
  var w='<path d="M25 20C14 4 2 8 4 20C6 30 18 28 25 20Z" fill="#F29C4B"/><path d="M25 22C16 34 8 38 12 30C14 26 20 24 25 22Z" fill="#F6C36A"/><circle cx="12" cy="17" r="2.5" fill="#fff" fill-opacity=".7"/>';
  return '<svg viewBox="0 0 50 40" aria-hidden="true"><g class="wl">'+w+'</g><g transform="translate(50 0) scale(-1 1)"><g class="wr">'+w+'</g></g><rect x="24" y="12" width="2" height="18" rx="1" fill="#14251D"/></svg>';
}
function beeSVG(){
  return '<svg viewBox="0 0 46 34" aria-hidden="true">'+
    '<ellipse class="wl" cx="16" cy="12" rx="11" ry="7" fill="#EAF6FF" opacity=".75" transform="rotate(-18 16 12)"/>'+
    '<ellipse class="wr" cx="30" cy="12" rx="11" ry="7" fill="#EAF6FF" opacity=".75" transform="rotate(18 30 12)"/>'+
    '<ellipse cx="23" cy="20" rx="12" ry="8.5" fill="#2A2320"/>'+
    '<path d="M13 20a12 8.5 0 0 1 20 0Z" fill="#F5C842"/>'+
    '<path d="M14 20h18M15.5 24h15" stroke="#2A2320" stroke-width="2.6"/>'+
    '<circle cx="14.5" cy="16.5" r="3" fill="#2A2320"/><circle cx="13.6" cy="15.6" r=".9" fill="#fff"/>'+
    '<path d="M12 13.5q-2-3 .5-4.6M17 13.5q1-3.4 3.6-3.6" stroke="#2A2320" stroke-width="1.1" fill="none" stroke-linecap="round"/>'+
    '</svg>';
}

/* ---------- difficulty and coins ---------- */
function isOverdue(t){return t.status==='pending'&&t.deadline<Date.now()}

function mascot(o){
  o=o||{};
  var mood=o.mood||'happy',id=uid();
  var eyes=mood==='sleepy'?'<path d="M43 66q6 5 12 0M65 66q6 5 12 0" stroke="#2A3B33" stroke-width="3" fill="none" stroke-linecap="round"/>':
    '<g class="eyes"><ellipse cx="49" cy="66" rx="4.6" ry="5.6" fill="#2A3B33"/><ellipse cx="71" cy="66" rx="4.6" ry="5.6" fill="#2A3B33"/><circle cx="50.7" cy="63.8" r="1.7" fill="#fff"/><circle cx="72.7" cy="63.8" r="1.7" fill="#fff"/></g>';
  var mouth=mood==='cheer'?'<path d="M52 76q8 11 16 0z" fill="#E8577D" stroke="#2A3B33" stroke-width="2.4" stroke-linejoin="round"/>':'<path d="M54 76q6 6 12 0" stroke="#2A3B33" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  var phones=o.phones?'<path d="M27 74C24 50 40 38 60 38S96 50 93 74" stroke="#E8779B" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="19" y="64" width="14" height="24" rx="7" fill="#F08DAE"/><rect x="87" y="64" width="14" height="24" rx="7" fill="#F08DAE"/>':'';
  return '<svg class="mascot" viewBox="0 0 120 130" role="img" aria-label="Sprig, the BehavioralX sprout mascot">'+
    '<ellipse cx="60" cy="122" rx="30" ry="5" fill="rgba(0,0,0,.14)"/>'+
    '<path d="M60 44V32" stroke="#2F7A4B" stroke-width="4" stroke-linecap="round"/>'+
    '<g class="leaves"><path d="M60 36C50 34 40 26 40 14C52 14 60 22 60 36Z" fill="#4FA36A"/><path d="M60 36C70 32 82 24 82 10C68 10 60 20 60 36Z" fill="#6DBA82"/></g>'+
    '<path d="M24 84C24 58 40 44 60 44S96 58 96 84C96 106 80 118 60 118S24 106 24 84Z" fill="#C9F1D8"/>'+
    '<ellipse cx="41" cy="58" rx="8" ry="4" fill="#fff" opacity=".55" transform="rotate(-28 41 58)"/>'+
    '<path d="M26 92q-9 4-8 13M94 92q9 4 8 13" stroke="#A6E3BE" stroke-width="7" stroke-linecap="round" fill="none"/>'+
    '<ellipse cx="37" cy="77" rx="6.5" ry="4.2" fill="#FFB3C7"/><ellipse cx="83" cy="77" rx="6.5" ry="4.2" fill="#FFB3C7"/>'+
    eyes+mouth+phones+'</svg>';
}
function emptyHTML(msg,mood){return '<div class="empty cute"><span class="mini-m">'+mascot({mood:mood||'happy'})+'</span><p>'+msg+'</p></div>'}
function burst(x,y,n){
  if(REDUCED) return;
  var cols=['#F08DAE','#FFD25E','#7EE0A6','#9C82EA','#7DC4F0'];
  var shapes=[
    function(c){return '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 21C5 15.5 3 12 3 8.8A4.8 4.8 0 0 1 12 6.5 4.8 4.8 0 0 1 21 8.8C21 12 19 15.5 12 21z" fill="'+c+'"/></svg>'},
    function(c){return '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2.5l2.9 6.3 6.8.8-5 4.7 1.3 6.8L12 17.8 6 21.1l1.3-6.8-5-4.7 6.8-.8z" fill="'+c+'"/></svg>'},
    function(c){return '<svg viewBox="0 0 24 24" width="18" height="18"><ellipse cx="12" cy="12" rx="5" ry="10" fill="'+c+'" transform="rotate(35 12 12)"/></svg>'}
  ];
  n=n||16;
  for(var i=0;i<n;i++){
    var p=document.createElement('i'),a=Math.random()*Math.PI*2,r=60+Math.random()*100;
    p.className='fxp';
    p.style.cssText='--x:'+x+'px;--y:'+y+'px;--dx:'+(Math.cos(a)*r).toFixed(0)+'px;--dy:'+(Math.sin(a)*r-40).toFixed(0)+'px;--r:'+Math.round(Math.random()*360-180)+'deg;animation-delay:'+(Math.random()*.1).toFixed(2)+'s';
    p.innerHTML=shapes[i%3](cols[i%cols.length]);
    document.body.appendChild(p);
    (function(el){setTimeout(function(){el.remove()},1300)})(p);
  }
}
/* ---------- seasons ---------- */
var SEASON='classic';
var SEASONS={
  classic:{name:'Classic meadow',blurb:'Fresh green and calm.',sw:['#BFE3F5','#7BBF8B','#5FAE72'],trees:TREE_COLORS,flowers:FLOWER_COLORS,fx:null,
    icon:'<svg viewBox="0 0 32 32"><path d="M16 28V16" stroke="#3E9A63" stroke-width="2.6" stroke-linecap="round"/><path d="M16 18C9 18 6 13 6 7c7 0 10 4 10 11z" fill="#4FA36A"/><path d="M16 21c6 0 9-4 9-9-6 0-9 3-9 9z" fill="#7BCB92"/></svg>'},
  spring:{name:'Spring blossom',blurb:'Pink petals in the breeze.',sw:['#CDEBFA','#93D6A0','#74C688'],
    trees:[['#F3A0C4','#FBC7DC','#D9799F'],['#E98FB8','#F7BBD3','#C96690'],['#F8B9CF','#FDDDE8','#DA85A5']],
    flowers:['#F08DAE','#FFB3C7','#C98BE8','#FFD25E','#8FD3F4'],fx:{kind:'petal',dir:'down',cols:['#FFB3C7','#FFD1E0','#F08DAE']},
    icon:'<svg viewBox="0 0 32 32"><g fill="#F59BBB"><circle cx="16" cy="7.5" r="5"/><circle cx="24.5" cy="13.5" r="5"/><circle cx="21.2" cy="23.5" r="5"/><circle cx="10.8" cy="23.5" r="5"/><circle cx="7.5" cy="13.5" r="5"/></g><circle cx="16" cy="16.5" r="4.2" fill="#FFD25E"/></svg>'},
  summer:{name:'Sunny summer',blurb:'Bright skies and bubbles.',sw:['#78CFF5','#5DB95C','#4CAE4C'],
    trees:[['#3FA55A','#67C37B','#2C7F44'],['#FFC24B','#FFDD88','#E29A1F'],['#4DB56C','#7DD08C','#358F52']],
    flowers:['#FF6B6B','#FFD25E','#FF9F43','#4FC3F7','#F06292'],fx:{kind:'bubble',dir:'up',cols:['#5ABEF0']},
    icon:'<svg viewBox="0 0 32 32"><g stroke="#F2A93B" stroke-width="2.6" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g><circle cx="16" cy="16" r="7.5" fill="#FFD25E"/></svg>'},
  fall:{name:'Cozy fall',blurb:'Golden leaves drifting down.',sw:['#F4CFA4','#CE9245','#B58332'],
    trees:[['#E8833A','#F5A968','#C2621F'],['#D64F3C','#EE7C68','#A83A2B'],['#F2B640','#FAD57A','#CE8E1B']],
    flowers:['#E8833A','#D64F3C','#F2B640','#B9754B','#C77DBA'],fx:{kind:'leaf',dir:'down',cols:['#E8833A','#D64F3C','#F2B640','#B9754B']},
    icon:'<svg viewBox="0 0 32 32"><path d="M5 27C5 12 13 4 28 4c0 15-8 23-23 23z" fill="#E8833A"/><path d="M6 26L22 10" stroke="#B9531A" stroke-width="1.8" stroke-linecap="round"/></svg>'},
  winter:{name:'Snowy winter',blurb:'Soft snow and frosty trees.',sw:['#CFE3F3','#D3E3F0','#DCE9F3'],
    trees:[['#DDEBF7','#FFFFFF','#B4CDE3'],['#BFD9EE','#EAF4FB','#94B8D6'],['#CFE3F1','#FFFFFF','#A5C3DB']],
    flowers:['#BFE3FA','#FFFFFF','#D7C8FF','#F08DAE','#9CCBF0'],fx:{kind:'snow',dir:'down',cols:['#FFFFFF']},
    icon:'<svg viewBox="0 0 32 32"><path d="M16 3v26M5 9.5l22 13M5 22.5l22-13" stroke="#7DB9E8" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="16" r="3" fill="#EAF4FB"/></svg>'}
};
function renderFall(){
  var f=$('#fall');if(!f) return;
  var cfg=SEASONS[SEASON].fx;
  if(!cfg||REDUCED){f.innerHTML='';f.className='';return}
  f.className=cfg.dir==='up'?'up':'';
  var h='';
  for(var i=0;i<14;i++){
    var s=8+Math.random()*9,col=cfg.cols[i%cfg.cols.length];
    var st='--l:'+(Math.random()*100).toFixed(1)+'%;--s:'+s.toFixed(0)+'px;--d:'+(9+Math.random()*9).toFixed(1)+'s;--dl:-'+(Math.random()*14).toFixed(1)+'s;--sw:'+(20+Math.random()*50).toFixed(0)+'px;';
    if(cfg.kind==='petal') st+='background:'+col+';border-radius:70% 0 70% 0;';
    else if(cfg.kind==='leaf') st+='background:'+col+';border-radius:0 85% 0 85%;';
    else if(cfg.kind==='snow') st+='background:#fff;border-radius:50%;box-shadow:0 0 5px rgba(125,175,225,.95);';
    else st+='border:2px solid rgba(90,190,240,.65);border-radius:50%;';
    h+='<i style="'+st+'"></i>';
  }
  f.innerHTML=h;
}
function applySeason(){document.documentElement.setAttribute('data-season',SEASON);renderFall()}
function setSeason(id){
  if(!SEASONS[id]) return;
  api('PUT','shop',{a:'season'},{season_id:id}).then(function(){applyChosenSeason(id,false)}).catch(apiFail);
}
function applyChosenSeason(id,quiet){
  SEASON=id;savePrefs();applySeason();render();sfx('bloom');burst(lastClick.x,lastClick.y,12);
  if(!quiet) toast(esc(SEASONS[id].name+' is on. Your garden changed with the season.'));
}
function unlockSeason(id){
  if(S.unlockedSeasons.indexOf(id)>-1) return;
  api('POST','shop',{a:'unlock'},{season_id:id}).then(function(){
    S.unlockedSeasons.push(id);
    return refreshWallet().then(function(){applyChosenSeason(id,true);toast(esc(SEASONS[id].name+' unlocked!'))});
  }).catch(function(e){if(e.status===402) sfx('error');apiFail(e)});
}

/* ---------- pets: art ---------- */
var PET_KINDS={
  cat:{name:'Cat',price:300,sound:'meow',blurb:'Curious, cuddly, and loves fish.',names:['Mochi','Miso','Luna','Pudding','Bean'],
    variants:[{n:'Ginger',a:'#F4B268',b:'#D98F3F'},{n:'Cloud',a:'#F4F1EC',b:'#CFC8BD'},{n:'Shadow',a:'#5B5866',b:'#3F3D49'},{n:'Mist',a:'#B7BDCB',b:'#8F97AB'}]},
  dog:{name:'Dog',price:300,sound:'woof',blurb:'Loyal, bouncy, and loves treats.',names:['Biscuit','Waffles','Peanut','Noodle','Cookie'],
    variants:[{n:'Biscuit',a:'#E3B27A',b:'#B9803F'},{n:'Cocoa',a:'#9C6B45',b:'#6F4629'},{n:'Snow',a:'#F6F1EA',b:'#C9A57E'},{n:'Ash',a:'#B9BCC4',b:'#6E7180'}]},
  bunny:{name:'Bunny',price:350,sound:'squeak',blurb:'Soft, hoppy, and loves carrots.',names:['Clover','Marshmallow','Hazel','Puff','Nibbles'],
    variants:[{n:'Marshmallow',a:'#FBF7F5',b:'#E9DFDA'},{n:'Peach',a:'#F8CFB8',b:'#E7A98A'},{n:'Cocoa',a:'#B48A6A',b:'#8C6446'},{n:'Blush',a:'#F7C6D6',b:'#EAA0B8'}]},
  frog:{name:'Frog',price:250,sound:'ribbit',blurb:'Calm, bouncy, and loves crunchy bugs.',names:['Lily','Ribbit','Pebble','Bubbles','Jelly'],
    variants:[{n:'Lily',a:'#7DCB74',b:'#D9F2C4'},{n:'Mint',a:'#66D1B8',b:'#D5F7EE'},{n:'Sunny',a:'#C6D84F',b:'#F4F8C8'},{n:'Berry',a:'#8FA5F0',b:'#E0E7FF'}]}
};
function flw(cx,cy,c){var s='';for(var k=0;k<5;k++){var a=k*72*Math.PI/180;s+='<circle cx="'+(cx+Math.sin(a)*2.9).toFixed(1)+'" cy="'+(cy-Math.cos(a)*2.9).toFixed(1)+'" r="2.3" fill="'+c+'"/>'}return s+'<circle cx="'+cx+'" cy="'+cy+'" r="1.7" fill="#FFF3B0"/>'}
var HAT={
  party:'<path d="M50 3L37 27Q50 32 63 27Z" fill="#F08DAE"/><path d="M42 20q8 4 16 0M45 13q5 2.6 10 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="50" cy="4" r="3.4" fill="#FFD25E"/>',
  flowers:'<path d="M29 31Q50 12 71 31" stroke="#4FA36A" stroke-width="3.6" fill="none" stroke-linecap="round"/>'+flw(35,25,'#F08DAE')+flw(50,19.5,'#FFD25E')+flw(65,25,'#B9A0F5'),
  straw:'<ellipse cx="50" cy="26" rx="27" ry="6.5" fill="#F0CE84"/><path d="M36 25Q36 8 50 8Q64 8 64 25Z" fill="#F6DDA0"/><rect x="36" y="19" width="28" height="4.4" fill="#E8577D"/>',
  crown:'<path d="M34 27L36 9L43 18L50 6L57 18L64 9L66 27Z" fill="#FFD25E" stroke="#E0A82A" stroke-width="1.6" stroke-linejoin="round"/><circle cx="36" cy="9" r="2.2" fill="#F08DAE"/><circle cx="50" cy="6" r="2.4" fill="#7DC4F0"/><circle cx="64" cy="9" r="2.2" fill="#F08DAE"/>'
};
var FACE={
  glasses:'<g stroke="#4A3A2A" stroke-width="1.8" fill="rgba(255,255,255,.28)"><circle cx="41" cy="47" r="7.2"/><circle cx="59" cy="47" r="7.2"/></g><path d="M48.2 46.5q1.8-1.6 3.6 0" stroke="#4A3A2A" stroke-width="1.8" fill="none"/><path d="M34 46l-4-1.5M66 46l4-1.5" stroke="#4A3A2A" stroke-width="1.6" stroke-linecap="round"/>',
  shades:'<path d="M33 42h16v6a6.5 6.5 0 0 1-6.5 6.5h-3A6.5 6.5 0 0 1 33 48zM51 42h16v6a6.5 6.5 0 0 1-6.5 6.5h-3A6.5 6.5 0 0 1 51 48z" fill="#2A2320"/><path d="M49 44h2" stroke="#2A2320" stroke-width="2"/><path d="M36 44.5l4 -1M54 44.5l4-1" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>'
};
var NECK={
  bow:'<path d="M50 70L37 63V77Z" fill="#E8577D"/><path d="M50 70L63 63V77Z" fill="#E8577D"/><circle cx="50" cy="70" r="3.6" fill="#C93A61"/>',
  bell:'<path d="M34 65Q50 77 66 65" stroke="#E8577D" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="50" cy="74" r="4.8" fill="#FFD25E" stroke="#E0A82A" stroke-width="1.2"/><path d="M47.6 75.6h4.8" stroke="#B57A10" stroke-width="1"/>',
  scarf:'<path d="M31 64Q50 77 69 64L69 71Q50 84 31 71Z" fill="#7B5CD6"/><path d="M58 76L66 92L56 92L53 79Z" fill="#6749C4"/><path d="M36 69q14 8 28 0" stroke="#A48CF0" stroke-width="1.6" fill="none"/>'
};
function accSVG(kind,acc){
  if(!acc) return '';
  var fr=kind==='frog',s='';
  if(acc.neck&&NECK[acc.neck]) s+='<g transform="translate(0 '+(fr?5:0)+')">'+NECK[acc.neck]+'</g>';
  if(acc.face&&FACE[acc.face]) s+='<g transform="translate(50 '+(fr?34:47)+') scale('+(fr?1.3:1)+') translate(-50 -47)">'+FACE[acc.face]+'</g>';
  if(acc.hat&&HAT[acc.hat]) s+='<g transform="'+(fr?'translate(50 26) scale(.72) translate(-50 -26) translate(0 10)':'')+'">'+HAT[acc.hat]+'</g>';
  return s;
}
function petInner(kind,vi,acc){
  var v=PET_KINDS[kind].variants[vi%4],a=v.a,b=v.b,dk='#2A2320',o='';
  function eyes(x1,x2,y){return '<ellipse cx="'+x1+'" cy="'+y+'" rx="3.7" ry="4.7" fill="'+dk+'"/><ellipse cx="'+x2+'" cy="'+y+'" rx="3.7" ry="4.7" fill="'+dk+'"/><circle cx="'+(x1+1.2)+'" cy="'+(y-1.8)+'" r="1.4" fill="#fff"/><circle cx="'+(x2+1.2)+'" cy="'+(y-1.8)+'" r="1.4" fill="#fff"/>'}
  function blush(y){return '<ellipse cx="34" cy="'+y+'" rx="4.6" ry="2.7" fill="#FF9FB5" opacity=".7"/><ellipse cx="66" cy="'+y+'" rx="4.6" ry="2.7" fill="#FF9FB5" opacity=".7"/>'}
  var body='<ellipse cx="50" cy="77" rx="19" ry="16" fill="'+a+'"/><ellipse cx="50" cy="81" rx="11" ry="10" fill="'+(kind==='frog'?b:'#FFF6EC')+'"/><ellipse cx="40" cy="91" rx="8" ry="4.6" fill="'+a+'"/><ellipse cx="60" cy="91" rx="8" ry="4.6" fill="'+a+'"/>';
  if(kind==='cat'){
    o='<path class="tail" d="M67 85C83 86 89 70 82 60" stroke="'+a+'" stroke-width="7" fill="none" stroke-linecap="round"/>'+body+
      '<path d="M27 40L29 14Q29.5 12 31.5 13L47 26Z" fill="'+a+'"/><path d="M73 40L71 14Q70.5 12 68.5 13L53 26Z" fill="'+a+'"/><path d="M31 33L32 19L42 27Z" fill="#FFB3C7"/><path d="M69 33L68 19L58 27Z" fill="#FFB3C7"/>'+
      '<circle cx="50" cy="47" r="24" fill="'+a+'"/><path d="M50 24v6M44 25l1 5M56 25l-1 5" stroke="'+b+'" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="50" cy="57" rx="9" ry="6" fill="#FFF6EC"/>'+
      eyes(41,59,47)+blush(55)+'<path d="M47.6 52.5h4.8L50 55.5z" fill="#F08DAE"/><path d="M50 55.5v2M50 57.5q-2.6 2.4-5 .4M50 57.5q2.6 2.4 5 .4" stroke="#6B4A3A" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M30 52l-9-2M30 55l-9 1.5M70 52l9-2M70 55l9 1.5" stroke="#6B4A3A" opacity=".45" stroke-width="1.2" stroke-linecap="round"/>';
  } else if(kind==='dog'){
    o='<path class="tail" d="M68 84Q82 80 79 66" stroke="'+a+'" stroke-width="6" fill="none" stroke-linecap="round"/>'+body+
      '<ellipse cx="28" cy="42" rx="8.5" ry="15" fill="'+b+'" transform="rotate(12 28 42)"/><ellipse cx="72" cy="42" rx="8.5" ry="15" fill="'+b+'" transform="rotate(-12 72 42)"/>'+
      '<circle cx="50" cy="47" r="24" fill="'+a+'"/><ellipse cx="50" cy="57" rx="12.5" ry="9" fill="#FFF3E2"/>'+eyes(41,59,45)+blush(54)+
      '<ellipse cx="50" cy="51.5" rx="4.8" ry="3.4" fill="'+dk+'"/><circle cx="48.8" cy="50.4" r="1" fill="#fff" opacity=".8"/><path d="M50 55v3M50 58q-3.4 3.4-7 .4M50 58q3.4 3.4 7 .4" stroke="#6B4A3A" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M48 60q2 5.5 4 0z" fill="#FF8FA8"/>';
  } else if(kind==='bunny'){
    o='<circle cx="72" cy="86" r="6.5" fill="#fff"/>'+body+
      '<ellipse cx="38" cy="19" rx="7.2" ry="18" fill="'+a+'" transform="rotate(-6 38 19)"/><ellipse cx="62" cy="19" rx="7.2" ry="18" fill="'+a+'" transform="rotate(6 62 19)"/><ellipse cx="38" cy="20" rx="3.6" ry="12.5" fill="#FFB3C7" transform="rotate(-6 38 20)"/><ellipse cx="62" cy="20" rx="3.6" ry="12.5" fill="#FFB3C7" transform="rotate(6 62 20)"/>'+
      '<circle cx="50" cy="47" r="24" fill="'+a+'"/><ellipse cx="50" cy="57" rx="9" ry="6.5" fill="#fff" opacity=".85"/>'+eyes(41,59,46)+blush(54)+
      '<ellipse cx="50" cy="52.6" rx="2.6" ry="2" fill="#F08DAE"/><path d="M50 54.6v2M50 56.6q-2.4 2.2-4.6.4M50 56.6q2.4 2.2 4.6.4" stroke="#6B4A3A" stroke-width="1.3" fill="none" stroke-linecap="round"/><rect x="48" y="58.2" width="4" height="4.2" rx="1.1" fill="#fff" stroke="#E5D5D5" stroke-width=".6"/>';
  } else {
    o=body+'<circle cx="43" cy="73" r="2.2" fill="'+b+'" opacity=".7"/><circle cx="58" cy="71" r="2.6" fill="'+b+'" opacity=".7"/>'+
      '<ellipse cx="50" cy="52" rx="27" ry="20" fill="'+a+'"/><circle cx="39" cy="34" r="10" fill="'+a+'"/><circle cx="61" cy="34" r="10" fill="'+a+'"/>'+
      '<circle cx="39" cy="34" r="7.2" fill="#fff"/><circle cx="61" cy="34" r="7.2" fill="#fff"/><circle cx="40" cy="35" r="4" fill="'+dk+'"/><circle cx="60" cy="35" r="4" fill="'+dk+'"/><circle cx="41.3" cy="33.4" r="1.4" fill="#fff"/><circle cx="61.3" cy="33.4" r="1.4" fill="#fff"/>'+
      '<ellipse cx="30" cy="57" rx="4.6" ry="2.7" fill="#FF9FB5" opacity=".7"/><ellipse cx="70" cy="57" rx="4.6" ry="2.7" fill="#FF9FB5" opacity=".7"/>'+
      '<path d="M37 57Q50 68 63 57" stroke="#3A5A3A" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="47" cy="51" r=".9" fill="#3A5A3A"/><circle cx="53" cy="51" r=".9" fill="#3A5A3A"/>';
  }
  return o+accSVG(kind,acc);
}
function petArt(kind,vi,acc,opt){
  opt=opt||{};
  return '<svg class="petsvg" viewBox="'+(opt.head?'14 0 72 74':'0 0 100 100')+'" aria-hidden="true" focusable="false">'+(opt.head?'':'<ellipse cx="50" cy="95" rx="26" ry="4" fill="rgba(0,0,0,.14)"/>')+petInner(kind,vi,acc)+'</svg>';
}

/* ---------- pets: shop catalog ---------- */
var ACCS=[
  {id:'party',slot:'hat',name:'Party hat',price:25},{id:'flowers',slot:'hat',name:'Flower crown',price:35},
  {id:'straw',slot:'hat',name:'Straw hat',price:40},{id:'crown',slot:'hat',name:'Tiny crown',price:80},
  {id:'glasses',slot:'face',name:'Round glasses',price:30},{id:'shades',slot:'face',name:'Cool shades',price:40},
  {id:'bow',slot:'neck',name:'Red bow',price:20},{id:'bell',slot:'neck',name:'Bell collar',price:25},{id:'scarf',slot:'neck',name:'Cozy scarf',price:35}
];
var FOODS=[
  {id:'kibble',name:'Kibble',price:4,fill:25,loves:null,blurb:'A tasty snack for any pet.'},
  {id:'fish',name:'Tasty fish',price:8,fill:40,loves:'cat',blurb:'Cats go wild for this.'},
  {id:'bone',name:'Bone biscuit',price:6,fill:35,loves:'dog',blurb:'Dogs wag for this.'},
  {id:'carrot',name:'Crunchy carrot',price:5,fill:35,loves:'bunny',blurb:'Bunnies adore it.'},
  {id:'cricket',name:'Cricket cookie',price:5,fill:35,loves:'frog',blurb:'A frog favorite.'}
];
var HOMES=[
  {id:'bed',name:'Cozy bed',price:35,blurb:'A soft spot for naps.'},{id:'house',name:'Little house',price:60,blurb:'A snug home in the garden.'},
  {id:'ball',name:'Bouncy ball',price:12,blurb:'Endless fun.'},{id:'bowl',name:'Water bowl',price:15,blurb:'Always fresh.'}
];
function foodIcon(id){
  var p={
    kibble:'<path d="M5 15h22a11 11 0 0 1-11 11A11 11 0 0 1 5 15z" fill="#E8779B"/><circle cx="11" cy="12" r="3" fill="#B9754B"/><circle cx="17" cy="9.5" r="3" fill="#C98A5A"/><circle cx="22" cy="12.5" r="3" fill="#B9754B"/>',
    fish:'<path d="M3 16c5-7 14-7 20 0-6 7-15 7-20 0z" fill="#7DC4F0"/><path d="M22 16l7-5.5v11z" fill="#5FA8E6"/><circle cx="9.5" cy="14.5" r="1.5" fill="#2A3B4A"/><path d="M14 11.5q2 4.5 0 9" stroke="#B5E3FC" stroke-width="1.4" fill="none"/>',
    bone:'<rect x="9" y="12.5" width="14" height="7" rx="3" fill="#F7EBD9" stroke="#D9C4A6" stroke-width="1.2"/><g fill="#F7EBD9" stroke="#D9C4A6" stroke-width="1.2"><circle cx="8" cy="13.4" r="3.6"/><circle cx="8" cy="18.6" r="3.6"/><circle cx="24" cy="13.4" r="3.6"/><circle cx="24" cy="18.6" r="3.6"/></g><rect x="9.6" y="13.4" width="12.8" height="5.2" fill="#F7EBD9"/>',
    carrot:'<path d="M5 27Q3 12 17 9Q24 15 22 23Q14 31 5 27Z" fill="#F2913A"/><path d="M8 20l4 1M10 15l4 1M13 24l3 .5" stroke="#D97722" stroke-width="1.4" stroke-linecap="round"/><path d="M17 9Q16 3 21 3M17 9Q24 6 27 10" stroke="#4FA36A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    cricket:'<circle cx="16" cy="16" r="12" fill="#E3B77A"/><circle cx="11" cy="13" r="1.8" fill="#8A5A2A"/><circle cx="20" cy="12" r="1.8" fill="#8A5A2A"/><circle cx="15" cy="20" r="1.8" fill="#8A5A2A"/><circle cx="21" cy="19" r="1.6" fill="#4FA36A"/><circle cx="10" cy="20" r="1.6" fill="#4FA36A"/>'
  }[id];
  return '<svg viewBox="0 0 32 32" aria-hidden="true">'+p+'</svg>';
}
function homeArt(id){
  var p={
    bed:'<ellipse cx="50" cy="80" rx="40" ry="12" fill="#F08DAE"/><ellipse cx="50" cy="75" rx="32" ry="8" fill="#FFD6E3"/><ellipse cx="38" cy="72" rx="12" ry="6" fill="#fff" opacity=".9"/>',
    house:'<path d="M14 52L50 22l36 30v36H14z" fill="#E8B27C"/><path d="M8 54L50 18l42 36" stroke="#C25A44" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M38 88V66a12 12 0 0 1 24 0v22z" fill="#5C3D2E"/>',
    ball:'<circle cx="50" cy="70" r="22" fill="#F08DAE"/><path d="M30 62q20 8 40 0M34 82q16-8 32 0" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/><ellipse cx="42" cy="58" rx="5" ry="3" fill="#fff" opacity=".55"/>',
    bowl:'<path d="M16 66h68q0 24-34 24T16 66z" fill="#7DC4F0"/><ellipse cx="50" cy="66" rx="34" ry="8" fill="#BFE4FA"/><ellipse cx="50" cy="66" rx="26" ry="5" fill="#8CCBF2"/>'
  }[id];
  return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">'+p+'</svg>';
}

/* ---------- avatars ---------- */
function critter(kind){
  var dk='#2A2320',eyes='<ellipse cx="40" cy="52" rx="3.4" ry="4.4" fill="'+dk+'"/><ellipse cx="60" cy="52" rx="3.4" ry="4.4" fill="'+dk+'"/><circle cx="41" cy="50.4" r="1.3" fill="#fff"/><circle cx="61" cy="50.4" r="1.3" fill="#fff"/>';
  var blush='<ellipse cx="32" cy="60" rx="4.4" ry="2.6" fill="#FF9FB5" opacity=".75"/><ellipse cx="68" cy="60" rx="4.4" ry="2.6" fill="#FF9FB5" opacity=".75"/>';
  var smile='<path d="M45.5 63q4.5 4 9 0" stroke="#5A3A2A" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  if(kind==='bear') return '<circle cx="28" cy="30" r="10" fill="#C08B5C"/><circle cx="72" cy="30" r="10" fill="#C08B5C"/><circle cx="28" cy="30" r="5" fill="#E6BE99"/><circle cx="72" cy="30" r="5" fill="#E6BE99"/><circle cx="50" cy="54" r="29" fill="#C08B5C"/><ellipse cx="50" cy="62" rx="12" ry="9" fill="#F3D9BE"/>'+eyes+blush+'<ellipse cx="50" cy="57" rx="4.4" ry="3" fill="'+dk+'"/>'+smile;
  if(kind==='panda') return '<circle cx="28" cy="30" r="10" fill="#2A2A33"/><circle cx="72" cy="30" r="10" fill="#2A2A33"/><circle cx="50" cy="54" r="29" fill="#fff"/><ellipse cx="38" cy="52" rx="7.5" ry="9.5" fill="#2A2A33" transform="rotate(20 38 52)"/><ellipse cx="62" cy="52" rx="7.5" ry="9.5" fill="#2A2A33" transform="rotate(-20 62 52)"/><circle cx="38.5" cy="51.5" r="3" fill="#fff"/><circle cx="61.5" cy="51.5" r="3" fill="#fff"/><circle cx="38.8" cy="51.8" r="1.6" fill="'+dk+'"/><circle cx="61.2" cy="51.8" r="1.6" fill="'+dk+'"/><ellipse cx="50" cy="61" rx="4.4" ry="3" fill="'+dk+'"/>'+blush+'<path d="M45.5 66q4.5 4 9 0" stroke="#5A3A2A" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  if(kind==='fox') return '<path d="M20 20L44 36L30 56Z" fill="#F08A3C"/><path d="M80 20L56 36L70 56Z" fill="#F08A3C"/><path d="M50 82L18 54Q22 34 50 34T82 54Z" fill="#F08A3C"/><path d="M50 82L22 57Q38 58 50 64Q62 58 78 57Z" fill="#fff"/>'+eyes+'<ellipse cx="50" cy="66" rx="4" ry="3" fill="'+dk+'"/>'+blush.replace(/cy="60"/g,'cy="61"');
  if(kind==='chick') return '<path d="M46 28Q44 20 50 22Q54 16 58 24" stroke="#F2B640" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="50" cy="55" r="30" fill="#FFD95E"/><ellipse cx="22" cy="60" rx="7" ry="10" fill="#F5C842"/><ellipse cx="78" cy="60" rx="7" ry="10" fill="#F5C842"/>'+eyes+blush+'<path d="M44 60L50 66L56 60Q50 56 44 60Z" fill="#F29C4B"/>';
  if(kind==='sunflower'){var pt='';for(var i=0;i<12;i++) pt+='<ellipse cx="50" cy="24" rx="7" ry="13" transform="rotate('+(i*30)+' 50 52)" fill="'+(i%2?'#FFD25E':'#FFC23D')+'"/>';return pt+'<circle cx="50" cy="52" r="20" fill="#8B5E3C"/>'+eyes.replace(/cy="52"/g,'cy="50"').replace(/cy="50.4"/g,'cy="48.4"')+'<path d="M45.5 58q4.5 4 9 0" stroke="#FFE6B0" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="57" rx="3.6" ry="2.2" fill="#FF9FB5" opacity=".7"/><ellipse cx="66" cy="57" rx="3.6" ry="2.2" fill="#FF9FB5" opacity=".7"/>'}
  return '<path d="M50 32C44 30 36 24 36 14C46 14 50 22 50 32Z" fill="#4FA36A"/><path d="M50 32C56 28 66 22 66 10C56 10 50 18 50 32Z" fill="#6DBA82"/><circle cx="50" cy="58" r="28" fill="#C9F1D8"/>'+eyes.replace(/cy="52"/g,'cy="56"').replace(/cy="50.4"/g,'cy="54.4"')+blush.replace(/cy="60"/g,'cy="64"')+'<path d="M45.5 66q4.5 4 9 0" stroke="#5A3A2A" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
}
var AVATARS=[
  {id:'sprout',bg:'#DDF3E4',art:function(){return critter('sprout')}},
  {id:'cat',bg:'#FFE4C7',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('cat',0)+'</svg>'}},
  {id:'cat2',bg:'#E4E7F5',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('cat',3)+'</svg>'}},
  {id:'dog',bg:'#FFEBD0',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('dog',0)+'</svg>'}},
  {id:'dog2',bg:'#F2E2D2',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('dog',1)+'</svg>'}},
  {id:'bunny',bg:'#FFE1EA',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('bunny',0)+'</svg>'}},
  {id:'bunny2',bg:'#FDE7DC',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('bunny',1)+'</svg>'}},
  {id:'frog',bg:'#DDF3D3',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('frog',0)+'</svg>'}},
  {id:'frog2',bg:'#D5F4EE',art:function(){return '<svg x="6" y="8" width="88" height="88" viewBox="14 0 72 74">'+petInner('frog',1)+'</svg>'}},
  {id:'bear',bg:'#F7E3CF',art:function(){return critter('bear')}},
  {id:'panda',bg:'#E3EEF7',art:function(){return critter('panda')}},
  {id:'fox',bg:'#FFE8D2',art:function(){return critter('fox')}},
  {id:'chick',bg:'#FFF3C4',art:function(){return critter('chick')}},
  {id:'sunflower',bg:'#DDEFFB',art:function(){return critter('sunflower')}}
];
function avatarSVG(id){
  var a=AVATARS.filter(function(x){return x.id===id})[0]||AVATARS[0];
  return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect width="100" height="100" fill="'+a.bg+'"/>'+a.art()+'</svg>';
}
function avatarInner(){
  var a=(S&&S.user&&S.user.avatar)||{type:'preset',id:'sprout'};
  return a.type==='photo'?'<img src="'+a.data+'" alt="">':avatarSVG(a.id);
}

'use strict';

/* ---------- constants ---------- */
var DAY=864e5, HOUR=36e5, KEY='bx_state_v1';
var TYPES=[
  {id:'academic',label:'Academic / Work'},
  {id:'health',label:'Health & Fitness'},
  {id:'habit',label:'Habit Building'},
  {id:'occasion',label:'Occasions'},
  {id:'growth',label:'Personal Growth'}
];
var PATTERNS=[
  {id:'avoid',name:'Deadline avoidance',hint:'Choosing something else (social media, videos, cleaning, bed, skipping or a quick reward) while a deadline is close or you are stressed.',badge:'Overcame Repeated Avoidance'},
  {id:'procrast',name:'Late starts',hint:'Delaying, rushing or missing the deadline on due tasks, team work or busy days.',badge:'Beat the Last-Minute Rush'},
  {id:'impulse',name:'Impulsive choices',hint:'Taking the quick reward after a notification, boredom, an invitation or social media.',badge:'Mastered the Pause'},
  {id:'escape',name:'Screen escape',hint:'Opening social media or videos late at night, when alone, stressed, bored or overwhelmed.',badge:'Broke the Scroll Loop'},
  {id:'skip',name:'Dropped routines',hint:'Skipping or being late with routines when you are low on energy, busy or stressed. Habit and health tasks count too.',badge:'Kept the Routine'}
];
var GOAL_PATTERNS=PATTERNS;

/* ---------- helpers ---------- */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pad(n){return String(n).padStart(2,'0')}
function toLocalInput(ms){var d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function dateInput(ms){var d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function defaultDeadline(){var d=new Date();d.setDate(d.getDate()+1);d.setHours(18,0,0,0);return toLocalInput(d.getTime())}
function fmtDate(ms){return new Date(ms).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function fmtShort(ms){return new Date(ms).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
function fmtLeft(ms){
  var a=Math.abs(ms), mins=Math.floor(a/60000), s;
  if(a<HOUR) s=Math.max(mins,1)+'m';
  else if(a<48*HOUR){var h=Math.floor(mins/60),m=mins%60;s=m?h+'h '+m+'m':h+'h'}
  else s=Math.round(a/DAY)+'d';
  return ms<0?'Overdue by '+s:s+' left';
}
function greet(){var h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
function pct(v){return Math.round(v*100)+'%'}
function typeLabel(id){var t=TYPES.filter(function(x){return x.id===id})[0];return t?t.label:id}
function dcls(d){return d==='Easy'?'easy':d==='Medium'?'med':d==='Hard'?'hard':'na'}
function kindOf(d){return d==='Easy'?'sprout':d==='Medium'?'flower':d==='Hard'?'tree':'grass'}
function plantName(k){return {sprout:'a green sprout',flower:'a flowering plant',tree:'a blossom tree',grass:'a tuft of grass'}[k]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

/* ---------- icons ---------- */
var COIN='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#FFD25E" stroke="#D9982A" stroke-width="1.6"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#F2B640" stroke-width="1.2"/><ellipse cx="9" cy="11" rx="1.2" ry="1.5" fill="#6B4A12"/><ellipse cx="15" cy="11" rx="1.2" ry="1.5" fill="#6B4A12"/><path d="M9.8 14.2q2.2 2.2 4.4 0" stroke="#6B4A12" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="7" cy="13.6" rx="1.5" ry="1" fill="#FF9FB5" opacity=".8"/><ellipse cx="17" cy="13.6" rx="1.5" ry="1" fill="#FF9FB5" opacity=".8"/></svg>';
var DIAMOND='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9L8.5 3H15.5L20 9L12 21Z" fill="#9FD9F5" stroke="#4FA8D9" stroke-width="1.3" stroke-linejoin="round"/><path d="M4 9H20M8.5 3L12 9L15.5 3M8 9L12 21L16 9" stroke="#4FA8D9" stroke-width="1" fill="none"/><path d="M6.5 6.2l1 1.6 1.6 1-1.6 1-1 1.6-1-1.6-1.6-1 1.6-1z" fill="#fff" opacity=".85"/></svg>';
var LOGO='<svg class="logo" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="11" fill="#2A7A55"/><path d="M17 9C14 8.5 11.6 6.6 11 4C14.4 4 16.8 5.6 17 9Z" fill="#BFF0D3"/><path d="M17 9C20 8 22 6 22.6 3.6C19.4 3.6 17.2 5.4 17 9Z" fill="#fff"/><circle cx="17" cy="20" r="10" fill="#E5FBEE"/><ellipse cx="13.2" cy="19" rx="1.3" ry="1.7" fill="#23352C"/><ellipse cx="20.8" cy="19" rx="1.3" ry="1.7" fill="#23352C"/><path d="M14.6 22.4q2.4 2.4 4.8 0" stroke="#23352C" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="10.8" cy="22" rx="1.8" ry="1.1" fill="#FFAFC4"/><ellipse cx="23.2" cy="22" rx="1.8" ry="1.1" fill="#FFAFC4"/></svg>';
var TRASH='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/></svg>';
var NAVICON={
  pets:'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="6.5" cy="11" rx="1.9" ry="2.5"/><ellipse cx="10" cy="7" rx="1.9" ry="2.5"/><ellipse cx="14" cy="7" rx="1.9" ry="2.5"/><ellipse cx="17.5" cy="11" rx="1.9" ry="2.5"/><path d="M12 12.5c-3 0-5.5 3-5.5 5.2 0 1.7 1.7 2.3 3.2 1.8l2.3-.6 2.3.6c1.5.5 3.2-.1 3.2-1.8 0-2.2-2.5-5.2-5.5-5.2z"/></svg>',
  tasks:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="4"/><path d="M9.5 4.5h5"/><path d="M12 16c-2.2-1.4-3-2.6-3-3.7a1.7 1.7 0 0 1 3-1 1.7 1.7 0 0 1 3 1c0 1.1-.8 2.3-3 3.7z"/></svg>',
  events:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5.5L8 20.5v-3H6a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/></svg>',
  garden:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-9M12 12c-4 0-6-2.5-6-6 4 0 6 2 6 6zM12 15c3 0 5-2 5-5-3 0-5 1.5-5 5z"/></svg>',
  goals:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.7 5.4-.7z"/></svg>',
  insights:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-6M11 20V9M17 20v-9"/><path d="M19 3.5v4M17 5.5h4"/></svg>'
};

/* ---------- state ---------- */
/* ---------- server connection (everything is stored by the PHP API, nothing in localStorage except theme and sound cache) ---------- */
var API='api/index.php', CSRF=null, S=null, booting=true;
function api(method,route,params,body){
  var q=Object.keys(params||{}).map(function(k){return '&'+k+'='+encodeURIComponent(params[k])}).join('');
  var h={'Accept':'application/json'};
  if(body!==undefined&&body!==null) h['Content-Type']='application/json';
  if(CSRF&&method!=='GET') h['X-CSRF-Token']=CSRF;
  return fetch(API+'?r='+route+q,{method:method,headers:h,credentials:'same-origin',body:(body===undefined||body===null)?undefined:JSON.stringify(body)})
    .then(function(r){return r.json().catch(function(){return {error:'Server error'}}).then(function(j){
      if(!r.ok){var e=new Error(j.error||'Something went wrong');e.status=r.status;throw e}return j})});
}
function uid(){return Math.random().toString(36).slice(2,9)}   // unique ids for the SVG art (art.js uses it)
function apiFail(e){if(e&&e.status===401){S=null;CSRF=null;render();return}toast(esc((e&&e.message)||'Could not reach the server.'))}
var _setT=null,_setQ={};
function pushSettings(o){
  if(!S||!CSRF) return;for(var k in o)_setQ[k]=o[k];clearTimeout(_setT);
  _setT=setTimeout(function(){var b=_setQ;_setQ={};api('PUT','settings',null,b).catch(function(){})},500);
}
/* server rows -> the shapes the page already uses (ids become strings) */
function mapTask(t){return {value:t.coins_value,id:String(t.id),title:t.title,type:t.task_type,effort:t.effort,skip:t.skip_rating,created:t.created_at,deadline:t.deadline,status:t.status,
  difficulty:t.difficulty,score:t.difficulty_score,completedAt:t.completed_at,timing:t.timing,coins:t.coins_earned,notified:false,
  gpos:t.garden_x==null?null:{x:t.garden_x,y:t.garden_y},
  plant:(t.status==='completed'&&t.garden_x!=null)?{x:t.garden_x,y:t.garden_y,v:t.plant_variant||0,wilted:!!t.plant_wilted}:undefined}}
function mapEvent(e){return {id:String(e.id),at:e.occurred_at,context:e.context,trigger:e.trigger,behavior:e.behavior,duration:e.duration_min,decision:e.decision,
  mood:e.mood,stress:e.stress,alternatives:e.alternatives||[],patterns:e.patterns||[],result:e.result,success:e.success,
  notes:(e.notes||[]).map(function(n,i){return {id:e.id+'-'+i,at:n.at,text:n.text}})}}
function mapSub(list){return (list||[]).map(function(n){return {id:String(n.id),title:n.title,done:!!n.done,rate:n.rate,children:mapSub(n.children)}})}
function mapGoal(g){return {id:String(g.id),title:g.title,pattern:g.goal_type,baseline:g.baseline,target:g.target,current:g.current_score,created:g.created_at,
  deadline:g.deadline,status:g.status,progress:g.progress,history:(g.checkins||[]).map(function(c){return {at:c.at,score:c.score,source:c.source}}),progressSource:g.progress_source||'auto',manualProgress:g.manual_progress,manualAt:g.manual_set_at,subtasks:mapSub(g.subtasks),beeAwarded:!!g.bee_awarded,
  notified:false,closedAt:g.closed_at,completion:g.completion,result:g.result,points:g.coin_points,diaPoints:g.diamond_points,onTime:g.closed_on_time}}
function replaceGoal(r){var ng=mapGoal(r),i=S.goals.findIndex(function(x){return x.id===ng.id});if(i>=0)S.goals[i]=ng;else S.goals.push(ng);return ng}
function mapNote(n){return {id:String(n.id),at:n.at,text:n.text,read:n.read,page:n.page,pid:n.pattern}}
function mapPet(p){var acc={};if(p.hat)acc.hat=p.hat;if(p.face)acc.face=p.face;if(p.neck)acc.neck=p.neck;
  return {id:String(p.id),kind:p.kind,vi:p.variant,name:p.name,fullness:p.fullness,joy:p.joy,at:p.stats_updated_at,since:p.adopted_at,acc:acc,x:p.x,y:p.y}}
function mapTx(t){return {id:String(t.id),amount:t.amount,reason:t.reason,at:t.at}}
function mapDeco(d){return {id:String(d.id),kind:d.kind,goalId:String(d.goal_id),x:d.x,y:d.y,title:d.title,at:d.at}}
function mapUser(u){return {name:u.name,email:u.email,ageGroup:u.age_group||'',occupation:u.occupation||'',nick:u.nickname||'',handle:u.username||'',
  avatar:u.avatar_type==='photo'&&u.avatar_path?{type:'photo',data:'uploads/avatars/'+u.avatar_path}:{type:'preset',id:u.avatar_id||'sprout'}}}
function applySettings(set,season){
  AU.sfxOn=!!set.sfx_on;AU.vol=set.volume;if(set.focus_track) AU.cur=set.focus_track;
  if(set.theme==='light'||set.theme==='dark'){document.documentElement.setAttribute('data-theme',set.theme);try{localStorage.setItem('bx_theme',set.theme)}catch(e){}}
  if(season&&SEASONS[season]) SEASON=season;
  applySeason();
}
function loadAll(user){
  return Promise.all([api('GET','tasks'),api('GET','events'),api('GET','goals'),api('GET','notifications'),api('GET','shop'),api('GET','settings'),api('GET','wallet'),api('GET','patterns'),api('GET','patterns',{a:'rules'})]).then(function(a){
    var shop=a[4].mine,w=a[6];
    S={loggedIn:true,user:mapUser(user),tasks:a[0].map(mapTask),events:a[1].map(mapEvent),goals:a[2].map(mapGoal),notes:a[3].map(mapNote),
       pets:shop.pets.map(mapPet),inv:{food:shop.food,acc:shop.accessories,home:shop.home},unlockedSeasons:shop.seasons,
       tx:w.coins.map(mapTx),dtx:w.diamonds.map(mapTx),decos:w.decos.map(mapDeco),coinBal:walletBal(w,'coin_balance','coins'),diaBal:walletBal(w,'diamond_balance','diamonds'),patterns:a[7].patterns,rules:a[8],fresh:null};
    applySettings(a[5],shop.active_season);booting=false;startPolling();
  });
}
function walletBal(w,key,rows){   // the server's total; if it is ever missing, add up the ledger rows (a balance is always the SUM of its ledger)
  if(typeof w[key]==='number') return w[key];
  return (w[rows]||[]).reduce(function(t,r){return t+(+r.amount||0)},0);
}
function refreshWallet(){return api('GET','wallet').then(function(w){S.tx=w.coins.map(mapTx);S.dtx=w.diamonds.map(mapTx);S.decos=w.decos.map(mapDeco);S.coinBal=walletBal(w,'coin_balance','coins');S.diaBal=walletBal(w,'diamond_balance','diamonds')})}
function syncNotifs(){
  if(!S||!CSRF) return Promise.resolve();
  return api('GET','notifications').then(function(n){
    var before=S.notes.filter(function(x){return !x.read}).length;S.notes=n.map(mapNote);
    var after=S.notes.filter(function(x){return !x.read}).length,a=document.activeElement;
    if(after!==before&&!$('.overlay')&&page!=='addevent'&&page!=='profile'&&!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))) render();
  }).catch(function(){});
}
var pollT=null;
function setSeason(id){   // wear a season that is already unlocked
  api('PUT','shop',{a:'season'},{season_id:id}).then(function(r){SEASON=r.active_season;applySeason();render()}).catch(apiFail);
}
function unlockSeason(id){   // the server checks the price and the diamond balance, then spends the diamonds
  var s=SEASONS[id];if(!s) return;
  api('POST','shop',{a:'unlock'},{season_id:id}).then(function(r){
    if(S.unlockedSeasons.indexOf(id)<0) S.unlockedSeasons.push(id);
    SEASON=id;applySeason();
    return refreshWallet().then(function(){render();sfx('bloom');burst(lastClick.x,lastClick.y,16);toast(esc(r.name+' is unlocked and now on. Diamonds left: '+r.diamond_balance+'.'))});
  }).catch(function(e){if(e.status===402) sfx('error');apiFail(e)});
}
function startPolling(){   // the server creates due-soon alerts and works out pet hunger; the page just asks again
  clearInterval(pollT);
  pollT=setInterval(function(){
    if(!S||!CSRF) return;
    syncNotifs();
    api('GET','shop').then(function(sh){sh.mine.pets.forEach(function(sp){var p=petById(String(sp.id));if(p){p.fullness=sp.fullness;p.joy=sp.joy}})}).catch(function(){});
  },60000);
}
function boot(){
  booting=true;render();
  api('GET','auth',{a:'me'}).then(function(r){
    if(!r.user){booting=false;S=null;render();return}
    CSRF=r.csrf;return loadAll(r.user).then(function(){render()});
  }).catch(function(e){booting=false;S=null;render();toast(esc((e&&e.message)||'Could not reach the server.'))});
}
var page='tasks', authMode='login', chartMode='daily', gardenRange='all', showAllTx=false, gardenIntro=false, lastBal=null, lastDia=null;
var draft={title:'',type:'academic',effort:'Medium',skip:false,deadline:defaultDeadline()};
var gdraft={title:'',pattern:'avoid',baseline:75,baseHand:false,target:30,deadline:dateInput(Date.now()+30*DAY),start:null};   // start = GET goals&a=start for the chosen pattern

function balance(){return S.coinBal||0}
function diamonds(){return S.diaBal||0}
/* ---------- actions ---------- */
function completeTask(id){
  var t=S.tasks.filter(function(x){return x.id===id})[0];
  if(!t||t.status==='completed') return;
  api('POST','tasks',{id:id,a:'complete'}).then(function(r){
    var nt=mapTask(r.task),i=S.tasks.findIndex(function(x){return x.id===id});S.tasks[i]=nt;S.fresh=nt.id;
    var wilted=nt.timing==='late',coins=r.coins;
    var msg=wilted?'Finished after the deadline. +'+coins+' coins, but '+plantName(kindOf(nt.difficulty))+' came in looking a little wilted.':
            nt.timing==='early'?'Early finish. +'+coins+' coins with a bonus, and '+plantName(kindOf(nt.difficulty))+' is growing.':
            'Done on time. +'+coins+' coins, and '+plantName(kindOf(nt.difficulty))+' is growing.';
    return Promise.all([refreshWallet(),refreshPatterns()]).then(function(){
      render();sfx('success');setTimeout(function(){sfx('coin')},380);burst(lastClick.x,lastClick.y,18);
      toast(esc(msg),page==='garden'?null:{act:'nav',attrs:'data-page="garden"',label:'View garden'});
    });
  }).catch(apiFail);
}
function removeTask(id){
  api('DELETE','tasks',{id:id}).then(function(){S.tasks=S.tasks.filter(function(x){return x.id!==id});render();toast('Task removed.')}).catch(apiFail);
}
function removeGoal(id){
  api('DELETE','goals',{id:id}).then(function(){S.goals=S.goals.filter(function(x){return x.id!==id});render();toast('Goal removed.')}).catch(apiFail);
}
function addTask(){
  var err=$('#taskErr'),title=draft.title.trim(),dl=new Date(draft.deadline).getTime();
  if(!title){err.textContent='Give the task a name so you can find it later.';$('#f-title').focus();return}
  if(!dl||isNaN(dl)){err.textContent='Choose a deadline for this task.';return}
  if(dl<=Date.now()+60000){err.textContent='Pick a deadline that is still ahead of you.';return}
  api('POST','tasks',null,{title:title,task_type:draft.type,effort:draft.effort,skip_rating:draft.skip,deadline:dl}).then(function(r){
    var nt=mapTask(r);S.tasks.push(nt);draft.title='';render();sfx('add');
    toast(esc(nt.difficulty==='N/A'?'Task added without a difficulty rating.':'Task added. Difficulty: '+nt.difficulty+'.'));
  }).catch(apiFail);
}
function autoPct(){return gdraft.start&&gdraft.start.enough?Math.round(+(gdraft.start.strength*100).toFixed(6)):null}   // the level counted from the logs, if there is enough data
function startPct(){return gdraft.baseline}                                                                // the level the target is measured from (slider)
function targetMax(){return Math.max(0,startPct()-5)}   // always exactly 5 points below the starting level
function loadStart(){   // the server counts the last 30 days of logs for the chosen pattern
  var pt=gdraft.pattern;gdraft.start=null;
  return api('GET','goals',{a:'start',goal_type:pt}).then(function(r){
    if(gdraft.pattern!==pt) return;
    gdraft.start=r;
    if(!gdraft.baseHand) gdraft.baseline=r.enough?autoPct():75;   // the bar begins at the automatic level (or the usual 75% when there is too little data) until you move it
    if(gdraft.target>targetMax()) gdraft.target=targetMax();
    if(page==='goals') render();
  }).catch(function(){});
}
function addGoal(){
  var err=$('#goalErr'),title=gdraft.title.trim(),dl=new Date(gdraft.deadline+'T23:59').getTime();
  if(!title){err.textContent='Describe what you want to change.';$('#g-title').focus();return}
  if(!gdraft.start){err.textContent='Still counting your logged events. Try again in a moment.';return}
  var body={goal_type:gdraft.pattern,title:title,target:gdraft.target/100,deadline:dl};
  if(gdraft.baseHand||!gdraft.start.enough) body.baseline=gdraft.baseline/100;   // sent only when you set it yourself, or when there is too little data to count it; otherwise the server counts it
  if(gdraft.baseline<5){err.textContent='This behavior is already low, so there is nothing to lower yet.';return}
  if(gdraft.target>gdraft.baseline-5){err.textContent='The target must be at least 5 points lower than the starting level.';return}
  if(!dl||isNaN(dl)||dl<=Date.now()){err.textContent='Pick a deadline that is still ahead of you.';return}
  api('POST','goals',null,body).then(function(r){
    S.goals.push(mapGoal(r));gdraft.title='';gdraft.baseHand=false;render();toast('Goal set. Its score follows your logged events automatically.');
  }).catch(apiFail);
}
function patternNameOf(g){
  var p=GOAL_PATTERNS.filter(function(x){return x.id===g.pattern})[0];
  return p?p.name:g.pattern;
}
/* ---------- subtasks: a goal can have a checklist, which can nest ---------- */
function getSubNode(list,path){
  if(path==='') return null;
  var idx=path.split('-').map(Number),node=null,arr=list;
  idx.forEach(function(i){node=arr[i];arr=node?node.children:[]});
  return node;
}
function goalRate(g){return g.progress||0}
function openAddSubtask(goalId,path){
  modal('<h2>'+(path===''?'Add a subtask':'Add a sub-item')+'</h2><label class="fld"><span>Title</span><input id="subTitle" type="text" maxlength="80" autocomplete="off"></label><div class="acts"><button class="btn" data-close>Cancel</button><button class="btn primary" data-act="confirmaddsub" data-id="'+goalId+'" data-path="'+path+'">Add</button></div>');
  setTimeout(function(){var i=$('#subTitle');if(i)i.focus()},30);
}
function confirmAddSub(goalId,path){
  var g=S.goals.filter(function(x){return x.id===goalId})[0],v=$('#subTitle');
  if(!g||!v||!v.value.trim()) return;
  var par=path===''?null:getSubNode(g.subtasks,path),b={title:v.value.trim()};if(par) b.parent_id=+par.id;
  api('POST','goals',{id:goalId,a:'subtask'},b).then(function(r){replaceGoal(r);closeModal();render();toast('Subtask added.')}).catch(apiFail);
}
function toggleSub(goalId,path){
  var g=S.goals.filter(function(x){return x.id===goalId})[0];if(!g) return;
  var node=getSubNode(g.subtasks,path);if(!node) return;
  var want=!node.done;
  api('PUT','goals',{a:'subtask',sid:node.id},{done:want}).then(function(r){var ng=replaceGoal(r);if(want) sfx('add');beeEvent(ng,r);render()}).catch(function(e){render();apiFail(e)});
}
function delSub(goalId,path){
  var g=S.goals.filter(function(x){return x.id===goalId})[0];if(!g) return;
  var idx=path.split('-').map(Number),arr=g.subtasks;
  for(var i=0;i<idx.length-1;i++){arr=arr[idx[i]].children}
  var gone=arr[idx[idx.length-1]];
  api('DELETE','goals',{a:'subtask',sid:gone.id}).then(function(r){replaceGoal(r);render();toast('Subtask removed.')}).catch(apiFail);
}
function subtaskTree(goalId,nodes,prefix){
  if(!nodes||!nodes.length) return '';
  return '<ul class="subtree">'+nodes.map(function(n,i){
    var path=prefix===''?String(i):prefix+'-'+i;
    var hasKids=n.children&&n.children.length;
    var kidRate=hasKids?n.rate:null;
    return '<li><label class="subrow"><input type="checkbox" data-act="togglesub" data-id="'+goalId+'" data-path="'+path+'"'+(n.done?' checked':'')+(hasKids?' disabled':'')+'><span>'+esc(n.title)+'</span>'+(hasKids?' <b class="hint">'+Math.round(kidRate*100)+'%</b>':'')+'</label>'+
      '<span class="subacts"><button type="button" class="linkbtn" data-act="opensub" data-id="'+goalId+'" data-path="'+path+'">+ sub-item</button><button type="button" class="iconbtn" data-act="delsub" data-id="'+goalId+'" data-path="'+path+'" aria-label="Remove '+esc(n.title)+'">'+TRASH+'</button></span>'+
      subtaskTree(goalId,n.children,path)+
      '</li>';
  }).join('')+'</ul>';
}
/* ---------- bee: awarded once a goal crosses 50% before its own deadline ---------- */
function beeEvent(g,r){   // the server decides when a bee arrives
  if(!r||!r.bee_event) return;
  g.beeAwarded=true;refreshWallet().then(function(){render()});
  toast('A bee is buzzing around your garden — halfway to "'+esc(g.title)+'", with time to spare!');sfx('bloom');
}
function setManual(id){
  var r=$('.mp-range[data-id="'+id+'"]');if(!r) return;
  api('POST','goals',{id:id,a:'manual'},{progress:+r.value/100}).then(function(res){var ng=replaceGoal(res);beeEvent(ng,res);render();toast('Progress set to '+r.value+'%. It stays until you log something new for this behavior.')}).catch(apiFail);
}
function useAuto(id){
  api('DELETE','goals',{id:id,a:'manual'}).then(function(res){replaceGoal(res);render();toast('Back to the automatic score.')}).catch(apiFail);
}
function finishGoal(id){
  var g0=S.goals.filter(function(x){return x.id===id})[0];
  if(!g0||g0.status!=='active') return;
  api('POST','goals',{id:id,a:'close'}).then(function(r){
    var g=replaceGoal(r.goal),rate=r.progress,result=r.result,pts=r.coins,dPts=r.diamonds;
    return refreshWallet().then(function(){
      render();
  if(result!=='none'){sfx('bloom');burst(innerWidth/2,innerHeight/2,22)}
  var p100=Math.round(rate*100), html;
  var diaLine=dPts!==0?'<p>Diamonds: <b>'+(dPts>0?'+':'')+dPts+'</b>'+(dPts<0?' (closed after the deadline)':'')+'</p>':'';
  if(result==='bird') html='<div class="big">'+birdSVG()+'</div><h2>A bird has landed in your garden</h2><p>You brought "'+esc(g.title)+'" down to '+pct(g.current)+', past your target of '+pct(g.target)+'. That is '+p100+'% of the way. Coins: <b>+'+pts+'</b>.</p>'+diaLine;
  else if(result==='butterfly') html='<div class="big">'+butterflySVG()+'</div><h2>A butterfly has arrived</h2><p>You reached '+p100+'% of the change you set out to make on "'+esc(g.title)+'". Coins: <b>+'+pts+'</b>.</p>'+diaLine;
  else if(pts>0) html='<h2>Goal closed at '+p100+'%</h2><p>No garden visitor this time. A butterfly needs 70%. You still earned <b>+'+pts+'</b> coins for the progress.</p>'+diaLine;
  else html='<h2>Goal closed at '+Math.max(p100,0)+'%</h2><p>The pattern is still strong, and that costs <b>'+pts+'</b> coins. Try a smaller target next time and change it a little each week.</p>'+diaLine;
  modal(html+'<div class="acts"><button class="btn" data-close>Close</button>'+(result!=='none'?'<button class="btn primary" data-act="nav" data-page="garden" data-close>See it in the garden</button>':'')+'</div>');
    });
  }).catch(apiFail);
}

/* ---------- toasts and modal ---------- */
function toast(msg,action){
  var box=$('#toasts'),el=document.createElement('div');
  el.className='toast';
  el.innerHTML='<span>'+msg+'</span>'+(action?'<button class="toast-btn" data-act="'+action.act+'" '+(action.attrs||'')+'>'+action.label+'</button>':'');
  box.appendChild(el);
  setTimeout(function(){el.remove()},action?7000:4200);
}
function modal(html){
  var m=document.createElement('div');
  m.className='overlay';
  m.innerHTML='<div class="dialog" role="dialog" aria-modal="true">'+html+'</div>';
  document.body.appendChild(m);
  m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-close]'))m.remove()});
  var b=$('button',m);if(b)b.focus();
}

/* ---------- views: header ---------- */
function header(){
  var bal=balance(), dia=diamonds(), first=S.user.name.charAt(0).toUpperCase();
  var items=[['tasks','Tasks'],['events','Events'],['garden','Garden'],['goals','Goals'],['insights','Insights'],['pets','Pets']];
  return '<header class="top"><div class="wrap topin">'+
    '<button class="brand" data-act="nav" data-page="tasks" aria-label="BehavioralX home">'+LOGO+'<span>BehavioralX</span></button>'+
    '<nav class="nav" aria-label="Main">'+items.map(function(i){return '<button data-act="nav" data-page="'+i[0]+'"'+(curNav()===i[0]?' aria-current="page"':'')+'>'+NAVICON[i[0]]+i[1]+'</button>'}).join('')+'</nav>'+
    '<div class="topr"><button class="coinpill'+(lastBal!==null&&lastBal!==bal?' bump':'')+'" data-act="coins" aria-label="Coin balance '+bal+'. Open coin history">'+COIN+'<span>'+bal+'</span></button>'+
    '<button class="coinpill dia'+(lastDia!==null&&lastDia!==dia?' bump':'')+'" data-act="diamonds" aria-label="Diamond balance '+dia+'. Open diamond history">'+DIAMOND+'<span>'+dia+'</span></button>'+
    themeBtn()+notesMenu()+'<div class="menuwrap"><button class="avatar" data-act="menu" aria-haspopup="true" aria-label="Account menu">'+avatarInner()+'</button>'+
    '<div class="menu" hidden><div class="who"><b>'+esc(dispName())+'</b><span>'+esc(S.user.email)+'</span></div><button data-act="nav" data-page="profile">My profile</button><button data-act="reset">Reset my data</button><button data-act="logout">Log out</button></div></div></div>'+
    '</div></header>';
}

/* ---------- views: tasks ---------- */
function rowPending(t){
  var left=t.deadline-Date.now(), c=dcls(t.difficulty);
  return '<li class="row d-'+c+'"><span class="glyph">'+plantSVG(kindOf(t.difficulty),0)+'</span>'+
    '<div class="rmain"><div class="rtitle">'+esc(t.title)+'</div><div class="rmeta"><span class="tag">'+typeLabel(t.type)+'</span>'+
    '<span class="badge b-'+c+'">'+(t.difficulty==='N/A'?'No rating':t.difficulty)+'</span><span>'+t.value+' coins</span>'+
    '<span class="dl '+(left<0?'over':left<6*HOUR?'soon':'')+'"><b data-left="'+t.deadline+'">'+fmtLeft(left)+'</b>, '+fmtDate(t.deadline)+'</span></div></div>'+
    '<div class="ract"><button class="btn small" data-act="logfor" data-id="'+t.id+'">Log behavior</button><button class="btn small primary" data-act="complete" data-id="'+t.id+'">Complete</button>'+
    '<button class="iconbtn" data-act="remove" data-id="'+t.id+'" aria-label="Remove task '+esc(t.title)+'">'+TRASH+'</button></div></li>';
}
function rowDone(t){
  var c=dcls(t.difficulty), tm=t.timing==='early'?'Finished early':t.timing==='late'?'Finished late':'Finished on time';
  return '<li class="row d-'+c+'"><span class="glyph">'+plantSVG(kindOf(t.difficulty),t.plant?t.plant.v:0)+'</span>'+
    '<div class="rmain"><div class="rtitle">'+esc(t.title)+'</div><div class="rmeta"><span class="tag">'+typeLabel(t.type)+'</span>'+
    '<span class="badge b-'+c+'">'+(t.difficulty==='N/A'?'No rating':t.difficulty)+'</span><span>'+tm+', '+fmtShort(t.completedAt)+'</span><span><b>+'+t.coins+'</b> coins</span></div></div></li>';
}
function addPanel(){
  return '<section class="plant-panel" aria-labelledby="add-h"><h2 id="add-h">Plant a new task</h2>'+
  '<form id="taskForm" novalidate>'+
  '<label class="fld"><span>What do you want to get done?</span><input id="f-title" type="text" maxlength="90" placeholder="For example: finish the chemistry report" value="'+esc(draft.title)+'" autocomplete="off"></label>'+
  '<fieldset class="fld"><legend>Type</legend><div class="chips">'+TYPES.map(function(t){return '<label class="chip"><input type="radio" name="type" value="'+t.id+'"'+(draft.type===t.id?' checked':'')+'><span>'+t.label+'</span></label>'}).join('')+'</div></fieldset>'+
  '<div class="two"><label class="fld"><span>Deadline</span><input id="f-deadline" type="datetime-local" value="'+draft.deadline+'" min="'+toLocalInput(Date.now())+'"></label>'+
  '<fieldset class="fld"><legend>Effort you expect</legend><div class="seg">'+['Low','Medium','High'].map(function(e){return '<label class="chip"><input type="radio" name="effort" value="'+e+'"'+(draft.effort===e?' checked':'')+(draft.skip?' disabled':'')+'><span>'+e+'</span></label>'}).join('')+'</div></fieldset></div>'+
  '<div class="quick"><span>Set deadline:</span><button type="button" class="btn small" data-act="quick" data-q="3h">In 3 hours</button><button type="button" class="btn small" data-act="quick" data-q="eve">Tomorrow evening</button><button type="button" class="btn small" data-act="quick" data-q="3d">In 3 days</button><button type="button" class="btn small" data-act="quick" data-q="1w">Next week</button></div>'+
  '<label class="check"><input type="checkbox" id="f-skip"'+(draft.skip?' checked':'')+'><span>Skip the difficulty rating for this task. It earns 1 coin and grows a tuft of grass.</span></label>'+
  '<div class="preview" id="preview" aria-live="polite"></div>'+
  '<details class="hint" style="margin-bottom:14px"><summary style="cursor:pointer">How difficulty is calculated</summary><p style="margin-top:6px">Score = 0.4 × time pressure (1 ÷ days given) + 0.6 × effort, plus up to 0.1 from how often you were late on this type of task. Under 0.30 is Easy, under 0.55 is Medium, anything higher is Hard.</p></details>'+
  '<p class="err" id="taskErr" role="alert"></p><button class="btn primary" type="submit">Add task</button></form></section>';
}
function walletPanel(){
  var tx=S.tx.slice().sort(function(a,b){return b.at-a.at}).slice(0,showAllTx?40:6);
  return '<section class="wallet" aria-labelledby="w-h"><div class="wtop"><span id="w-h">Coin balance</span><div class="wbal">'+COIN+'<b>'+balance()+'</b></div></div>'+
  '<h3>What tasks pay</h3><dl class="rules"><dt>Easy</dt><dd>5</dd><dt>Medium</dt><dd>10</dd><dt>Hard</dt><dd>20</dd><dt>No rating</dt><dd>1</dd></dl>'+
  '<p class="fine">Finish with a quarter of your time still left and you earn 50% extra. Finish after the deadline and you earn half.</p>'+
  '<h3>Recent activity</h3><ul class="ledger">'+tx.map(function(t){return '<li><span>'+esc(t.reason)+'<small>'+fmtShort(t.at)+'</small></span><span class="'+(t.amount>=0?'plus':'minus')+'">'+(t.amount>=0?'+':'')+t.amount+'</span></li>'}).join('')+'</ul>'+
  '<button class="linkbtn" data-act="alltx">'+(showAllTx?'Show less':'Show more')+'</button></section>';
}
function pageTasks(){
  var pending=S.tasks.filter(function(t){return t.status==='pending'}).sort(function(a,b){return a.deadline-b.deadline});
  var done=S.tasks.filter(function(t){return t.status==='completed'}).sort(function(a,b){return b.completedAt-a.completedAt});
  var first=dispName();
  var sum=pending.length?pending.length+' pending. Next up: "'+pending[0].title+'", '+fmtLeft(pending[0].deadline-Date.now()).toLowerCase()+'.':'Nothing is pending. Add a task and it will grow into your garden.';
  var overdue=pending.filter(isOverdue).length;
  var cheer=overdue?'Some tasks are past due. Small steps still count, so try the easiest one first.':pending.length?sum:'All caught up! Add a new task and let us grow something.';
  return '<main class="wrap page"><div class="pagehead headrow"><div class="hello"><div class="mascot-wrap">'+mascot({mood:pending.length?'happy':'cheer'})+'</div><div><h1>'+greet()+', '+esc(first)+'</h1><p class="bubble">'+esc(cheer)+'</p></div></div><button class="btn" data-act="newev">Log an event</button></div>'+weekStrip()+
  '<div class="cols"><div class="stack">'+addPanel()+
  '<section aria-labelledby="pend-h"><div class="sh"><h2 id="pend-h">Pending</h2><span class="count">'+pending.length+'</span></div>'+
  (pending.length?'<ul class="rows">'+pending.map(rowPending).join('')+'</ul>':emptyHTML('Nothing here yet. Use the form above to add your first task, and set a deadline you can keep.','sleepy'))+'</section>'+
  '<section aria-labelledby="done-h"><div class="sh"><h2 id="done-h">Completed</h2><span class="count">'+done.length+'</span></div>'+
  (done.length?'<ul class="rows">'+done.slice(0,6).map(rowDone).join('')+'</ul>'+(done.length>6?'<p class="hint pad">The full record lives on the Garden page.</p>':''):emptyHTML('Finished tasks show up here with the plant they grew.','happy'))+'</section>'+
  '</div><aside class="side">'+walletPanel()+'</aside></div></main>';
}

/* ---------- views: garden ---------- */
function sceneSVG(){
  return '<svg class="scene" viewBox="0 0 800 450" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'+
  '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-a)"/><stop offset="1" style="stop-color:var(--sky-b)"/></linearGradient>'+
  '<linearGradient id="mead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--meadow-a)"/><stop offset="1" style="stop-color:var(--meadow-b)"/></linearGradient></defs>'+
  '<rect width="800" height="450" fill="url(#sky)"/>'+
  '<g style="opacity:var(--stars)" fill="#fff"><circle cx="90" cy="50" r="1.5"/><circle cx="210" cy="90" r="1.2"/><circle cx="330" cy="40" r="1.6"/><circle cx="450" cy="100" r="1.2"/><circle cx="540" cy="45" r="1.5"/><circle cx="740" cy="130" r="1.3"/><circle cx="150" cy="140" r="1"/><circle cx="600" cy="150" r="1"/></g>'+
  '<circle cx="660" cy="86" r="62" style="fill:var(--orb);opacity:.28"/><circle cx="660" cy="86" r="34" style="fill:var(--orb)"/>'+
  '<g class="cloud" style="opacity:var(--cloud)" fill="#fff"><ellipse cx="170" cy="80" rx="46" ry="14"/><ellipse cx="205" cy="70" rx="30" ry="14"/><ellipse cx="420" cy="130" rx="54" ry="15"/><ellipse cx="455" cy="118" rx="32" ry="14"/></g>'+
  '<path d="M0 235C120 192 260 205 380 228S620 190 800 222L800 450L0 450Z" style="fill:var(--hill-a)"/>'+
  '<path d="M0 262C160 226 300 252 460 246S700 226 800 252L800 450L0 450Z" style="fill:var(--hill-b)"/>'+
  '<path d="M0 274C200 254 350 274 520 266S720 258 800 268L800 450L0 450Z" fill="url(#mead)"/></svg>';
}
function plantEl(t,i){
  var p=t.plant,k=kindOf(t.difficulty);
  var base={sprout:6.5,grass:5.5,flower:8.5,tree:14}[k];
  var w=base*(.72+.5*clamp((p.y-58)/36,0,1));
  var fresh=S.fresh===t.id, grow=gardenIntro||fresh;
  var d=fresh?(gardenIntro?1.4:.1):Math.min(i*.05,1.1);
  var tip=t.title+'. '+(t.difficulty==='N/A'?'No rating':t.difficulty)+', '+t.coins+' coins, '+(p.wilted?'finished late and a little wilted, ':'')+fmtShort(t.completedAt);
  return '<button class="plant'+(grow?' grow':'')+(fresh?' fresh':'')+(p.wilted?' wilted':'')+'" style="left:'+p.x.toFixed(2)+'%;top:'+p.y.toFixed(2)+'%;width:'+w.toFixed(2)+'%;z-index:'+Math.round(p.y*10)+';--d:'+d+'s" data-tip="'+esc(tip)+'" aria-label="'+esc(tip)+'"><span class="sway">'+plantSVG(k,p.v,p.wilted)+'</span></button>';
}
function pendingPlantEl(t){
  if(!t.gpos) return '';
  var frac=clamp((Date.now()-t.created)/Math.max(t.deadline-t.created,1),0,1);
  var k=kindOf(t.difficulty);
  var base={sprout:6.5,grass:5.5,flower:8.5,tree:14}[k];
  var scale=.28+.55*frac;
  var w=base*scale*(.72+.5*clamp((t.gpos.y-58)/36,0,1));
  var overdue=isOverdue(t);
  var tip=t.title+' is growing, '+Math.round(frac*100)+'% of the way to its deadline'+(overdue?' (overdue)':'');
  return '<div class="plant growing'+(overdue?' overduegrow':'')+'" style="left:'+t.gpos.x.toFixed(2)+'%;top:'+t.gpos.y.toFixed(2)+'%;width:'+w.toFixed(2)+'%;z-index:'+Math.round(t.gpos.y*10)+'" data-tip="'+esc(tip)+'"><span class="sway">'+plantSVG(k,0,false)+'</span></div>';
}
function decoEl(d){
  var label=d.kind==='bird'?'Bird':(d.kind==='bee'?'Bee':'Butterfly');
  var tip=label+' for the goal "'+d.title+'"';
  var cls=d.kind==='bird'?'bird':(d.kind==='bee'?'bee fly':'fly');
  var art=d.kind==='bird'?birdSVG():(d.kind==='bee'?beeSVG():butterflySVG());
  return '<div class="deco '+cls+'" style="left:'+d.x.toFixed(1)+'%;top:'+d.y.toFixed(1)+'%" data-tip="'+esc(tip)+'" tabindex="0" role="img" aria-label="'+esc(tip)+'">'+art+'</div>';
}
function inGardenRange(ts){
  if(gardenRange==='all'||!ts) return true;
  var d=new Date(ts),now=new Date();
  if(gardenRange==='daily') return d.toDateString()===now.toDateString();
  if(gardenRange==='weekly'){var dow=(now.getDay()+6)%7,start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow);return ts>=+start}
  if(gardenRange==='monthly') return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
  return true;
}
function buckets(mode){
  var now=new Date(),out=[],i,s,e;
  if(mode==='daily'){for(i=6;i>=0;i--){s=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+1);out.push({start:+s,end:+e,label:s.toLocaleDateString(undefined,{weekday:'short'})})}}
  else if(mode==='weekly'){var dow=(now.getDay()+6)%7;for(i=7;i>=0;i--){s=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow-7*i);e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+7);out.push({start:+s,end:+e,label:fmtShort(+s)})}}
  else{for(i=5;i>=0;i--){s=new Date(now.getFullYear(),now.getMonth()-i,1);e=new Date(now.getFullYear(),now.getMonth()-i+1,1);out.push({start:+s,end:+e,label:s.toLocaleDateString(undefined,{month:'short'})})}}
  return out;
}
function chartSection(){
  var B=buckets(chartMode),done=S.tasks.filter(function(t){return t.status==='completed'});
  var tot=0,coins=0,ok=0;
  B.forEach(function(b){
    b.c={'N/A':0,Easy:0,Medium:0,Hard:0};b.total=0;
    done.forEach(function(t){if(t.completedAt>=b.start&&t.completedAt<b.end){b.c[t.difficulty]++;b.total++;coins+=t.coins;if(t.timing!=='late')ok++}});
    tot+=b.total;
  });
  var mx=Math.max(3,Math.max.apply(null,B.map(function(b){return b.total})));
  var step=mx<=5?1:mx<=10?2:Math.ceil(mx/5), yMax=Math.ceil(mx/step)*step;
  var W=640,H=250,L=34,R=8,T=16,Bm=30,pw=W-L-R,ph=H-T-Bm,slot=pw/B.length,bw=Math.min(46,slot*.58),svg='',v;
  for(v=0;v<=yMax;v+=step){var yy=T+ph-v/yMax*ph;svg+='<line class="gridl" x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'"/><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end">'+v+'</text>'}
  var colors={'N/A':'var(--na)',Easy:'var(--easy)',Medium:'var(--med)',Hard:'var(--hard)'};
  B.forEach(function(b,i){
    var x=L+slot*i+(slot-bw)/2,acc=0;
    ['N/A','Easy','Medium','Hard'].forEach(function(k){
      if(!b.c[k]) return;
      var h=b.c[k]/yMax*ph,y=T+ph-acc-h;acc+=h;
      svg+='<rect class="seg" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="3" fill="'+colors[k]+'" stroke="var(--surface)" stroke-width="1.5"><title>'+b.label+': '+b.c[k]+' '+(k==='N/A'?'unrated':k.toLowerCase())+'</title></rect>';
    });
    if(b.total) svg+='<text class="val" x="'+(x+bw/2).toFixed(1)+'" y="'+(T+ph-acc-6).toFixed(1)+'" text-anchor="middle">'+b.total+'</text>';
    svg+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle">'+esc(b.label)+'</text>';
  });
  var avg=tot/B.length,ay=T+ph-avg/yMax*ph;
  if(tot) svg+='<line class="avg" x1="'+L+'" x2="'+(W-R)+'" y1="'+ay.toFixed(1)+'" y2="'+ay.toFixed(1)+'"/><text x="'+(W-R)+'" y="'+(ay-5).toFixed(1)+'" text-anchor="end">average '+avg.toFixed(1)+'</text>';
  var modes=[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']];
  var span=chartMode==='daily'?'the last 7 days':chartMode==='weekly'?'the last 8 weeks':'the last 6 months';
  return '<section class="chartsec" id="chartsec" aria-labelledby="ch-h"><div class="chead"><h2 id="ch-h">Your progress</h2>'+
  '<div class="tabs" role="tablist" aria-label="Chart range">'+modes.map(function(m){return '<button role="tab" data-act="chart" data-mode="'+m[0]+'" aria-selected="'+(chartMode===m[0])+'">'+m[1]+'</button>'}).join('')+'</div></div>'+
  '<p class="hint">Tasks completed over '+span+', colored by the plant they grew.</p>'+
  '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Stacked bar chart of completed tasks over '+span+'">'+svg+'</svg>'+
  '<div class="chart-legend"><span><i style="background:var(--easy)"></i>Easy</span><span><i style="background:var(--med)"></i>Medium</span><span><i style="background:var(--hard)"></i>Hard</span><span><i style="background:var(--na)"></i>No rating</span></div>'+
  '<div class="stats"><div><b>'+tot+'</b><span>Tasks done</span></div><div><b>'+coins+'</b><span>Coins earned</span></div><div><b>'+(tot?Math.round(ok/tot*100)+'%':'0%')+'</b><span>On time or early</span></div></div></section>';
}
function recordPanel(){
  var pending=S.tasks.filter(function(t){return t.status==='pending'}).sort(function(a,b){return a.deadline-b.deadline});
  var done=S.tasks.filter(function(t){return t.status==='completed'}).sort(function(a,b){return b.completedAt-a.completedAt});
  var pl=pending.map(function(t){
    var left=t.deadline-Date.now(),c=dcls(t.difficulty);
    return '<li><span class="glyph">'+plantSVG(kindOf(t.difficulty),0)+'</span><div class="rmain"><div class="rtitle">'+esc(t.title)+'</div><div class="rmeta"><span class="badge b-'+c+'">'+(t.difficulty==='N/A'?'No rating':t.difficulty)+'</span><span class="dl '+(left<0?'over':left<6*HOUR?'soon':'')+'"><b data-left="'+t.deadline+'">'+fmtLeft(left)+'</b></span></div></div><button class="btn small primary" data-act="complete" data-id="'+t.id+'">Complete</button></li>';
  }).join('');
  var dl=done.map(function(t){
    var c=dcls(t.difficulty),tm=t.timing==='early'?'Early':t.timing==='late'?'Late':'On time';
    return '<li><span class="glyph">'+plantSVG(kindOf(t.difficulty),t.plant?t.plant.v:0,t.plant&&t.plant.wilted)+'</span><div class="rmain"><div class="rtitle">'+esc(t.title)+'</div><div class="rmeta"><span class="badge b-'+c+'">'+tm+'</span><span>'+fmtShort(t.completedAt)+'</span><span><b>+'+t.coins+'</b></span></div></div></li>';
  }).join('');
  return '<section class="record" aria-labelledby="rec-h"><h2 id="rec-h">Task record</h2>'+
  '<h3 class="sub">In progress ('+pending.length+')</h3><ul class="mini">'+(pl||'<li class="muted pad">No open tasks. Add one on the Tasks page.</li>')+'</ul>'+
  '<h3 class="sub">Completed ('+done.length+')</h3><ul class="mini scroll">'+(dl||'<li class="muted pad">Finished tasks will be listed here.</li>')+'</ul></section>';
}
function pageGarden(){
  var allPlants=S.tasks.filter(function(t){return t.status==='completed'&&t.plant});
  var plants=allPlants.filter(function(t){return inGardenRange(t.completedAt)}).sort(function(a,b){return a.completedAt-b.completedAt});
  var pendingGrow=S.tasks.filter(function(t){return t.status==='pending'&&t.gpos});
  var decos=S.decos.filter(function(d){return inGardenRange(d.at)});
  var ranges=[['all','All time'],['daily','Today'],['weekly','This week'],['monthly','This month']];
  var html='<main class="wrap page"><div class="pagehead"><h1>Your garden</h1><p class="lede">'+allPlants.length+' plants, '+S.decos.length+' visitors, and '+S.pets.length+(S.pets.length===1?' pet':' pets')+' so far. Every finished task grows something, and goals bring in bees, birds and butterflies.</p></div>'+
  '<div class="cols"><div class="stack"><div>'+
  '<div class="tabs" role="tablist" aria-label="Garden range" style="margin-bottom:12px">'+ranges.map(function(r){return '<button role="tab" data-act="gr" data-r="'+r[0]+'" aria-selected="'+(gardenRange===r[0])+'">'+r[1]+'</button>'}).join('')+'</div>'+
  '<div class="garden" id="garden">'+sceneSVG()+
  '<div class="plants">'+plants.map(plantEl).join('')+pendingGrow.map(pendingPlantEl).join('')+'</div>'+decos.map(decoEl).join('')+gardenHomes()+gardenPets()+
  (plants.length||pendingGrow.length?'':'<div class="g-empty"><span class="mini-m">'+mascot({mood:'sleepy'})+'</span><b>Your garden is waiting.</b><p class="hint">Add a task and complete it, and the first plant will grow right here.</p></div>')+
  '<div class="tip" id="tip" hidden></div></div>'+
  '<ul class="legend"><li>'+plantSVG('sprout',0)+'Easy: sprout</li><li>'+plantSVG('flower',0)+'Medium: flower</li><li>'+plantSVG('tree',0)+'Hard: blossom tree</li><li>'+plantSVG('grass',0)+'No rating: grass</li><li class="sm">'+beeSVG().replace('<svg','<svg class="sm"')+'Goal 50% on time: bee</li><li class="sm">'+birdSVG().replace('<svg','<svg class="sm"')+'Goal 100%: bird</li><li>'+butterflySVG().replace('<svg','<svg class="sm"')+'Goal 70%: butterfly</li></ul>'+
  '<p class="hint">A plant finished after its deadline comes in a little wilted. Pending tasks grow gradually in place as their deadline gets closer.</p></div>'+
  chartSection()+'</div><aside class="side">'+recordPanel()+'</aside></div></main>';
  return html;
}

/* ---------- views: goals ---------- */
function spark(g){
  var h=g.history.slice(-8),W=190,H=70,pl=8,pr=8;
  function x(i){return h.length<2?W/2:pl+(W-pl-pr)*i/(h.length-1)}
  function y(v){return 8+(H-20)*(1-clamp(v,0,1))}
  var pts=h.map(function(p,i){return x(i).toFixed(1)+','+y(p.score).toFixed(1)}).join(' ');
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Score history from '+pct(h[0].score)+' to '+pct(h[h.length-1].score)+'">'+
  '<line class="base" x1="0" x2="'+W+'" y1="'+y(g.baseline)+'" y2="'+y(g.baseline)+'"/><line class="tgt" x1="0" x2="'+W+'" y1="'+y(g.target)+'" y2="'+y(g.target)+'"/>'+
  '<text x="2" y="'+(y(g.target)-3)+'">target '+pct(g.target)+'</text><text x="2" y="'+(y(g.baseline)-3)+'">start '+pct(g.baseline)+'</text>'+
  (h.length>1?'<polyline class="ln" points="'+pts+'"/>':'')+
  h.map(function(p,i){return '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p.score).toFixed(1)+'" r="3"/>'}).join('')+
  '<text x="'+W/2+'" y="'+(H-2)+'" text-anchor="middle">score history</text></svg>';
}
function daysLeft(ms){var d=Math.ceil(ms/DAY);return d+(d===1?' day':' days')}
function goalCard(g){
  var patName=patternNameOf(g),rate=goalRate(g),p=Math.round(clamp(rate,0,1)*100),left=g.deadline-Date.now();
  var hasSub=g.subtasks&&g.subtasks.length,man=!hasSub&&g.progressSource==='manual';
  var progressBlock=hasSub
    ?('<div class="track" role="progressbar" aria-valuenow="'+p+'" aria-valuemin="0" aria-valuemax="100" aria-label="Subtasks complete"><span class="fill" style="width:'+p+'%"></span></div>'+
     '<div class="scale"><span>Subtasks complete</span><b>'+p+'%</b><span></span></div>'+
     '<p class="gpct">'+p+'% of the way there'+(rate>=1?'. Target reached.':rate>=.7?'. In butterfly range.':'.')+'</p>')
    :('<div class="track" role="progressbar" aria-valuenow="'+p+'" aria-valuemin="0" aria-valuemax="100" aria-label="Progress toward target"><span class="fill" style="width:'+p+'%"></span></div>'+
     '<div class="scale"><span>Started '+pct(g.baseline)+'</span><b>Now '+pct(g.current)+(man?' (live)':'')+'</b><span>Target '+pct(g.target)+'</span></div>'+
     '<p class="gpct">'+p+'% of the way there'+(rate>=1?'. Target reached.':rate>=.7?'. In butterfly range.':'.')+'</p>');
  return '<article class="goal"><div class="ghead"><div><h3>'+esc(g.title)+'</h3><div class="rmeta"><span class="tag">'+esc(patName)+'</span><span class="dl '+(left<0?'over':'')+'"><b>'+(left<0?'Deadline passed':daysLeft(left)+' left')+'</b>, '+fmtShort(g.deadline)+'</span></div></div>'+
  '<button class="iconbtn" data-act="gremove" data-id="'+g.id+'" aria-label="Remove goal '+esc(g.title)+'">'+TRASH+'</button></div>'+
  '<div class="gbody"><div>'+progressBlock+'</div>'+(hasSub?'<div class="hint">The score chart returns once subtasks are cleared.</div>':spark(g))+'</div>'+
  '<div class="subroot"><b class="hint">Subtasks</b>'+subtaskTree(g.id,g.subtasks,'')+
  '<button type="button" class="btn small" style="margin-top:8px" data-act="opensub" data-id="'+g.id+'" data-path="">+ Add subtask</button></div>'+
  (hasSub?'':('<div class="manual">'+(man?'<p class="gpct"><span class="tag">Set by you</span> Progress is held at <b>'+p+'%</b> until a new event or routine task is logged for this behavior. <button type="button" class="linkbtn" data-act="useauto" data-id="'+g.id+'">Use automatic</button></p>'
    :'<p class="hintline">'+calcHint(g)+'</p>')+
  '<details><summary>Set progress by hand</summary><label class="fld" for="mp-'+g.id+'"><span>Progress <output>'+p+'%</output></span></label>'+
  '<input id="mp-'+g.id+'" class="mp-range" data-id="'+g.id+'" type="range" min="0" max="100" value="'+p+'">'+
  '<button class="btn small" data-act="setmanual" data-id="'+g.id+'">Save progress</button></details></div>'))+
  '<div style="margin-top:12px"><button class="btn small ghost" data-act="finish" data-id="'+g.id+'">Close goal</button></div></article>';
}
function startBlock(){
  var st=gdraft.start,tm=targetMax(),au=autoPct(),b=gdraft.baseline;
  var tgt='<label class="fld"><span>Where do you want it? <output id="o-target">'+Math.min(gdraft.target,tm)+'%</output></span><input id="g-target" type="range" min="0" max="'+tm+'" step="1" value="'+Math.min(gdraft.target,tm)+'"></label>';
  var base='<label class="fld"><span>How strong is it now? <output id="o-base">'+b+'%</output></span><input id="g-base" type="range" min="5" max="100" step="1" value="'+b+'"></label>';
  var note;
  if(!st) note='<p class="hint" id="baseNote">Counting your logged events…</p>';
  else if(st.enough) note='<p class="hint" id="baseNote">'+(gdraft.baseHand&&b!==au
      ?'You set this yourself. Your logged events say <b>'+au+'%</b> (based on '+st.relevant+' relevant events in the last 30 days). <button type="button" class="linkbtn" data-act="useautostart">Use '+au+'%</button>'
      :'Automatic: <b>'+au+'%</b>, counted from '+st.relevant+' relevant events in the last 30 days ('+st.matches+' matched, '+st.healthy+' healthy). Drag the bar if you want a different starting level.')+'</p>';
  else note='<p class="hint" id="baseNote">Only '+st.relevant+' relevant '+(st.relevant===1?'event is':'events are')+' logged for this behavior in the last 30 days, and 5 are needed to count it automatically. Set how strong it is now.</p>';
  return '<div class="two">'+base+tgt+'</div>'+note;
}
function pageGoals(){
  var active=S.goals.filter(function(g){return g.status==='active'}).sort(function(a,b){return a.deadline-b.deadline});
  var closed=S.goals.filter(function(g){return g.status==='done'}).sort(function(a,b){return b.closedAt-a.closedAt});
  var pat=GOAL_PATTERNS.filter(function(p){return p.id===gdraft.pattern})[0];
  var form='<section class="plant-panel sky" aria-labelledby="ag-h"><h2 id="ag-h">What do you want to change?</h2><form id="goalForm" novalidate>'+
  '<label class="fld"><span>Your goal, in your words</span><input id="g-title" type="text" maxlength="90" placeholder="For example: start assignments the day they are given" value="'+esc(gdraft.title)+'" autocomplete="off"></label>'+
  '<fieldset class="fld"><legend>Behavior to reduce</legend><div class="chips">'+GOAL_PATTERNS.map(function(p){return '<label class="chip"><input type="radio" name="pattern" value="'+p.id+'"'+(gdraft.pattern===p.id?' checked':'')+'><span>'+p.name+'</span></label>'}).join('')+'</div><p class="hint" id="pat-hint">'+pat.hint+'</p>'+
  '</fieldset>'+
  startBlock()+
  '<label class="fld"><span>Deadline</span><input id="g-deadline" type="date" value="'+gdraft.deadline+'" min="'+dateInput(Date.now()+DAY)+'"></label>'+
  '<div class="quick"><span>Set deadline:</span><button type="button" class="btn small" data-act="gquick" data-q="14">2 weeks</button><button type="button" class="btn small" data-act="gquick" data-q="30">1 month</button><button type="button" class="btn small" data-act="gquick" data-q="90">3 months</button></div>'+
  '<p class="err" id="goalErr" role="alert"></p><button class="btn primary" type="submit">Set goal</button></form></section>';
  var ach=closed.filter(function(g){return g.result!=='none'}).map(function(g){
    var p=GOAL_PATTERNS.filter(function(x){return x.id===g.pattern})[0]||{badge:'Reached a New Milestone'};
    return '<div class="ach">'+(g.result==='bird'?birdSVG():butterflySVG())+'<div><b>'+p.badge+'</b><small>'+esc(g.title)+', closed '+fmtShort(g.closedAt)+'. +'+g.points+' coins</small></div></div>';
  }).join('');
  var missed=closed.filter(function(g){return g.result==='none'}).map(function(g){return '<li>'+esc(g.title)+': closed at '+Math.max(0,Math.round(g.completion*100))+'%, '+(g.points>=0?'+':'')+g.points+' coins</li>'}).join('');
  return '<main class="wrap page"><div class="pagehead"><h1>Goals</h1><p class="lede">Tasks are things you do. Goals are things you change about yourself. Set one, watch its score follow your logged events, and close it when the deadline arrives.</p></div>'+
  '<div class="cols"><div class="stack">'+form+
  '<section aria-labelledby="act-h"><div class="sh"><h2 id="act-h">Active goals</h2><span class="count">'+active.length+'</span></div>'+
  (active.length?'<div class="stack">'+active.map(goalCard).join('')+'</div>':'<div class="empty">No active goals. Set one above and pick a deadline you can stand behind.</div>')+'</section></div>'+
  '<aside class="side"><section class="info" aria-labelledby="how-h"><h2 id="how-h">How goals are scored</h2><p class="hint">Progress = (start − now) ÷ (start − target), kept between 0% and 100%. The start is the pattern\'s strength when you set the goal (counted from your logs when there are at least 5 relevant events, otherwise the level you enter). \"Now\" is the live strength of the behavior over the last 30 days. If a goal has subtasks, progress is the share you have checked off instead. You can also set progress by hand; it stays until a new event or routine task is logged for that behavior.</p><ul><li>50%, before the deadline: a bee visits your garden.</li><li>100% or more: a bird visits and you earn 40 coins.</li><li>70% or more: a butterfly arrives.</li><li>30% to 70%: coins in proportion, no visitor.</li><li>Below 30%: you lose 10 coins.</li></ul><p class="hint" style="margin-top:10px">Closing a goal at 30%+ also earns diamonds, scaled the same way — but only if you close it <b>before</b> its deadline. Closing late turns that same amount negative.</p></section>'+
  '<section class="record" aria-labelledby="ach-h"><h2 id="ach-h">Achievements</h2>'+(ach||'<p class="muted" style="margin-top:10px">Close a goal at 70% or better to earn your first badge and garden visitor.</p>')+
  (missed?'<h3 class="sub">Closed without a badge</h3><ul class="hint" style="padding-left:1.1rem;margin:0">'+missed+'</ul>':'')+'</section></aside></div></main>';
}

/* ---------- views: auth ---------- */
function pageAuth(){
  var su=authMode==='signup';
  var nodes=[['Context','Assignment due',-1],['Trigger','24 hours left',1],['Behavior','Opened social media',-1],['Decision','Chose to delay',1],['Outcome','Less time, low success',1]];
  var vine='<svg class="vine" viewBox="0 0 540 340" role="img" aria-label="A vine grows through five stops: context, trigger, behavior, decision and outcome">'+
  '<path id="vine" d="M52 272C132 272 130 196 214 196S312 180 328 128S404 74 470 62" fill="none" stroke="#7EE0A6" stroke-width="4" stroke-linecap="round"/>'+
  nodes.map(function(n,i){
    var last=i===4, ty=n[2]<0?-26:30, anchor=last?'end':'middle', tx=last?14:0;
    var mark=last?'<g>'+[0,1,2,3,4].map(function(k){return '<ellipse cx="0" cy="-11" rx="6" ry="9" transform="rotate('+(k*72)+')" fill="#F08DAE"/>'}).join('')+'<circle r="5" fill="#F5C242"/></g>':'<circle r="9" fill="#0E3527" stroke="#7EE0A6" stroke-width="3.5"/>';
    return '<g class="vnode" data-i="'+i+'"><g class="vpop" style="animation-delay:'+(.5+i*.6)+'s">'+mark+'<text class="vl" text-anchor="'+anchor+'" x="'+tx+'" y="'+(n[2]<0?ty:ty)+'">'+n[0]+'</text><text class="vs" text-anchor="'+anchor+'" x="'+tx+'" y="'+(ty+16)+'">'+n[1]+'</text></g></g>';
  }).join('')+'</svg>';
  return '<div class="auth"><section class="hero">'+
  '<svg class="sticker s1" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.3 6.8.8-5 4.7 1.3 6.8L12 17.8 6 21.1l1.3-6.8-5-4.7 6.8-.8z" fill="#FFD25E"/></svg>'+
  '<svg class="sticker s2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 15.5 3 12 3 8.8A4.8 4.8 0 0 1 12 6.5 4.8 4.8 0 0 1 21 8.8C21 12 19 15.5 12 21z" fill="#F08DAE"/></svg>'+
  '<svg class="sticker s3" viewBox="0 0 48 30" aria-hidden="true"><ellipse cx="24" cy="20" rx="20" ry="8" fill="#fff" opacity=".85"/><ellipse cx="18" cy="14" rx="10" ry="8" fill="#fff" opacity=".85"/><ellipse cx="30" cy="13" rx="9" ry="7" fill="#fff" opacity=".85"/></svg>'+
  '<svg class="sticker s4" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="#BFF0D3"/></svg>'+
  '<div class="mascot-hero">'+mascot({mood:'cheer'})+'</div><div class="brandrow">'+LOGO+'<span>BehavioralX</span></div>'+
  '<div><h1>See the pattern behind the habit</h1><p>BehavioralX records the whole chain around a choice, then counts how often it repeats. As you change it, your garden grows.</p></div>'+vine+
  '<p class="fine">No predictions. Every pattern is counted from what you log, so you can check the math yourself.</p></section>'+
  '<section class="formside">'+themeBtn()+'<div class="authcard"><div class="mobilebrand">'+LOGO+'<span>BehavioralX</span></div>'+
  '<div class="tabs2" role="tablist"><button role="tab" data-act="authtab" data-mode="login" aria-selected="'+!su+'">Log in</button><button role="tab" data-act="authtab" data-mode="signup" aria-selected="'+su+'">Create account</button></div>'+
  '<h2>'+(su?'Start your garden':'Welcome back')+'</h2>'+
  '<form id="authForm" novalidate>'+
  (su?'<label class="fld"><span>Your name</span><input id="a-name" type="text" autocomplete="name"></label><div class="two"><label class="fld"><span>Age group</span><select id="a-age"><option>Under 18</option><option selected>18 to 24</option><option>25 to 34</option><option>35 to 44</option><option>45 and over</option></select></label><label class="fld"><span>Occupation</span><input id="a-job" type="text" placeholder="Student, designer..."></label></div>':'')+
  '<label class="fld"><span>Email</span><input id="a-email" type="email" autocomplete="email" placeholder="you@example.com"></label>'+
  '<label class="fld"><span>Password</span><input id="a-pw" type="password" autocomplete="'+(su?'new-password':'current-password')+'" placeholder="At least 6 characters"></label>'+
  '<p class="err" id="authErr" role="alert"></p><button class="btn primary wide" type="submit">'+(su?'Create account':'Log in')+'</button></form>'+
  '<p class="fine2">Your account and data are stored securely on the server.</p></div></section></div>';
}
function doAuth(){
  var err=$('#authErr'),su=authMode==='signup';
  var email=$('#a-email').value.trim(),pw=$('#a-pw').value,name=su?$('#a-name').value.trim():'';
  if(su&&!name){err.textContent='Enter your name.';return}
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){err.textContent='Enter a valid email address, like you@example.com.';return}
  if(pw.length<6){err.textContent='Your password needs at least 6 characters.';return}
  var age=su?$('#a-age').value:'',job=su?$('#a-job').value.trim():'';
  err.textContent='';
  api('POST','auth',{a:su?'signup':'login'},su?{name:name,email:email,password:pw}:{email:email,password:pw}).then(function(r){
    CSRF=r.csrf;
    var extra=su?api('PUT','profile',null,{age_group:age,occupation:job||null}).then(function(u){r.user=u}):Promise.resolve();
    return extra.then(function(){return loadAll(r.user)});
  }).then(function(){page='tasks';render();window.scrollTo(0,0)}).catch(function(e){err.textContent=e.message||'Could not reach the server.'});
}
function drawVine(){
  var p=$('#vine');if(!p) return;
  var len=p.getTotalLength(),nodes=$$('.vnode');
  nodes.forEach(function(n,i){var pt=p.getPointAtLength(len*i/(nodes.length-1));n.setAttribute('transform','translate('+pt.x+' '+pt.y+')')});
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  p.style.strokeDasharray=len;p.style.strokeDashoffset=len;
  requestAnimationFrame(function(){requestAnimationFrame(function(){p.style.transition='stroke-dashoffset 3s ease-in-out .2s';p.style.strokeDashoffset=0})});
}

/* ---------- events: lists and pattern rules ---------- */
var CONTEXTS=['Due Task','Stress','Team work','Late night hours','Feeling low on energy','Hanging out with friends','Family time','Alone at home','Busy'];
var TRIGGERS=['Deadline is close (within a day)','Got a phone notification','Feeling overwhelmed','Feeling bored','A friend invited me somewhere','Not sure what to do next','Feeling anxious','Saw something on social media','Someone criticized me','Feeling lonely'];
var BEHAVIORS=['Started the task','Asked for help','Silenced my phone','Read a book','Opened social media','Watched videos','Cleaned instead','Stayed in bed','Talked to a friend about it','Took a short break'];
var AVOID=['Opened social media','Watched videos','Cleaned instead','Stayed in bed'];
var DECISIONS=['Chose to start now','Chose to break it into steps','Chose to ask for help','Chose to wind down','Chose to delay','Chose to skip','Chose the quick reward'];
var RESULTS=['Finished on time','Made progress','Felt calmer','Rushed finish','Lost time','Missed the deadline'];
var LEVELS=['Low','Medium','High'];
/* TEMPORARY: the real rules live in PHP. This copy only keeps the page working until the API is connected. */
function curNav(){return page==='addevent'||page==='event'?'events':page}
/* ---------- patterns: every number comes from the server (GET patterns) ---------- */
function patStat(id){return (S.patterns||[]).filter(function(p){return p.id===id})[0]||null}
function evList(ids){var out=[];(ids||[]).forEach(function(i){var e=S.events.filter(function(x){return x.id===String(i)})[0];if(e) out.push(e)});return out}
function pStrength(id){
  var p=patStat(id);if(!p) return {rel:0,hit:0,score:null,hits:[],rels:[],healthy:[]};
  var hits=evList(p.match_event_ids),good=evList(p.healthy_event_ids);
  return {rel:p.matches+p.healthy,hit:p.matches,score:p.strength,hits:hits,healthy:good,rels:hits.concat(good)};
}
function detected(id){var p=patStat(id);return !!(p&&p.detected)}
function pWeekly(id){
  var p=patStat(id),now=Date.now(),out=[];
  if(!p) return out;
  p.weekly.forEach(function(w){out.push({to:now-w.weeks_ago*7*DAY,score:w.strength,rel:w.matches+w.healthy,hit:w.matches})});
  out.trend={label:p.trend.label,cls:p.trend.class,delta:p.trend.delta};
  return out;
}
function pTrend(w){return w.trend||{label:'Not enough data',cls:'b-na',delta:null}}
/* The rules come from the server (GET patterns&a=rules). This only reads them, so it cannot drift from PHP:
   relevant = any condition true; match / healthy score = number of true conditions; matches take priority; at most the strongest two. */
function condMet(c,e){for(var f in c){if(c[f].indexOf(e[f])<0) return false}return true}
function countMet(list,e){var n=0;list.forEach(function(c){if(condMet(c,e)) n++});return n}
function evalPatterns(e){
  var R=S&&S.rules;if(!R) return [];
  var order=R.order,sc={},cand=[],outcome='match';
  order.forEach(function(id){
    var d=R.rules[id],rel=d.relevant.some(function(c){return condMet(c,e)});
    sc[id]={match:rel?countMet(d.match,e):0,healthy:rel?countMet(d.healthy,e):0};
  });
  order.forEach(function(id){if(sc[id].match>0) cand.push([id,sc[id].match])});
  if(!cand.length){outcome='healthy';order.forEach(function(id){if(sc[id].healthy>0) cand.push([id,sc[id].healthy])})}
  cand.sort(function(a,b){return (b[1]-a[1])||(order.indexOf(a[0])-order.indexOf(b[0]))});
  return cand.slice(0,2).map(function(c,i){return {pattern:c[0],outcome:outcome,count:c[1],rank:i+1}});
}
function refreshPatterns(){   // patterns and goal scores move together: the server updates goals whenever it works out patterns
  return Promise.all([api('GET','patterns'),api('GET','goals')]).then(function(a){
    var had={};(S.goals||[]).forEach(function(g){had[g.id]=g.beeAwarded});
    S.patterns=a[0].patterns;S.goals=a[1].map(mapGoal);
    var bee=S.goals.filter(function(g){return g.beeAwarded&&had[g.id]===false})[0];
    if(bee){refreshWallet().then(function(){render()});toast('A bee is buzzing around your garden — halfway to "'+esc(bee.title)+'", with time to spare!');sfx('bloom')}
  });
}
function loadNotes(){return api('GET','notifications').then(function(n){S.notes=n.map(mapNote)})}

/* ---------- events: views ---------- */
var BELL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21h4"/></svg>';
function notesMenu(){
  var unread=S.notes.filter(function(n){return !n.read}).length;
  return '<div class="menuwrap"><button class="bell" data-act="bell" aria-haspopup="true" aria-label="Notifications, '+unread+' unread">'+BELL+(unread?'<i>'+unread+'</i>':'')+'</button>'+
  '<div class="menu notes" hidden><div class="nhead"><b>Notifications</b>'+(unread?'<button class="linkbtn" data-act="readall">Mark all read</button>':'')+'</div><div class="nlist">'+
  (S.notes.length?S.notes.slice(0,12).map(function(n){return '<button class="nitem" data-act="opennote" data-id="'+n.id+'"><span class="dot'+(n.read?' read':'')+'"></span><span>'+esc(n.text)+'<small>'+fmtShort(n.at)+'</small></span></button>'}).join(''):'<p class="muted pad">Nothing yet.</p>')+'</div></div></div>';
}
function weekStrip(){
  var from=Date.now()-7*DAY;
  var done=S.tasks.filter(function(t){return t.status==='completed'&&t.completedAt>=from});
  var coins=done.reduce(function(a,t){return a+t.coins},0);
  var ok=done.filter(function(t){return t.timing!=='late'}).length;
  var evs=S.events.filter(function(e){return e.at>=from}).length;
  return '<section class="stats four" aria-label="The past week"><div><b>'+done.length+'</b><span>Tasks done this week</span></div><div><b>+'+coins+'</b><span>Coins earned</span></div><div><b>'+evs+'</b><span>Events logged</span></div><div><b>'+(done.length?Math.round(ok/done.length*100)+'%':'0%')+'</b><span>Finished on time</span></div></section>';
}
function lvCls(s){return s==='Low'?'low':s==='High'?'high':'mid'}
function chainHTML(e,cls){
  var st=[['Context',e.context],['Trigger',e.trigger],['Behavior',e.behavior],['Decision',e.decision],['Outcome',e.result]];
  var oc=e.success==='Low'?'var(--danger)':e.success==='High'?'var(--easy)':'var(--sun)';
  return '<ol class="chain '+(cls||'')+'" style="--oc:'+oc+'">'+st.map(function(s){return '<li><span class="cn"></span><span class="cl">'+s[0]+'</span><span class="cv">'+esc(s[1])+'</span></li>'}).join('')+'</ol>';
}
function evRow(e){
  return '<li class="ev"><div class="evhead"><button class="evlink" data-act="openev" data-id="'+e.id+'">'+fmtDate(e.at)+'</button><span class="badge b-'+lvCls(e.success)+'">'+e.success+' success</span>'+
    (e.duration?'<span class="tag">'+e.duration+' min</span>':'')+
    (e.notes.length?'<span class="tag">'+e.notes.length+(e.notes.length===1?' note':' notes')+'</span>':'')+'</div>'+chainHTML(e)+'</li>';
}
var evFilter={ctx:'',trig:'',range:'30'};
function filteredEvents(){
  var from=evFilter.range==='all'?0:Date.now()-(+evFilter.range)*DAY;
  return S.events.filter(function(e){return e.at>=from&&(!evFilter.ctx||e.context===evFilter.ctx)&&(!evFilter.trig||e.trigger===evFilter.trig)}).sort(function(a,b){return b.at-a.at});
}
function renderEvList(){
  var l=filteredEvents(),c=$('#evCount'),u=$('#evList');
  if(!c||!u) return;
  c.textContent=l.length+(l.length===1?' event':' events');
  u.innerHTML=l.length?l.map(evRow).join(''):'<li class="empty">No events match these filters. Widen the date range or log a new event.</li>';
}
function pageEvents(){
  function opts(arr,sel,all){return '<option value="">'+all+'</option>'+arr.map(function(v){return '<option'+(sel===v?' selected':'')+'>'+esc(v)+'</option>'}).join('')}
  return '<main class="wrap page"><div class="pagehead headrow"><div><h1>Events</h1><p class="lede">Each moment keeps its whole chain, from the situation to the outcome, so patterns can be counted later.</p></div><button class="btn primary" data-act="newev">Log an event</button></div>'+
  '<div class="filters"><label class="fld"><span>Context</span><select id="ef-ctx">'+opts(CONTEXTS,evFilter.ctx,'All contexts')+'</select></label>'+
  '<label class="fld"><span>Trigger</span><select id="ef-trig">'+opts(TRIGGERS,evFilter.trig,'All triggers')+'</select></label>'+
  '<label class="fld"><span>Date range</span><select id="ef-range">'+[['7','Last 7 days'],['30','Last 30 days'],['all','All time']].map(function(r){return '<option value="'+r[0]+'"'+(evFilter.range===r[0]?' selected':'')+'>'+r[1]+'</option>'}).join('')+'</select></label></div>'+
  '<p class="hint" id="evCount" aria-live="polite"></p><ul class="evs" id="evList"></ul></main>';
}

/* add / edit event */
var evDraft=newEvDraft(),editingId=null,viewEvent=null,insP='avoid';
function newEvDraft(){return {at:toLocalInput(Date.now()),context:CONTEXTS[0],trigger:TRIGGERS[0],behavior:BEHAVIORS[0],duration:'',decision:DECISIONS[0],alts:[],alt:'',result:RESULTS[0],success:'Medium',mood:50,stress:50,note:''}}
function draftFrom(e){return {at:toLocalInput(e.at),context:e.context,trigger:e.trigger,behavior:e.behavior,duration:e.duration||'',decision:e.decision,alts:e.alternatives.slice(),alt:'',result:e.result,success:e.success,mood:e.mood===undefined?50:e.mood,stress:e.stress===undefined?50:e.stress,note:''}}
var MOOD_EMOJI=['😭','😢','😕','😐','🙂','😄','😁'];
var STRESS_EMOJI=['😌','🙂','😐','😟','😣','😖','🤯'];
function moodEmoji(v){return MOOD_EMOJI[Math.round(v/100*(MOOD_EMOJI.length-1))]}
function stressEmoji(v){return STRESS_EMOJI[Math.round(v/100*(STRESS_EMOJI.length-1))]}
function moodLabel(v){var p=Math.round(Math.abs(v-50)*2);return v<48?p+'% sad':v>52?p+'% happy':'right in the middle'}
function stressLabel(v){var p=Math.round(Math.abs(v-50)*2);return v<48?p+'% relaxed':v>52?p+'% stressed':'right in the middle'}
function selHTML(id,arr,val){return '<select id="'+id+'">'+arr.map(function(v){return '<option'+(v===val?' selected':'')+'>'+esc(v)+'</option>'}).join('')+'</select>'}
function altListHTML(){return evDraft.alts.map(function(a,i){return '<span class="altchip">'+esc(a)+'<button type="button" data-act="delalt" data-i="'+i+'" aria-label="Remove '+esc(a)+'">&times;</button></span>'}).join('')}
function pageAddEvent(){
  var d=evDraft,edit=!!editingId;
  return '<main class="wrap page"><div class="pagehead"><h1>'+(edit?'Edit event':'Log an event')+'</h1><p class="lede">Walk through the moment in order. The panel on the right shows the chain as you build it.</p></div>'+
  '<div class="cols"><section class="panel" aria-label="Event form"><form id="eventForm" novalidate><div class="steps">'+
  '<div class="step"><span class="snode"></span><div><h3>Context</h3><p class="hint">What was the situation?</p>'+selHTML('e-context',CONTEXTS,d.context)+'</div></div>'+
  '<div class="step"><span class="snode"></span><div><h3>Trigger</h3><p class="hint">What set it off?</p>'+selHTML('e-trigger',TRIGGERS,d.trigger)+'</div></div>'+
  '<div class="step"><span class="snode"></span><div><h3>Behavior</h3><p class="hint">What did you actually do?</p>'+selHTML('e-behavior',BEHAVIORS,d.behavior)+
    '<label class="fld" style="margin:12px 0 0"><span>How long did it last? (minutes, optional)</span><input id="e-duration" type="number" min="1" max="1440" inputmode="numeric" value="'+esc(d.duration)+'"></label></div></div>'+
  '<div class="step"><span class="snode"></span><div><h3>Decision</h3><p class="hint">What did you choose?</p>'+selHTML('e-decision',DECISIONS,d.decision)+
    '<label class="fld" style="margin:12px 0 0"><span>Alternatives you considered but did not choose</span><div class="addrow"><input id="e-alt" type="text" maxlength="80" placeholder="For example: start for just 10 minutes" value="'+esc(d.alt)+'" autocomplete="off"><button type="button" class="btn" data-act="addalt">Add</button></div></label><div class="altwrap" id="altList">'+altListHTML()+'</div></div></div>'+
  '<div class="step"><span class="snode"></span><div><h3>Outcome</h3><p class="hint">What came of it?</p>'+selHTML('e-result',RESULTS,d.result)+
    '<fieldset class="fld" style="margin:12px 0 0"><legend>How successful was it?</legend><div class="seg">'+LEVELS.map(function(l){return '<label class="chip"><input type="radio" name="success" value="'+l+'"'+(d.success===l?' checked':'')+'><span>'+l+'</span></label>'}).join('')+'</div></fieldset>'+
    '<div class="moodrow" style="margin-top:14px"><label for="e-mood">How were you feeling, sad to happy?</label><div class="mline"><span class="memoji" id="moodEmoji">'+moodEmoji(d.mood)+'</span><input id="e-mood" type="range" min="0" max="100" value="'+d.mood+'"><span class="mpct" id="moodPct">'+moodLabel(d.mood)+'</span></div><div class="moodends"><span>Sad</span><span>Happy</span></div></div>'+
    '<div class="moodrow"><label for="e-stress">How stressed did it feel?</label><div class="mline"><span class="memoji" id="stressEmoji">'+stressEmoji(d.stress)+'</span><input id="e-stress" type="range" min="0" max="100" value="'+d.stress+'"><span class="mpct" id="stressPct">'+stressLabel(d.stress)+'</span></div><div class="moodends"><span>Relaxed</span><span>Stressed</span></div></div>'+
  '</div></div>'+
  '</div><div class="two"><label class="fld"><span>When did it happen?</span><input id="e-at" type="datetime-local" value="'+d.at+'" max="'+toLocalInput(Date.now())+'"></label>'+
  '</div>'+
  (edit?'':'<label class="fld"><span>First reflection (optional)</span><textarea id="e-note" rows="3" placeholder="What do you notice now that the moment has passed?">'+esc(d.note)+'</textarea></label>')+
  '<p class="err" id="evErr" role="alert"></p><div class="dactions"><button class="btn primary" type="submit">'+(edit?'Save changes':'Save event')+'</button>'+(edit?'<button class="btn" type="button" data-act="openev" data-id="'+editingId+'">Cancel</button>':'')+'</div></form></section>'+
  '<aside class="side sticky"><section class="looppan" id="loopPrev" aria-live="polite"></section></aside></div></main>';
}
function updateLoopPreview(){
  var b=$('#loopPrev');if(!b) return;
  var e={context:evDraft.context,trigger:evDraft.trigger,behavior:evDraft.behavior,decision:evDraft.decision,result:evDraft.result,success:evDraft.success};
  var pm=evalPatterns(e).map(function(x){
    var p=PATTERNS.filter(function(q){return q.id===x.pattern})[0];if(!p) return '';
    var hit=x.outcome==='match';
    return '<li class="'+(hit?'hit':'ok')+'"><b>'+p.name+':</b> '+(hit?'will be logged as a match':'will be logged as a healthy choice')+'</li>';
  }).join('');
  b.innerHTML='<h3>Your loop so far</h3>'+chainHTML(e,'vert')+'<h3 style="margin-top:8px;font-size:.95rem">Which patterns this event will be counted under</h3>'+(pm?'<ul class="pm">'+pm+'</ul>':'<p class="hint">This event is not relevant to any pattern yet, or it matches nothing and shows no healthy choice, so it will be ignored.</p>');
}
function addAlt(){
  var v=evDraft.alt.trim();
  if(!v) return;
  evDraft.alts.push(v);evDraft.alt='';
  var i=$('#e-alt');i.value='';$('#altList').innerHTML=altListHTML();i.focus();
}
function saveEvent(){
  var err=$('#evErr'),at=new Date(evDraft.at).getTime();
  if(!at||isNaN(at)){err.textContent='Choose when this happened.';return}
  if(at>Date.now()+60000){err.textContent='An event cannot be in the future.';return}
  if(evDraft.alt.trim()) addAlt();
  var dur=evDraft.duration===''?null:Math.max(1,Math.round(+evDraft.duration));
  var wasEdit=!!editingId,body={occurred_at:at,context:evDraft.context,trigger:evDraft.trigger,behavior:evDraft.behavior,decision:evDraft.decision,result:evDraft.result,
    success:evDraft.success,duration_min:dur,mood:+evDraft.mood,stress:+evDraft.stress,alternatives:evDraft.alts.slice()};
  if(!wasEdit&&evDraft.note.trim()) body.note=evDraft.note.trim();
  api(wasEdit?'PUT':'POST','events',wasEdit?{id:editingId}:null,body).then(function(r){
    var ev=mapEvent(r),i=S.events.findIndex(function(x){return x.id===ev.id});
    if(i>=0) S.events[i]=ev;else S.events.push(ev);
    var found=(r.new_patterns||[]).map(function(n){return {name:n.name,nid:String(n.notification_id)}});
    return Promise.all([refreshPatterns(),loadNotes()]).then(function(){
      editingId=null;viewEvent=ev.id;page='event';render();window.scrollTo(0,0);
      toast(wasEdit?'Event updated.':'Event saved.');
      found.forEach(function(f){toast(esc('Pattern detected: '+f.name+'.'),{act:'opennote',attrs:'data-id="'+f.nid+'"',label:'See insights'})});
    });
  }).catch(apiFail);
}
function addNote(){
  var t=$('#n-text'),e=S.events.filter(function(x){return x.id===viewEvent})[0];
  if(!t||!e) return;
  if(!t.value.trim()){$('#noteErr').textContent='Write a few words before saving.';t.focus();return}
  api('POST','events',{id:e.id,a:'note'},{text:t.value.trim()}).then(function(r){var ne=mapEvent(r),i=S.events.findIndex(function(x){return x.id===ne.id});if(i>=0)S.events[i]=ne;render();toast('Reflection saved.')}).catch(apiFail);
}
function pageEventDetail(){
  var e=S.events.filter(function(x){return x.id===viewEvent})[0];
  if(!e){page='events';return pageEvents()}
  var pm=(e.patterns||[]).map(function(x){      // what the server logged for this event (strongest two at most)
    var p=PATTERNS.filter(function(q){return q.id===x.pattern})[0];if(!p) return '';
    var hit=x.outcome==='match';
    return '<li class="'+(hit?'hit':'ok')+'"><b>'+p.name+':</b> '+(hit?'counted as a match':'counted as a healthy choice')+'</li>';
  }).join('');
  var notes=e.notes.slice().sort(function(a,b){return b.at-a.at});
  return '<main class="wrap page"><div class="pagehead"><button class="linkbtn" data-act="nav" data-page="events" style="margin-bottom:10px">Back to all events</button>'+
  '<h1>'+esc(e.decision)+'</h1><p class="lede">'+fmtDate(e.at)+', during "'+esc(e.context)+'".</p></div>'+
  '<section class="panel" style="margin-bottom:26px" aria-label="The full chain">'+chainHTML(e,'big')+'</section>'+
  '<div class="cols"><div class="stack"><section class="panel"><h2>The moment</h2>'+
  '<dl class="dfacts"><div><dt>Outcome</dt><dd>'+esc(e.result)+'</dd></div><div><dt>Success</dt><dd><span class="badge b-'+lvCls(e.success)+'">'+e.success+'</span></dd></div><div><dt>Duration</dt><dd>'+(e.duration?e.duration+' min':'Not recorded')+'</dd></div>'+
  (e.mood!==undefined?'<div><dt>Mood</dt><dd>'+moodEmoji(e.mood)+' '+moodLabel(e.mood)+'</dd></div><div><dt>Stress</dt><dd>'+stressEmoji(e.stress)+' '+stressLabel(e.stress)+'</dd></div>':'')+'</dl>'+
  '<h3 class="sub">Alternatives you considered</h3>'+(e.alternatives.length?'<ul class="altl">'+e.alternatives.map(function(a){return '<li>'+esc(a)+'</li>'}).join('')+'</ul>':'<p class="muted">None recorded for this event.</p>')+
  '</section><section class="panel"><h2>Counted toward</h2>'+(pm?'<ul class="pm" style="margin-top:0">'+pm+'</ul>':'<p class="muted">This event does not fall under any pattern rule.</p>')+'</section>'+
  '<div class="dactions"><button class="btn" data-act="editev" data-id="'+e.id+'">Edit event</button><button class="btn danger" data-act="delev" data-id="'+e.id+'">Delete event</button></div></div>'+
  '<aside class="side"><section class="panel" aria-labelledby="rn-h"><h2 id="rn-h">Reflection notes</h2>'+
  (notes.length?notes.map(function(n){return '<div class="note">'+esc(n.text)+'<small>'+fmtDate(n.at)+'</small></div>'}).join(''):'<p class="muted" style="margin-bottom:16px">No reflection yet. Add one when you have some distance from the moment.</p>')+
  '<form id="noteForm" novalidate><label class="fld"><span>Add a reflection</span><textarea id="n-text" rows="3" placeholder="In hindsight..."></textarea></label><p class="err" id="noteErr" role="alert"></p><button class="btn primary" type="submit">Save note</button></form></section></aside></div></main>';
}

/* insights */
function lineChart(wk,goal){
  var W=640,H=250,L=42,R=18,T=18,Bm=30,pw=W-L-R,ph=H-T-Bm,s='',v;
  function x(i){return L+pw*i/(wk.length-1)}
  function y(val){return T+ph*(1-val)}
  for(v=0;v<=1.001;v+=.25){s+='<line class="gridl" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+Math.round(v*100)+'%</text>'}
  if(goal) s+='<line class="tline" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(goal.target)+'" y2="'+y(goal.target)+'"/><text x="'+(W-R)+'" y="'+(y(goal.target)-5)+'" text-anchor="end">goal target '+pct(goal.target)+'</text>';
  var seg='',open=false;
  wk.forEach(function(p,i){
    if(p.score===null){open=false;return}
    seg+=(open?'L':'M')+x(i).toFixed(1)+' '+y(p.score).toFixed(1)+' ';open=true;
  });
  if(seg) s+='<path class="pline" d="'+seg+'"/>';
  wk.forEach(function(p,i){
    if(p.score!==null) s+='<circle class="pdot" cx="'+x(i).toFixed(1)+'" cy="'+y(p.score).toFixed(1)+'" r="5"><title>'+fmtShort(p.to)+': '+p.hit+' of '+p.rel+' = '+pct(p.score)+'</title></circle><text class="val" x="'+x(i).toFixed(1)+'" y="'+(y(p.score)-11).toFixed(1)+'" text-anchor="middle">'+Math.round(p.score*100)+'%</text>';
    s+='<text x="'+x(i).toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle">'+fmtShort(p.to)+'</text>';
  });
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Weekly strength of this pattern over the last six weeks">'+s+'</svg>';
}
function topCounts(arr,key,n){var m={};arr.forEach(function(e){m[e[key]]=(m[e[key]]||0)+1});return Object.keys(m).map(function(k){return [k,m[k]]}).sort(function(a,b){return b[1]-a[1]}).slice(0,n||3)}
function barsHTML(list,total){return '<ul class="bars">'+list.map(function(r){return '<li><span>'+esc(r[0])+'</span><span class="bt"><i style="width:'+Math.round(r[1]/total*100)+'%"></i></span><b>'+r[1]+'</b></li>'}).join('')+'</ul>'}
function pageInsights(){
  var cards=PATTERNS.map(function(p){
    var st=pStrength(p.id),tr=pTrend(pWeekly(p.id)),det=st.hit>=3;
    return '<button class="pcard" data-act="insp" data-id="'+p.id+'" aria-pressed="'+(insP===p.id)+'"><span><b>'+p.name+'</b></span><span class="big">'+(st.score===null?'No data':pct(st.score))+'</span><span class="hint">'+st.hit+' of '+st.rel+' relevant events</span>'+
      '<span class="bd"><span class="badge '+(det?'b-low':'b-high')+'">'+(det?'Detected':'Not detected')+'</span><span class="badge '+tr.cls+'">'+tr.label+'</span></span></button>';
  }).join('');
  var p=PATTERNS.filter(function(x){return x.id===insP})[0],d=patStat(insP)||{rule:''},st=pStrength(insP),wk=pWeekly(insP),tr=pTrend(wk);
  var goal=S.goals.filter(function(g){return g.status==='active'&&g.pattern===insP})[0];
  var non=st.healthy;
  function hi(a){return a.filter(function(e){return e.success==='High'}).length}
  var drill=st.hit?'<p class="hint" style="margin-bottom:14px">The most common details across the '+st.hit+' matching events in the last 30 days.</p><div class="drill">'+
    [['Contexts','context'],['Triggers','trigger'],['Behaviors','behavior'],['Outcomes','result']].map(function(c){return '<div><h3>'+c[0]+'</h3>'+barsHTML(topCounts(st.hits,c[1],3),st.hit)+'</div>'}).join('')+'</div>':
    '<p class="muted">No matching events in the last 30 days, so there is nothing to break down.</p>';
  function avgOf(a,k){var w=a.filter(function(e){return e[k]!==undefined});return w.length?w.reduce(function(s,e){return s+e[k]},0)/w.length:null}
  var avgMood=avgOf(st.hits,'mood'),avgStress=avgOf(st.hits,'stress');
  var moodLine=avgMood===null?'':'<p class="hint">Matching events average '+moodLabel(Math.round(avgMood))+' and '+stressLabel(Math.round(avgStress))+'.</p>';
  var worked=non.length?'<p>Of the '+non.length+' relevant times you did not fall into it, <b>'+hi(non)+'</b> ended with high success. When you did, <b>'+hi(st.hits)+'</b> of '+st.hit+' did.</p><h3 class="sub">Choices that helped most</h3>'+barsHTML(topCounts(non,'decision',3),non.length):
    '<p class="muted">Every relevant event matched. Log a moment where you chose differently and it will show up here.</p>';
  var trendTxt=tr.delta===null?'There are not enough weekly scores to compare yet.':'Compared with the week before, strength moved '+(tr.delta>0?'up ':'down ')+Math.abs(Math.round(tr.delta*100))+' points. That is '+tr.label.toLowerCase()+'.';
  return '<main class="wrap page"><div class="pagehead"><h1>Insights</h1><p class="lede">Every number here is a count of events you logged (and, for Dropped routines, habit and health tasks). Nothing is predicted, so you can check the math yourself. How it works is explained on the right.</p></div>'+
  '<div class="pcards" role="group" aria-label="Choose a pattern">'+cards+'</div>'+
  '<div class="cols"><div class="stack"><section class="chartsec" aria-labelledby="sg-h"><h2 id="sg-h">'+p.name+' over time</h2><p class="hint">Recalculated each week from the previous 30 days of events.</p>'+
  (wk.some(function(x){return x.score!==null})?lineChart(wk,goal):'<p class="empty">Log a few events to see this pattern over time.</p>')+
  '<p>'+trendTxt+'</p></section>'+
  '<section class="panel"><h2>Why is it happening?</h2>'+drill+moodLine+'</section>'+
  '<section class="panel"><h2>What worked instead</h2>'+worked+'</section></div>'+
  '<aside class="side"><section class="panel"><h2>How this is counted</h2><ol class="howlist"><li><b>Relevant.</b> An event is relevant to a pattern when any one of that pattern\'s situations is true (for example a certain context or trigger).</li><li><b>Match.</b> A relevant event is a match when it contains the unhelpful behavior, decision or result. The more of these it contains, the stronger its match.</li><li><b>Healthy.</b> A relevant event is healthy when it contains a helpful alternative instead.</li><li><b>What is logged.</b> If an event matches at least one pattern, only its matches are logged. If it matches none, its healthy choices are logged. When three or more patterns qualify, only the strongest two are kept (ties go in the order Deadline avoidance, Late starts, Impulsive choices, Screen escape, Dropped routines). Anything else is ignored.</li><li><b>Dropped routines</b> also reads your habit and health tasks: a late or overdue one is a match, an early or on-time one is healthy.</li></ol><p class="hint">Rule for this pattern</p><p>'+esc(d.rule)+'</p>'+
  '<p class="hint" style="margin-top:14px">Strength = matches ÷ (matches + healthy), over the last 30 days</p><p class="eq">'+(st.score===null?'No relevant events':st.hit+' ÷ '+st.rel+' = '+pct(st.score))+'</p>'+
  '<p>'+(st.hit>=3?'<b>Detected.</b> A pattern is detected at 3 or more matches in the last 30 days, and you have '+st.hit+'.':'<b>Not detected.</b> A pattern is detected at 3 or more matches in the last 30 days, and you have '+st.hit+'.')+'</p>'+
  (goal?'<h3 class="sub">Your goal</h3><p>"'+esc(goal.title)+'": from '+pct(goal.baseline)+' to '+pct(goal.target)+', now '+pct(goal.current)+' from your logged events.</p><button class="linkbtn" data-act="nav" data-page="goals">Open goals</button>':'<h3 class="sub">No goal yet</h3><p class="muted">Set a goal for this pattern and its target will appear on the chart.</p><button class="linkbtn" data-act="nav" data-page="goals">Set a goal</button>')+
  '</section></aside></div></main>';
}
function calcHint(g){
  if(g.subtasks&&g.subtasks.length) return 'Tracked from your subtasks below.';
  var st=pStrength(g.pattern);
  return st.score===null?'Counted automatically from your logged events. None are relevant in the last 30 days yet.':'Counted automatically: <b>'+pct(st.score)+'</b> now ('+st.hit+' of '+st.rel+' relevant events in the last 30 days).';
}

/* ---------- cute helpers: theme, mascot, confetti ---------- */
var REDUCED=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
var pageAnim=false, lastClick={x:innerWidth/2,y:innerHeight/2};
function effectiveDark(){
  var t=document.documentElement.getAttribute('data-theme');
  if(t) return t==='dark';
  return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function initTheme(){try{var t=localStorage.getItem('bx_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}}
function setTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('bx_theme',t)}catch(e){}pushSettings({theme:t})}
var SUN='<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#F2A93B" stroke-width="2.4" stroke-linecap="round"><path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1"/></g><circle cx="16" cy="16" r="8" fill="#FFD25E"/><ellipse cx="13" cy="15" rx="1.1" ry="1.5" fill="#6B4A12"/><ellipse cx="19" cy="15" rx="1.1" ry="1.5" fill="#6B4A12"/><path d="M13.6 18q2.4 2.2 4.8 0" stroke="#6B4A12" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="11" cy="18" rx="1.5" ry="1" fill="#FF9FB5"/><ellipse cx="21" cy="18" rx="1.5" ry="1" fill="#FF9FB5"/></svg>';
var MOON='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M20 4a12.5 12.5 0 1 0 8 17A10.5 10.5 0 0 1 20 4z" fill="#C9B8FF"/><path d="M11.5 15.5q1.4 1.4 2.8 0M17 17.5q1.4 1.4 2.8 0" stroke="#4B3A7A" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="10.5" cy="19.5" rx="1.5" ry="1" fill="#FF9FB5"/><path d="M25 6l.7 1.8 1.8.7-1.8.7L25 11l-.7-1.8-1.8-.7 1.8-.7z" fill="#FFE08A"/></svg>';
function themeIcon(){return effectiveDark()?SUN:MOON}
function themeLabel(){return effectiveDark()?'Switch to light mode':'Switch to dark mode'}
function themeBtn(){return '<button class="themebtn" data-act="theme" aria-label="'+themeLabel()+'">'+themeIcon()+'</button>'}
function toggleTheme(){
  setTheme(effectiveDark()?'light':'dark');
  $$('.themebtn').forEach(function(b){b.innerHTML=themeIcon();b.setAttribute('aria-label',themeLabel())});
  sfx('toggle');
}
function dispName(){return (S.user.nick&&S.user.nick.trim())||S.user.name.split(' ')[0]}
var PENCIL='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/></svg>';

/* ---------- pets: state and actions ---------- */
var petTab='mine',shopVar={cat:0,dog:0,bunny:0,frog:0};
function petById(id){return S.pets.filter(function(p){return p.id===id})[0]}
function pStat(p){return {full:p.fullness,joy:p.joy}}   /* the server works out hunger and joy */
function closeModal(){var o=$('.overlay');if(o) o.remove()}
function petSound(kind){sfx(PET_KINDS[kind].sound)}
function buyItem(kind,id){
  var list=kind==='acc'?ACCS:kind==='food'?FOODS:HOMES,it=list.filter(function(x){return x.id===id})[0];
  if(!it) return;
  api('POST','shop',{a:'buy'},{type:kind,id:id}).then(function(){
    if(kind==='food') S.inv.food[id]=(S.inv.food[id]||0)+1;else S.inv[kind].push(id);
    return refreshWallet().then(function(){
      render();sfx('coin');burst(lastClick.x,lastClick.y,10);
      toast(esc(kind==='home'?it.name+' is now in your garden.':kind==='acc'?it.name+' is in your closet. Dress up a pet to use it.':'Added '+it.name+' to the food bag.'));
    });
  }).catch(function(e){if(e.status===402) sfx('error');apiFail(e)});
}
function openAdopt(kind){
  var k=PET_KINDS[kind],vi=shopVar[kind]||0;
  modal('<h2>Adopt a '+k.name.toLowerCase()+'</h2><div class="adopt-art">'+petArt(kind,vi)+'</div><label class="fld"><span>What will you call it?</span><input id="adoptName" type="text" maxlength="16" value="'+esc(k.names[Math.floor(Math.random()*k.names.length)])+'" autocomplete="off"></label><p class="hint">Costs '+k.price+' coins. It moves into your garden right away.</p><div class="acts"><button class="btn" data-close>Not yet</button><button class="btn primary" data-act="adopt" data-kind="'+kind+'">Adopt</button></div>');
}
function adopt(kind){
  var inp=$('#adoptName'),k=PET_KINDS[kind],name=(inp&&inp.value.trim())||k.names[0];
  closeModal();
  api('POST','shop',{a:'adopt'},{kind:kind,variant:shopVar[kind]||0,name:name}).then(function(r){
    var np=mapPet(r.pet);S.pets.push(np);
    return refreshWallet().then(function(){
      petTab='mine';render();sfx('bloom');petSound(kind);burst(innerWidth/2,innerHeight/2,22);
      toast(esc(np.name+' moved into your garden.'),{act:'nav',attrs:'data-page="garden"',label:'Visit'});
    });
  }).catch(function(e){if(e.status===402) sfx('error');apiFail(e)});
}
function feedPet(id){
  var p=petById(id);if(!p) return;
  api('POST','shop',{id:id,a:'feed'}).then(function(r){
    Object.assign(p,mapPet(r.pet));
    if(!r.fed){
      if(r.reason==='full'){toast(esc(p.name+' is full for now.'));render()}
      else toast(esc(p.name+' is hungry, but the food bag is empty.'),{act:'shoptab',attrs:'data-tab="food"',label:'Buy food'});
      return;
    }
    return api('GET','shop').then(function(sh){
      S.inv.food=sh.mine.food;render();sfx('munch');setTimeout(function(){petSound(p.kind)},260);burst(lastClick.x,lastClick.y,10);
      toast(esc(r.loved?p.name+' loved the '+r.food.toLowerCase()+'!':p.name+' ate the '+r.food.toLowerCase()+'.'));
    });
  }).catch(apiFail);
}
function cuddle(id,quiet){
  var p=petById(id);if(!p) return;
  petSound(p.kind);burst(lastClick.x,lastClick.y,9);
  api('POST','shop',{id:id,a:'cuddle'}).then(function(r){Object.assign(p,mapPet(r.pet));if(!quiet) render()}).catch(apiFail);
  var t=$('#tip');if(t&&quiet) t.hidden=true;
}
function openRename(id){
  var p=petById(id);if(!p) return;
  modal('<h2>Rename your pet</h2><label class="fld"><span>New name</span><input id="renameIn" type="text" maxlength="16" value="'+esc(p.name)+'" autocomplete="off"></label><div class="acts"><button class="btn" data-close>Cancel</button><button class="btn primary" data-act="dorename" data-id="'+id+'">Save</button></div>');
}
function openDress(id){
  var p=petById(id);if(!p) return;
  closeModal();
  var slots=[['hat','Hat'],['face','Face'],['neck','Neck']];
  modal('<h2>Dress up '+esc(p.name)+'</h2><div class="adopt-art">'+petArt(p.kind,p.vi,p.acc)+'</div>'+
    slots.map(function(s){
      var items=ACCS.filter(function(a){return a.slot===s[0]&&S.inv.acc.indexOf(a.id)>-1});
      return '<h3 class="sub">'+s[1]+'</h3><div class="pills"><button class="pill" data-act="equip" data-id="'+id+'" data-slot="'+s[0]+'" data-acc="" aria-pressed="'+(!p.acc[s[0]])+'">None</button>'+
        items.map(function(a){return '<button class="pill" data-act="equip" data-id="'+id+'" data-slot="'+s[0]+'" data-acc="'+a.id+'" aria-pressed="'+(p.acc[s[0]]===a.id)+'">'+a.name+'</button>'}).join('')+'</div>'+(items.length?'':'<p class="hint" style="margin-top:-4px">You do not own any yet.</p>');
    }).join('')+
    '<div class="acts"><button class="btn" data-act="shoptab" data-tab="acc" data-close>Shop accessories</button><button class="btn primary" data-close>Done</button></div>');
}

/* ---------- pets: views ---------- */
function meter(label,v,col){return '<div class="meter"><span>'+label+'</span><span class="mt" role="progressbar" aria-valuenow="'+v+'" aria-valuemin="0" aria-valuemax="100" aria-label="'+label+'"><i style="width:'+v+'%;background:'+col+'"></i></span><b>'+v+'%</b></div>'}
function petCard(p){
  var st=pStat(p),k=PET_KINDS[p.kind],v=k.variants[p.vi%4];
  return '<article class="petcard"><div class="petart">'+petArt(p.kind,p.vi,p.acc)+'</div><div class="petinfo"><div class="pethead"><h3>'+esc(p.name)+'</h3><button class="iconbtn" data-act="rename" data-id="'+p.id+'" aria-label="Rename '+esc(p.name)+'">'+PENCIL+'</button></div>'+
    '<p class="hint">'+v.n+' '+k.name.toLowerCase()+', home since '+fmtShort(p.since)+'</p>'+meter('Fullness',st.full,'var(--easy)')+meter('Joy',st.joy,'var(--med)')+
    '<div class="dactions"><button class="btn small primary" data-act="feed" data-id="'+p.id+'">Feed</button><button class="btn small" data-act="cuddle" data-id="'+p.id+'">Cuddle</button><button class="btn small" data-act="dress" data-id="'+p.id+'">Dress up</button></div></div></article>';
}
function myPets(){
  if(!S.pets.length) return '<div class="panel">'+emptyHTML('No pets yet. Visit the Adopt tab to bring your first friend home.','sleepy')+'<button class="btn primary" data-act="shoptab" data-tab="adopt" style="margin-top:14px">See who is waiting</button></div>';
  var bag=FOODS.filter(function(f){return (S.inv.food[f.id]||0)>0}).map(function(f){return '<span class="bagitem">'+foodIcon(f.id)+f.name+' x'+S.inv.food[f.id]+'</span>'}).join('');
  return '<div class="bag" aria-label="Food bag">'+(bag||'<span class="hint">The food bag is empty. Buy treats in the Food tab.</span>')+'</div><div class="petgrid">'+S.pets.map(petCard).join('')+'</div>';
}
function buyBtn(kind,id,price,owned){
  if(owned) return '<button class="btn small" disabled>Owned</button>';
  var ok=balance()>=price;
  return '<button class="btn small primary" data-act="buy" data-kind="'+kind+'" data-id="'+id+'"'+(ok?'':' disabled')+'>'+(ok?'Buy':'Need '+(price-balance())+' more')+'</button>';
}
function adoptShop(){
  return '<div class="shopgrid">'+Object.keys(PET_KINDS).map(function(kind){
    var k=PET_KINDS[kind],vi=shopVar[kind]||0,ok=balance()>=k.price;
    return '<article class="shopcard"><div class="sart">'+petArt(kind,vi)+'</div><h3>'+k.name+'</h3><p class="hint">'+k.blurb+'</p>'+
      '<div class="sw" role="group" aria-label="Choose a color">'+k.variants.map(function(x,i){return '<button class="swb" data-act="pvar" data-kind="'+kind+'" data-i="'+i+'" style="background:'+x.a+'" aria-pressed="'+(vi===i)+'" aria-label="'+x.n+'"></button>'}).join('')+'</div>'+
      '<div class="sfoot"><span class="price">'+COIN+k.price+'</span><button class="btn small primary" data-act="adoptopen" data-kind="'+kind+'"'+(ok?'':' disabled')+'>'+(ok?'Adopt':'Need '+(k.price-balance())+' more')+'</button></div></article>';
  }).join('')+'</div>';
}
function accShop(){
  return '<div class="shopgrid">'+ACCS.map(function(a){
    var o={};o[a.slot]=a.id;
    return '<article class="shopcard"><div class="sart">'+petArt('cat',0,o,{head:true})+'</div><h3>'+a.name+'</h3><p class="hint">'+({hat:'A hat',face:'For the face',neck:'For the neck'}[a.slot])+'</p><div class="sfoot"><span class="price">'+COIN+a.price+'</span>'+buyBtn('acc',a.id,a.price,S.inv.acc.indexOf(a.id)>-1)+'</div></article>';
  }).join('')+'</div>';
}
function foodShop(){
  return '<div class="shopgrid">'+FOODS.map(function(f){
    return '<article class="shopcard"><div class="sart small">'+foodIcon(f.id)+'</div><h3>'+f.name+'</h3><p class="hint">'+f.blurb+' You have '+(S.inv.food[f.id]||0)+'.</p><div class="sfoot"><span class="price">'+COIN+f.price+'</span>'+buyBtn('food',f.id,f.price,false)+'</div></article>';
  }).join('')+'</div>';
}
function homeShop(){
  return '<div class="shopgrid">'+HOMES.map(function(h){
    return '<article class="shopcard"><div class="sart">'+homeArt(h.id)+'</div><h3>'+h.name+'</h3><p class="hint">'+h.blurb+'</p><div class="sfoot"><span class="price">'+COIN+h.price+'</span>'+buyBtn('home',h.id,h.price,S.inv.home.indexOf(h.id)>-1)+'</div></article>';
  }).join('')+'</div>';
}
function pagePets(){
  var tabs=[['mine','My pets'],['adopt','Adopt'],['acc','Accessories'],['food','Food'],['home','Home and toys']];
  var body=petTab==='mine'?myPets():petTab==='adopt'?adoptShop():petTab==='acc'?accShop():petTab==='food'?foodShop():homeShop();
  return '<main class="wrap page"><div class="pagehead headrow"><div><h1>Pets and shop</h1><p class="lede">Spend the coins you earn on pets, treats, and cozy things. Your pets live in the garden and love a cuddle.</p></div><button class="coinpill big" data-act="coins" aria-label="Coin balance '+balance()+'. Open coin history">'+COIN+'<span>'+balance()+'</span></button></div>'+
    '<div class="tabs pettabs" role="tablist" aria-label="Shop sections">'+tabs.map(function(t){return '<button role="tab" data-act="shoptab" data-tab="'+t[0]+'" aria-selected="'+(petTab===t[0])+'">'+t[1]+'</button>'}).join('')+'</div>'+body+'</main>';
}
var HOME_POS={bed:{x:13,y:91,w:11},house:{x:89,y:76,w:13},ball:{x:35,y:94,w:5},bowl:{x:66,y:93,w:7}};
function gardenHomes(){
  return S.inv.home.map(function(id){
    var p=HOME_POS[id],h=HOMES.filter(function(x){return x.id===id})[0];
    return '<div class="ghome" style="left:'+p.x+'%;top:'+p.y+'%;width:'+p.w+'%;z-index:'+Math.round(p.y*10)+'" data-tip="'+esc(h.name)+'">'+homeArt(id)+'</div>';
  }).join('');
}
function gardenPets(){
  return S.pets.map(function(p,i){
    var st=pStat(p),w=(p.kind==='frog'?8:10)*(.78+.4*clamp((p.y-70)/24,0,1)),hungry=st.full<30;
    var tip=p.name+' the '+p.kind+'. Fullness '+st.full+'%, joy '+st.joy+'%. Tap for options.';
    return '<div class="gpet '+p.kind+'" style="left:'+p.x.toFixed(1)+'%;top:'+p.y.toFixed(1)+'%;width:'+w.toFixed(1)+'%;z-index:'+(Math.round(p.y*10)+5)+';--wd:'+(17+i*3)+'s;--wl:-'+(i*5)+'s"><div class="walk">'+
      (hungry?'<button class="pmood" data-act="shoptab" data-tab="mine" aria-label="'+esc(p.name)+' is hungry. Open pets">'+foodIcon('kibble')+'</button>':'')+
      '<button class="petbtn" data-act="petmenu" data-id="'+p.id+'" data-tip="'+esc(tip)+'" aria-label="Options for '+esc(p.name)+'"><span class="hop">'+petArt(p.kind,p.vi,p.acc)+'</span></button></div></div>';
  }).join('');
}
function openPetMenu(id){
  var p=petById(id);if(!p) return;
  modal('<h2>'+esc(p.name)+'</h2><div class="adopt-art">'+petArt(p.kind,p.vi,p.acc)+'</div><div class="acts"><button class="btn" data-act="cuddle" data-id="'+id+'" data-close>Cuddle</button><button class="btn" data-act="feed" data-id="'+id+'" data-close>Feed</button><button class="btn primary" data-act="dress" data-id="'+id+'" data-close>Dress up</button></div>');
}

/* ---------- profile ---------- */
var AGE_GROUPS=['Under 18','18 to 24','25 to 34','35 to 44','45 and over'];
function pageProfile(){
  var u=S.user,a=u.avatar||{type:'preset',id:'sprout'};
  var done=S.tasks.filter(function(t){return t.status==='completed'}).length;
  var badges=S.goals.filter(function(g){return g.status==='done'&&g.result!=='none'}).length;
  var about='<section class="panel" aria-labelledby="ab-h"><h2 id="ab-h">About you</h2><form id="profileForm" novalidate>'+
    '<div class="two"><label class="fld"><span>Nickname</span><input id="p-nick" type="text" maxlength="20" value="'+esc(u.nick||'')+'" placeholder="What should Sprig call you?" autocomplete="off"></label>'+
    '<label class="fld"><span>Username</span><input id="p-user" type="text" maxlength="20" value="'+esc(u.handle||'')+'" placeholder="letters, numbers, underscore" autocomplete="off"></label></div>'+
    '<div class="two"><label class="fld"><span>Full name</span><input id="p-name" type="text" maxlength="40" value="'+esc(u.name)+'" autocomplete="name"></label>'+
    '<label class="fld"><span>Age group</span><select id="p-age">'+AGE_GROUPS.map(function(g){return '<option'+(u.ageGroup===g?' selected':'')+'>'+g+'</option>'}).join('')+'</select></label></div>'+
    '<label class="fld"><span>Occupation</span><input id="p-job" type="text" maxlength="40" value="'+esc(u.occupation||'')+'" placeholder="Student, designer, teacher..."></label>'+
    '<p class="err" id="profErr" role="alert"></p><button class="btn primary" type="submit">Save changes</button></form></section>';
  var avatars='<section class="panel" aria-labelledby="av-h"><h2 id="av-h">Profile picture</h2><div class="avrow"><div class="av lg">'+avatarInner()+'</div><div><p><b>'+(a.type==='photo'?'Your photo':'Cute avatar')+'</b></p><p class="hint">Pick a cute avatar below, or use your own photo.</p>'+
    '<div class="dactions" style="margin-top:10px"><label class="btn small filebtn">Choose from gallery<input type="file" id="photoIn" accept="image/*" aria-label="Choose a photo from your gallery"></label>'+
    '<label class="btn small filebtn">Take a photo<input type="file" id="photoCam" accept="image/*" capture="user" aria-label="Take a photo with your camera"></label>'+
    (a.type==='photo'?'<button class="btn small ghost" data-act="rmphoto">Remove photo</button>':'')+'</div></div></div>'+
    '<h3 class="sub">Cute avatars</h3><div class="avgrid" role="group" aria-label="Cute avatars">'+AVATARS.map(function(x){return '<button class="avopt" data-act="setav" data-id="'+x.id+'" aria-pressed="'+(a.type==='preset'&&a.id===x.id)+'" aria-label="Avatar '+x.id+'">'+avatarSVG(x.id)+'</button>'}).join('')+'</div></section>';
  var seasons='<section class="panel" aria-labelledby="se-h"><h2 id="se-h">Season and look</h2><p class="hint" style="margin-bottom:14px">Seasons change the colors, the trees, and the weather in your garden. Unlock new ones with diamonds, earned by closing goals on time.</p><div class="seasons" role="group" aria-label="Seasons">'+
    Object.keys(SEASONS).map(function(id){
      var s=SEASONS[id],unlocked=id==='classic'||S.unlockedSeasons.indexOf(id)>-1,price=SEASON_PRICE[id];
      if(unlocked) return '<button class="season" data-act="season" data-id="'+id+'" aria-pressed="'+(SEASON===id)+'"><span class="sprev" style="--a:'+s.sw[0]+';--b:'+s.sw[1]+';--c:'+s.sw[2]+'">'+s.icon+'</span><b>'+s.name+'</b><small>'+s.blurb+'</small></button>';
      return '<button class="season locked" data-act="unlockseason" data-id="'+id+'" data-price="'+price+'" aria-label="Unlock '+s.name+' for '+price+' diamonds"><span class="sprev" style="--a:'+s.sw[0]+';--b:'+s.sw[1]+';--c:'+s.sw[2]+'">'+s.icon+'</span><b>'+s.name+' 🔒</b><small class="lockline">'+price+' '+DIAMOND.replace('<svg','<svg style="width:12px;height:12px;vertical-align:-2px"')+'</small></button>';
    }).join('')+'</div>'+
    '<div class="modeline"><span>Light or dark mode</span>'+themeBtn()+'</div></section>';
  var side='<aside class="side"><section class="panel profcard"><div class="av lg" style="margin:0 auto 12px">'+avatarInner()+'</div><h2>'+esc(dispName())+'</h2>'+(u.handle?'<p class="hint">@'+esc(u.handle)+'</p>':'')+'<p class="hint">'+esc(u.name)+(u.occupation?', '+esc(u.occupation):'')+'</p>'+
    '<div class="stats" style="margin-top:14px;grid-template-columns:1fr 1fr"><div><b>'+balance()+'</b><span>Coins</span></div><div><b>'+done+'</b><span>Plants grown</span></div><div><b>'+S.pets.length+'</b><span>Pets</span></div><div><b>'+badges+'</b><span>Badges</span></div></div>'+
    (S.pets.length?'<div class="famrow" aria-label="Your pets">'+S.pets.map(function(p){return '<span class="famp">'+petArt(p.kind,p.vi,p.acc,{head:true})+'</span>'}).join('')+'</div>':'')+'</section></aside>';
  return '<main class="wrap page"><div class="pagehead"><h1>Your profile</h1><p class="lede">Make BehavioralX feel like yours.</p></div><div class="cols"><div class="stack">'+about+avatars+seasons+'</div>'+side+'</main>';
}
function saveProfile(){
  var err=$('#profErr'),nick=$('#p-nick').value.trim(),hd=$('#p-user').value.trim(),nm=$('#p-name').value.trim();
  if(!nm){err.textContent='Your full name cannot be empty.';return}
  if(hd&&!/^[A-Za-z0-9_]{3,20}$/.test(hd)){err.textContent='Usernames use 3 to 20 letters, numbers, or underscores.';return}
  api('PUT','profile',null,{name:nm,nickname:nick||null,username:hd||null,age_group:$('#p-age').value||null,occupation:$('#p-job').value.trim()||null}).then(function(r){
    var u=S.user;u.nick=r.nickname||'';u.handle=r.username||'';u.name=r.name;u.ageGroup=r.age_group||'';u.occupation=r.occupation||'';
    render();sfx('add');toast(esc('Nice to meet you, '+dispName()+'!'));
  }).catch(function(e){err.textContent=e.message||'Could not save your profile.'});
}
function handlePhoto(file){
  if(!file) return;
  if(!/^image\//.test(file.type)){toast('Please choose an image file.');return}
  if(file.size>20*1024*1024){toast('That photo is too big. Try one under 20 MB.');return}
  var r=new FileReader();
  r.onerror=function(){toast('That photo could not be read.')};
  r.onload=function(){var img=new Image();img.onerror=function(){toast('That image could not be opened.')};img.onload=function(){openCropper(img)};img.src=r.result};
  r.readAsDataURL(file);
}
function openCropper(img){
  var st={z:1,ox:0,oy:0},size=260;
  modal('<h2>Adjust your photo</h2><p class="hint">Drag the photo to move it, and use the slider to zoom.</p><div class="cropwrap"><canvas id="cropC" width="260" height="260" aria-label="Photo preview"></canvas></div><label class="fld"><span>Zoom</span><input id="cropZ" type="range" min="100" max="300" value="100"></label><div class="acts"><button class="btn" data-close>Cancel</button><button class="btn primary" id="cropOk" data-close>Use this photo</button></div>');
  var c=$('#cropC'),x=c.getContext('2d'),drag=null;
  function draw(){
    var base=Math.max(size/img.width,size/img.height)*st.z,w=img.width*base,h=img.height*base;
    st.ox=clamp(st.ox,-(w-size)/2,(w-size)/2);st.oy=clamp(st.oy,-(h-size)/2,(h-size)/2);
    x.fillStyle='#fff';x.fillRect(0,0,size,size);x.drawImage(img,(size-w)/2+st.ox,(size-h)/2+st.oy,w,h);
  }
  draw();
  $('#cropZ').addEventListener('input',function(e){st.z=+e.target.value/100;draw()});
  c.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,ox:st.ox,oy:st.oy};try{c.setPointerCapture(e.pointerId)}catch(err){}});
  c.addEventListener('pointermove',function(e){if(!drag) return;var k=size/c.getBoundingClientRect().width;st.ox=drag.ox+(e.clientX-drag.x)*k;st.oy=drag.oy+(e.clientY-drag.y)*k;draw()});
  c.addEventListener('pointerup',function(){drag=null});
  $('#cropOk').addEventListener('click',function(){
    var out=document.createElement('canvas');out.width=out.height=240;
    out.getContext('2d').drawImage(c,0,0,size,size,0,0,240,240);
    // the server checks it is a real image, redraws it as a 240x240 JPEG and keeps only the file name
    api('POST','profile',{a:'photo'},{image:out.toDataURL('image/jpeg',.85)}).then(function(u){
      S.user.avatar=u.avatar_type==='photo'&&u.avatar_path?{type:'photo',data:'uploads/avatars/'+u.avatar_path}:{type:'preset',id:u.avatar_id||'sprout'};
      render();sfx('add');toast('Profile picture updated.');
    }).catch(apiFail);
  });
}

/* ---------- render ---------- */
function render(){
  var app=$('#app');
  if(booting){app.innerHTML='<p class="boot" role="status" style="text-align:center;padding:40px">Loading your garden…</p>';return}
  if(!S||!S.loggedIn){app.innerHTML=pageAuth();drawVine();renderDock();return}
  var views={tasks:pageTasks,events:pageEvents,addevent:pageAddEvent,event:pageEventDetail,garden:pageGarden,goals:pageGoals,insights:pageInsights,pets:pagePets,profile:pageProfile};
  app.innerHTML=header()+(views[page]||pageTasks)();
  if(pageAnim){var m=$('main');if(m)m.classList.add('enter');pageAnim=false}
  lastBal=balance();lastDia=diamonds();
  if(page==='tasks') updatePreview();
  if(page==='events') renderEvList();
  if(page==='addevent') updateLoopPreview();
  if(page==='garden'){gardenIntro=false;S.fresh=null}
  renderDock();
}
var pvSeq=0,pvT=null;
function updatePreview(){
  var box=$('#preview');if(!box) return;
  var dl=new Date(draft.deadline).getTime();
  if(!dl||isNaN(dl)){box.innerHTML='<p>Pick a deadline to see the difficulty.</p>';return}
  clearTimeout(pvT);var my=++pvSeq;
  pvT=setTimeout(function(){
    api('GET','tasks',{a:'preview',type:draft.type,effort:draft.effort,skip:draft.skip?1:0,deadline:dl}).then(function(d){
      var b=$('#preview');if(my!==pvSeq||!b) return;
      var k=kindOf(d.label);
      b.innerHTML='<div class="pv-plant">'+plantSVG(k,1)+'</div><div><div class="pv-title"><b>'+(d.label==='N/A'?'No difficulty rating':d.label+' task')+'</b> grows '+plantName(k)+'</div>'+
      '<p>'+d.coins_ontime+' coins if you finish on time, '+d.coins_early+' if you finish early.</p>'+
      (d.score==null?'':'<p class="calc">Time pressure '+d.pressure.toFixed(2)+', effort '+d.eff.toFixed(2)+(d.hist?', history '+d.hist.toFixed(2):'')+', score '+d.score.toFixed(2)+'</p>')+'</div>';
    }).catch(function(e){var b=$('#preview');if(my===pvSeq&&b) b.innerHTML='<p>'+esc(e.message)+'</p>'});
  },250);
}
function go(p){page=p;pageAnim=true;if(p==='garden')gardenIntro=true;render();window.scrollTo(0,0);
  if(p==='goals') loadStart();
  if(p==='insights'||p==='goals') refreshPatterns().then(function(){if(page===p) render()}).catch(function(){})}

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  if(!e.target.closest('.menuwrap')) $$('.menu').forEach(function(m){m.hidden=true});
  if(DK.open&&!e.target.closest('#dock')&&!e.target.closest('.overlay')){DK.open=false;renderDock()}
  var el=e.target.closest('[data-act]');if(!el) return;
  var a=el.dataset.act,id=el.dataset.id;
  if(a==='nav') go(el.dataset.page);
  else if(a==='complete') completeTask(id);
  else if(a==='remove') removeTask(id);
  else if(a==='gremove') removeGoal(id);
  else if(a==='menu'||a==='bell'){var mm=el.parentNode.querySelector('.menu'),was=mm.hidden;$$('.menu').forEach(function(x){x.hidden=true});mm.hidden=!was}
  else if(a==='logout'){api('POST','auth',{a:'logout'}).catch(function(){}).then(function(){S=null;CSRF=null;render()})}
  else if(a==='reset'){modal('<h2>Reset all your data?</h2><p>This deletes your tasks, events, goals, pets, shop items, coins, diamonds, notifications and garden visitors. Your account, name and picture stay. This cannot be undone.</p><div class="acts"><button class="btn" data-close>Cancel</button><button class="btn primary" data-act="confirmreset" data-close>Reset</button></div>')}
  else if(a==='confirmreset'){
    api('POST','settings',{a:'reset'},{confirm:true}).then(function(){return api('GET','auth',{a:'me'})}).then(function(r){return loadAll(r.user)}).then(function(){page='tasks';render();window.scrollTo(0,0);toast('Your data was reset. Your account is still here.')}).catch(apiFail);
  }
  else if(a==='coins'){
    var tx=S.tx.slice().sort(function(x,y){return y.at-x.at});
    modal('<h2>Coin history</h2><p class="hint" style="margin-bottom:8px">Your balance is the sum of every row below.</p><ul class="mini">'+tx.map(function(t){return '<li><div class="rmain"><div class="rtitle">'+esc(t.reason)+'</div><div class="rmeta">'+fmtDate(t.at)+'</div></div><b style="color:'+(t.amount>=0?'var(--leaf)':'var(--danger)')+'">'+(t.amount>=0?'+':'')+t.amount+'</b></li>'}).join('')+'</ul><div class="acts"><b style="margin-right:auto;align-self:center">Balance: '+balance()+'</b><button class="btn" data-close>Close</button></div>');
  }
  else if(a==='diamonds'){
    var dtx=S.dtx.slice().sort(function(x,y){return y.at-x.at});
    modal('<h2>Diamond history</h2><p class="hint" style="margin-bottom:8px">Earned by closing goals on time. Spent on unlocking seasons.</p><ul class="mini">'+(dtx.length?dtx.map(function(t){return '<li><div class="rmain"><div class="rtitle">'+esc(t.reason)+'</div><div class="rmeta">'+fmtDate(t.at)+'</div></div><b style="color:'+(t.amount>=0?'var(--leaf)':'var(--danger)')+'">'+(t.amount>=0?'+':'')+t.amount+'</b></li>'}).join(''):'<li class="muted pad">No diamonds yet. Close a goal on time to earn some.</li>')+'</ul><div class="acts"><b style="margin-right:auto;align-self:center">Balance: '+diamonds()+'</b><button class="btn" data-close>Close</button></div>');
  }
  else if(a==='alltx'){showAllTx=!showAllTx;render()}
  else if(a==='chart'){chartMode=el.dataset.mode;$('#chartsec').outerHTML=chartSection()}
  else if(a==='gr'){gardenRange=el.dataset.r;render()}
  else if(a==='authtab'){authMode=el.dataset.mode;render()}
  else if(a==='quick'){
    var q=el.dataset.q,now=Date.now(),ms;
    if(q==='3h') ms=now+3*HOUR;
    else if(q==='eve'){var d=new Date();d.setDate(d.getDate()+1);d.setHours(18,0,0,0);ms=+d}
    else if(q==='3d') ms=now+3*DAY;else ms=now+7*DAY;
    draft.deadline=toLocalInput(ms);$('#f-deadline').value=draft.deadline;updatePreview();
  }
  else if(a==='gquick'){gdraft.deadline=dateInput(Date.now()+ +el.dataset.q*DAY);$('#g-deadline').value=gdraft.deadline}
  else if(a==='shoptab'){petTab=el.dataset.tab||'mine';closeModal();go('pets')}
  else if(a==='pvar'){shopVar[el.dataset.kind]=+el.dataset.i;render()}
  else if(a==='adoptopen') openAdopt(el.dataset.kind);
  else if(a==='adopt') adopt(el.dataset.kind);
  else if(a==='buy') buyItem(el.dataset.kind,id);
  else if(a==='feed') feedPet(id);
  else if(a==='cuddle') cuddle(id);
  else if(a==='petpet') cuddle(id,true);
  else if(a==='petmenu') openPetMenu(id);
  else if(a==='rename') openRename(id);
  else if(a==='dorename'){var pr=petById(id),ri=$('#renameIn');if(pr&&ri&&ri.value.trim()){api('PUT','shop',{id:pr.id,a:'rename'},{name:ri.value.trim()}).then(function(r){pr.name=r.name;closeModal();render()}).catch(apiFail)}else{closeModal();render()}}
  else if(a==='dress') openDress(id);
  else if(a==='equip'){var pe=petById(id);if(pe){api('PUT','shop',{id:pe.id,a:'equip'},{slot:el.dataset.slot,accessory_id:el.dataset.acc||null}).then(function(r){pe.acc=mapPet(r).acc;render();openDress(id)}).catch(apiFail)}}
  else if(a==='setav'){api('PUT','profile',null,{avatar_id:id,avatar_type:'preset'}).then(function(){S.user.avatar={type:'preset',id:id};render()}).catch(apiFail)}
  else if(a==='rmphoto'){api('DELETE','profile',{a:'photo'}).then(function(u){S.user.avatar={type:'preset',id:u.avatar_id||'sprout'};render();toast('Photo removed.')}).catch(apiFail)}
  else if(a==='season') setSeason(id);
  else if(a==='unlockseason') unlockSeason(id);
  else if(a==='theme') toggleTheme();
  else if(a==='dock'){DK.open=!DK.open;renderDock()}
  else if(a==='dockclose'){DK.open=false;renderDock()}
  else if(a==='track'){if(AU.playing&&AU.cur===id) stopMusic();else playTrack(id)}
  else if(a==='ptoggle'){if(AU.playing) stopMusic();else playTrack(AU.cur||'lofi')}
  else if(a==='ftime'){FT.mins=+el.dataset.m;renderDock()}
  else if(a==='fstart') ftStart();
  else if(a==='fstop') ftStop();
  else if(a==='readall'){S.notes.forEach(function(n){n.read=true});api('PUT','notifications').catch(apiFail);render()}
  else if(a==='opennote'){var nt=S.notes.filter(function(x){return x.id===id})[0];if(nt){nt.read=true;if(/^\d+$/.test(nt.id)) api('PUT','notifications',{id:nt.id}).catch(apiFail);if(nt.pid)insP=nt.pid;go(nt.page||'tasks')}}
  else if(a==='newev'){editingId=null;evDraft=newEvDraft();go('addevent')}
  else if(a==='logfor'){editingId=null;evDraft=newEvDraft();go('addevent')}
  else if(a==='openev'){editingId=null;viewEvent=id;go('event')}
  else if(a==='editev'){var ev0=S.events.filter(function(x){return x.id===id})[0];if(ev0){editingId=id;evDraft=draftFrom(ev0);go('addevent')}}
  else if(a==='delev'){modal('<h2>Delete this event?</h2><p>The event and its reflection notes will be removed. Patterns will be recalculated without it.</p><div class="acts"><button class="btn" data-close>Keep it</button><button class="btn primary" data-act="confirmdel" data-id="'+id+'" data-close>Delete</button></div>')}
  else if(a==='confirmdel'){api('DELETE','events',{id:id}).then(refreshPatterns).then(function(){if(page==='insights'||page==='goals') render()}).catch(apiFail);S.events=S.events.filter(function(x){return x.id!==id});viewEvent=null;go('events');toast('Event deleted.')}
  else if(a==='addalt') addAlt();
  else if(a==='delalt'){evDraft.alts.splice(+el.dataset.i,1);$('#altList').innerHTML=altListHTML()}
  else if(a==='insp'){insP=id;render()}
  else if(a==='useautostart'){gdraft.baseHand=false;if(autoPct()!==null) gdraft.baseline=autoPct();if(gdraft.target>targetMax()) gdraft.target=targetMax();render()}
  else if(a==='setmanual') setManual(id);
  else if(a==='useauto') useAuto(id);
  else if(a==='finish') finishGoal(id);
  else if(a==='opensub') openAddSubtask(id,el.dataset.path);
  else if(a==='confirmaddsub') confirmAddSub(id,el.dataset.path);
  else if(a==='togglesub') toggleSub(id,el.dataset.path);
  else if(a==='delsub') delSub(id,el.dataset.path);
});
function field(e){
  var t=e.target;
  if(t.id==='f-title') draft.title=t.value;
  else if(t.id==='f-deadline'){draft.deadline=t.value;updatePreview()}
  else if(t.name==='type'){draft.type=t.value;updatePreview()}
  else if(t.name==='effort'){draft.effort=t.value;updatePreview()}
  else if(t.id==='f-skip'){draft.skip=t.checked;$$('.seg input').forEach(function(i){i.disabled=t.checked});updatePreview()}
  else if(t.id==='g-title') gdraft.title=t.value;
  else if(t.name==='pattern'){gdraft.pattern=t.value;gdraft.start=null;gdraft.baseHand=false;render();loadStart()}
  else if(t.id==='g-base'){
    gdraft.baseline=+t.value;gdraft.baseHand=true;if(gdraft.target>targetMax()) gdraft.target=targetMax();
    $('#o-base').textContent=t.value+'%';var gt=$('#g-target');if(gt){gt.max=targetMax();gt.value=gdraft.target;$('#o-target').textContent=gdraft.target+'%'}
    var bn=$('#baseNote');if(bn){var tmp=document.createElement('div');tmp.innerHTML=startBlock();var nn=tmp.querySelector('#baseNote');if(nn) bn.innerHTML=nn.innerHTML}   // refresh only the note, so dragging is not interrupted
  }
  else if(t.id==='g-target'){gdraft.target=+t.value;$('#o-target').textContent=t.value+'%'}
  else if(t.id==='g-deadline') gdraft.deadline=t.value;
  else if(t.id==='photoIn'||t.id==='photoCam'){var f0=t.files&&t.files[0];if(f0){handlePhoto(f0);t.value=''}}
  else if(t.id==='ef-ctx'){evFilter.ctx=t.value;renderEvList()}
  else if(t.id==='ef-trig'){evFilter.trig=t.value;renderEvList()}
  else if(t.id==='ef-range'){evFilter.range=t.value;renderEvList()}
  else if(t.id==='e-at') evDraft.at=t.value;
  else if(t.id==='e-context'){evDraft.context=t.value;updateLoopPreview()}
  else if(t.id==='e-trigger'){evDraft.trigger=t.value;updateLoopPreview()}
  else if(t.id==='e-behavior'){evDraft.behavior=t.value;updateLoopPreview()}
  else if(t.id==='e-duration') evDraft.duration=t.value;
  else if(t.id==='e-decision'){evDraft.decision=t.value;updateLoopPreview()}
  else if(t.id==='e-alt') evDraft.alt=t.value;
  else if(t.id==='e-result'){evDraft.result=t.value;updateLoopPreview()}
  else if(t.name==='success'){evDraft.success=t.value;updateLoopPreview()}
  else if(t.id==='e-mood'){evDraft.mood=+t.value;$('#moodEmoji').textContent=moodEmoji(evDraft.mood);$('#moodPct').textContent=moodLabel(evDraft.mood)}
  else if(t.id==='e-stress'){evDraft.stress=+t.value;$('#stressEmoji').textContent=stressEmoji(evDraft.stress);$('#stressPct').textContent=stressLabel(evDraft.stress)}
  else if(t.id==='e-note') evDraft.note=t.value;
  else if(t.id==='vol') setVol(+t.value/100);
  else if(t.id==='sfxToggle'){AU.sfxOn=t.checked;savePrefs();if(t.checked) sfx('toggle')}
  else if(t.classList&&t.classList.contains('mp-range')) t.closest('.manual').querySelector('output').textContent=t.value+'%';
}
document.addEventListener('input',field);
document.addEventListener('change',field);
document.addEventListener('submit',function(e){
  e.preventDefault();
  var id=e.target.id;
  if(id==='taskForm') addTask();else if(id==='goalForm') addGoal();else if(id==='authForm') doAuth();
  else if(id==='profileForm') saveProfile();else if(id==='eventForm') saveEvent();else if(id==='noteForm') addNote();
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){var o=$('.overlay');if(o)o.remove();$$('.menu').forEach(function(m){m.hidden=true});if(DK.open){DK.open=false;renderDock()}}
  if(e.key==='Enter'&&e.target.id==='e-alt'){e.preventDefault();addAlt()}
});
document.addEventListener('click',function(e){
  lastClick={x:e.clientX,y:e.clientY};
  if(!AU.sfxOn) return;
  var el=e.target.closest&&e.target.closest('button,summary,label.chip,.check');
  if(!el||el.disabled) return;
  if(el.dataset&&(el.dataset.act==='complete'||el.dataset.act==='theme')) return;
  var now=Date.now();if(now-AU.last<70) return;AU.last=now;
  sfx('pop');
},true);

function showTip(e){
  var el=e.target.closest&&e.target.closest('[data-tip]'),g=$('#garden'),tip=$('#tip');
  if(!el||!g||!tip) return;
  var gr=g.getBoundingClientRect(),r=el.getBoundingClientRect();
  tip.textContent=el.dataset.tip;tip.hidden=false;
  tip.style.left=clamp(r.left-gr.left+r.width/2,100,gr.width-100)+'px';
  tip.style.top=Math.max(r.top-gr.top-6,34)+'px';
}
function hideTip(e){var el=e.target.closest&&e.target.closest('[data-tip]'),tip=$('#tip');if(el&&tip)tip.hidden=true}
document.addEventListener('mouseover',showTip);document.addEventListener('focusin',showTip);
document.addEventListener('mouseout',hideTip);document.addEventListener('focusout',hideTip);

setInterval(function(){
  $$('[data-left]').forEach(function(el){el.textContent=fmtLeft(+el.dataset.left-Date.now())});
},30000);

if(S&&!S.events){S.events=[]}
if(S&&!S.notes){S.notes=[]}
if(S){
  if(!S.dtx) S.dtx=[];
  if(!S.unlockedSeasons) S.unlockedSeasons=['classic'];
  (S.goals||[]).forEach(function(g){if(!g.subtasks) g.subtasks=[];if(g.beeAwarded===undefined) g.beeAwarded=false});
  (S.tasks||[]).forEach(function(t){if(t.plant&&t.plant.wilted===undefined) t.plant.wilted=false});
  (S.decos||[]).forEach(function(d){if(!d.at) d.at=Date.now()});
}
initTheme();loadPrefs();applySeason();
boot();

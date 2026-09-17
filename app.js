
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const CFG=window.PE_ARCADE_CONFIG||{};

const state={
  student:'',grade:'',period:'',mode:'makeup',
  unit:null,game:null,level:'rookie',
  score:0,streak:0,round:0,deck:[],
  current:null,locked:false,start:Date.now(),timer:null,
  sound:true,results:[],
  unlocks:{},
  recent:JSON.parse(localStorage.getItem('pueblo-pe-arcade-recent')||'{}'),
  selectedExercises:[],
  sets:[],
  workoutStart:null,
  workoutTimer:null,
  arcade:null,
  rewardDone:false,
  completedModules:0,
  browserGuard:false
};

const els={
  home:$('#home'),
  unitHub:$('#unitHub'),
  gameSelect:$('#gameSelect'),
  play:$('#play'),
  builder:$('#builder'),
  results:$('#results'),
  nav:$('#nav')
};

const GRADE_ROUNDS={'6':10,'7':12,'8':14};

const UNITS=[
  {id:'fitness',title:'Fitness Lab',icon:'⚡',cls:'fitness',art:'assets/art_arena_fitness_v2.png',desc:'Make fast FITT decisions and rescue workouts that are not working.'},
  {id:'badminton',title:'Badminton Arena',icon:'🏸',cls:'badminton',art:'assets/art_arena_badminton_v2.png',desc:'Read the court, choose the shot, and outsmart your opponent.'},
  {id:'volleyball',title:'Volleyball Court',icon:'🏐',cls:'volleyball',art:'assets/art_arena_volleyball_v2.png',desc:'Pass, set, attack, rotate, communicate, and read the next play.'}
];

const GAMES={
  fitness:[
    {id:'fitt-dash',title:'FITT Meter Match',art:'assets/art_module_fitt_v2.png',desc:'Complete your grade-level FITT challenge and unlock a Spike mini-game.',type:'fitt'},
    {id:'workout-rescue',title:'Workout Rescue',art:'assets/art_module_rescue_v2.png',desc:'Repair real workout plans, then earn a Spike mini-game reward.',type:'rescue'}
  ],
  badminton:[
    {id:'rally-iq',title:'Badminton Rally IQ',art:'assets/art_module_rally_v2.png',desc:'Complete court-reading decisions and unlock a Spike mini-game.',type:'badminton-court'},
    {id:'grip-master',title:'Grip Master',art:'assets/art_module_grip_v2.png',desc:'Master grips and ready positions, then earn a Spike mini-game reward.',type:'grip'}
  ],
  volleyball:[
    {id:'court-command',title:'Volleyball Court Command',art:'assets/art_module_volley_v2.png',desc:'Complete smart team-play decisions and unlock a Spike mini-game.',type:'volley-court'},
    {id:'rotation-rescue',title:'Rotation Rescue',art:'assets/art_module_rotation_v2.png',desc:'Master court positions and earn a Spike mini-game reward.',type:'rotation'}
  ]
};

const EXERCISES=[
  ['Bodyweight Squat','lower','12 reps'],['Reverse Lunge','lower','8 each leg'],['Lateral Lunge','lower','8 each side'],['Calf Raise','lower','15 reps'],['Glute Bridge','lower','12 reps'],['Wall Sit','lower','30 seconds'],
  ['Push-Up','upper','8 reps'],['Incline Push-Up','upper','10 reps'],['Shoulder Tap','upper','10 each'],['Bear Crawl','upper','20 steps'],['Pike Push-Up','upper','8 reps'],['Chair Dip','upper','10 reps'],
  ['Plank','core','30 seconds'],['Dead Bug','core','10 each'],['Bird Dog','core','8 each'],['Sit-Up','core','12 reps'],['Russian Twist','core','20 total'],['Hollow Hold','core','20 seconds'],
  ['Mountain Climber','cardio','30 seconds'],['Jumping Jack','cardio','30 seconds'],['High Knees','cardio','30 seconds'],['Skaters','cardio','20 reps'],['Line Hops','cardio','30 seconds'],['Fast Feet','cardio','20 seconds'],
  ['DB Curl','dumbbell','10 reps'],['DB Row','dumbbell','10 each'],['Goblet Squat','dumbbell','10 reps'],['DB Shoulder Press','dumbbell','10 reps'],['Farmer Carry','dumbbell','30 seconds'],['DB Romanian Deadlift','dumbbell','10 reps']
].map((e,i)=>({id:'ex-'+i,name:e[0],cat:e[1],rx:e[2]}));

function saveRecent(){localStorage.setItem('pueblo-pe-arcade-recent',JSON.stringify(state.recent))}
function rememberSeen(gameId,itemIds){
  state.recent[gameId]=state.recent[gameId]||[];
  const arr=state.recent[gameId];
  itemIds.forEach(id=>arr.push(id));
  while(arr.length>120)arr.shift();
  saveRecent();
}
function getSeen(gameId){return state.recent[gameId]||[]}

function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function sample(a,n){return shuffle(a).slice(0,n)}
function cap(s,n){return s.length>n?s.slice(0,n):s}
function levelLabel(l){return l==='rookie'?'Rookie':l==='pro'?'Pro':'Elite'}
function gradeLabel(){return state.grade==='6'?'6th':state.grade==='7'?'7th':'8th'}
function timeText(ms){const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}

function soundCtx(){try{state.audio=state.audio||new (window.AudioContext||window.webkitAudioContext)();return state.audio}catch(e){return null}}
function tone(freq=.3,dur=.06,gain=.05,type='triangle',glide=null){
  if(!state.sound) return;
  const ctx=soundCtx(); if(!ctx) return;
  const o=ctx.createOscillator(), g=ctx.createGain(), now=ctx.currentTime;
  o.type=type; o.frequency.setValueAtTime(freq,now);
  if(glide) o.frequency.exponentialRampToValueAtTime(glide,now+dur);
  g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(gain,now+.01); g.gain.exponentialRampToValueAtTime(.001,now+dur);
  o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now+dur+.02);
}
function sfx(name='tap'){
  if(!state.sound) return;
  const map={
    tap:()=>{tone(330,.045,.035,'sine',430)},
    hover:()=>{tone(260,.025,.018,'sine')},
    step:()=>{tone(180,.028,.018,'square',230)},
    pellet:()=>{tone(620,.035,.025,'sine',820)},
    power:()=>{[330,495,660,990].forEach((f,i)=>setTimeout(()=>tone(f,.11,.045,'triangle',f*1.08),i*52))},
    bump:()=>{tone(105,.09,.05,'square',70)},
    ok:()=>{tone(520,.08,.05,'triangle',690);setTimeout(()=>tone(780,.12,.045,'sine',980),65)},
    bad:()=>{tone(210,.12,.05,'sawtooth',115);setTimeout(()=>tone(95,.08,.025,'square'),70)},
    level:()=>{[294,392,494,659].forEach((f,i)=>setTimeout(()=>tone(f,.1,.038,'triangle',f*1.04),i*58))},
    win:()=>{[392,523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.15,.045,'triangle',f*1.08),i*70))},
    add:()=>{tone(390,.06,.04,'triangle',520);setTimeout(()=>tone(650,.07,.03,'sine'),45)}
  };
  (map[name]||map.tap)();
}

function show(id){
  if(state.arcade && id!=='play') stopSpikeQuest();
  Object.values(els).forEach(e=>e&&e.classList.remove('active'));
  els[id].classList.add('active');
  els.nav.hidden=(id==='home');
  window.scrollTo({top:0,behavior:'smooth'});
}
function pulse(el,cls='pulse'){if(!el)return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls)}

function tickStrip(){ $('#stripTime').textContent=`${state.completedModules} complete` }
function setStrip(){
  $('#stripPlayer').textContent=state.student||'—';
  $('#stripClass').textContent=state.grade?`${gradeLabel()} / P${state.period}`:'—';
  $('#stripMode').textContent='PE Makeup';
  $('#welcomeTitle').textContent=`Ready, ${state.student}?`;
  $('#gradeNote').textContent=
    state.grade==='6'
      ?'6th grade gets cleaner prompts and more obvious choices first.'
      :state.grade==='7'
      ?'7th grade adds more application and decision-making.'
      :'8th grade adds strategy, analysis, and coach-level thinking.';
}
function safeText(s){return String(s||'').trim()}
function record(summary,extra={}){
  state.results.push({
    summary,
    unit:extra.unit||state.unit||'—',
    game:extra.game||state.game||summary,
    level:extra.level||state.level,
    score:extra.score||'',
    rounds:extra.rounds||state.deck.length||0,
    time:timeText(Date.now()-state.start),
    exercises:extra.exercises||''
  });
}

function initUnlocks(){
  Object.values(GAMES).flat().forEach(g=>{
    if(!state.unlocks[g.id]) state.unlocks[g.id]={rookie:true,pro:true,elite:true};
  });
}
function unlockNext(gameId,level){
  if(level==='rookie') state.unlocks[gameId].pro=true;
  if(level==='pro') state.unlocks[gameId].elite=true;
}

function renderUnits(){
  const grid=$('#unitGrid'); grid.innerHTML='';
  UNITS.forEach(u=>{
    const b=document.createElement('button');
    b.type='button'; b.className=`unitCard ${u.cls}`;
    b.innerHTML=`<span class="unitTag">${u.icon} ${u.id==='builder'?'WORKOUT':'ARENA'}</span>
      <div class="unitArt"><img src="${u.art}" alt=""></div>
      <div class="unitCopy"><h3>${u.title}</h3>
      <p>${u.desc}</p>
      <div class="mini">${u.id==='builder'?'Build your session →':'Enter arena →'}</div></div>`;
    b.addEventListener('click',()=>{sfx('tap'); if(u.id==='builder'){renderBuilder()} else {state.unit=u.id; renderGameSelect(); show('gameSelect')}})
    grid.appendChild(b);
  });
}

function renderGameSelect(){
  const unit=UNITS.find(u=>u.id===state.unit);
  $('#arenaEyebrow').textContent=(unit?.title||'ARENA').toUpperCase();
  $('#arenaTitle').textContent=unit?.title||'Games';
  $('#arenaDesc').textContent=unit?.desc||'Choose a game.';
  $('#arenaCharacter').src=unit?.art||'assets/home_duo.png';
  const grid=$('#gameGrid'); grid.innerHTML='';
  (GAMES[state.unit]||[]).forEach(g=>{
    const card=document.createElement('div'); card.className='gameCard';
    const required=GRADE_ROUNDS[state.grade]||10;
    card.innerHTML=`<div class="gameCardArt" aria-hidden="true"><img src="${g.art}" alt=""></div><span class="gameBadge">${unit.icon} PE MAKEUP MODULE</span>
      <h3>${g.title}</h3>
      <p>${g.desc}</p>
      <div class="moduleReq"><b>${required} questions</b><span>Spike mini-game unlocks after question 10</span></div>
      <button type="button" class="btn primary moduleStart">Start ${gradeLabel()} Module →</button>`;
    $('.moduleStart',card).addEventListener('click',()=>startGame(g,state.grade==='6'?'rookie':state.grade==='7'?'pro':'elite'));
    grid.appendChild(card);
  });
}

function homeBack(){ if(state.student){show('unitHub'); sfx('tap')} }

function initStart(){
  const student=safeText($('#student').value), grade=$('#grade').value, period=$('#period').value;
  if(!student||!grade||!period){alert('Please enter student, grade, and period.'); return}
  state.student=student; state.grade=grade; state.period=period; state.start=Date.now();
  if(!state.browserGuard){history.pushState({peArcade:true},'',location.href);state.browserGuard=true}
  clearInterval(state.timer); state.timer=setInterval(tickStrip,1000);
  initUnlocks(); setStrip(); renderUnits(); show('unitHub'); sfx('level');
}

function levelCount(){ return GRADE_ROUNDS[state.grade] || 10 }

function freshDeck(game){
  const count=levelCount();
  const pool=generatePool(game, state.grade, state.level);
  const seen=getSeen(game.id);
  let fresh=pool.filter(p=>!seen.includes(p.id));
  if(fresh.length<count) fresh=pool;
  const expanded=[];
  while(expanded.length<count){shuffle(fresh).forEach((item,i)=>{if(expanded.length<count)expanded.push({...item,id:`${item.id}-set-${expanded.length}-${i}`})})}
  const deck=sample(expanded,count);
  rememberSeen(game.id, deck.map(d=>d.id));
  return deck;
}

function startGame(game,level){
  state.game=game.id; state.level=level; state.score=0; state.streak=0; state.round=0; state.locked=false; state.rewardDone=false;
  state.deck=freshDeck(game);
  $('#playCharacter').src=game.art;
  $('#playMeta').textContent=`${(UNITS.find(u=>u.id===state.unit)||{}).title || 'ARENA'} • ${game.title}`;
  $('#playTitle').textContent=game.title;
  $('#playPrompt').textContent=game.desc;
  show('play');
  sfx('level');
  nextRound(true);
}

function setScoreBar(){
  $('#roundText').textContent=state.game?.startsWith('spike')?'Maze Run':`Round ${state.round}/${state.deck.length}`;
  $('#scoreText').textContent=`Score ${state.score}`;
  $('#streakText').textContent=`Streak ${state.streak}`;
  $('#levelText').textContent=`${gradeLabel()} level`;
  const momentum=$('#momentumFill');
  if(momentum) momentum.style.width=Math.min(100,Math.max(8,(state.round/Math.max(1,state.deck.length))*100))+'%';
}
function clearFeedback(){
  $('#feedback').className='feedback';
  $('#feedback').textContent='Make your move.';
  $('#lesson').classList.add('hidden');
  $('#lesson').innerHTML='';
  $('#nextBtn').disabled=true;
}
function nextRound(first=false){
  if(!first && !state.locked && state.current) return;
  if(!first && state.round===10 && !state.rewardDone){
    renderSpikeQuest(true);
    return;
  }
  state.round++;
  if(state.round>state.deck.length){ finishGame(); return; }
  state.current=state.deck[state.round-1];
  state.locked=false;
  $('#nextBtn').textContent='Next →';
  setScoreBar();
  clearFeedback();
  renderRound();
}
function hint(){
  if(!state.current || state.locked) return;
  sfx('tap');
  state.score=Math.max(0,state.score-5);
  $('#scoreText').textContent=`Score ${state.score}`;
  $('#lesson').classList.remove('hidden');
  $('#lesson').innerHTML=`<b>Coach Hint:</b> ${state.current.hint}`;
  pulse($('#lesson'));
}

function successCommon(){
  state.streak++; state.score += 100 + (state.streak-1)*20;
  $('#feedback').className='feedback good flashWin';
  $('#feedback').textContent=`✅ Great play! +${100 + (state.streak-1)*20} points`;
  $('#lesson').classList.remove('hidden');
  $('#lesson').innerHTML=`<b>Why it works:</b> ${state.current.why}`;
  $('#nextBtn').disabled=false;
  setScoreBar();
  sfx('ok');
}
function failCommon(){
  state.streak=0;
  $('#feedback').className='feedback bad shake';
  $('#feedback').textContent=`Coach Timeout: ${state.current.why}`;
  $('#lesson').classList.remove('hidden');
  $('#lesson').innerHTML=`<b>Learn it:</b> ${state.current.learn || state.current.why}<br><br><b>Hint:</b> ${state.current.hint}`;
  $('#nextBtn').disabled=false;
  setScoreBar();
  sfx('bad');
}
function finishGame(){
  unlockNext(state.game,state.level);
  const gameObj=(GAMES[state.unit]||[]).find(g=>g.id===state.game);
  const max=state.deck.length*100 + Math.max(0,(state.deck.length-1))*20;
  const pct=Math.min(100,Math.round((state.score / Math.max(1,max))*100));
  state.completedModules++;
  record(`${gameObj.title} — ${gradeLabel()} module completed`,{score:`${state.score} pts • ${pct}%`,unit:state.unit,game:gameObj.title,level:state.level,rounds:state.deck.length});
  $('#feedback').className='feedback good';
  $('#feedback').textContent=`🏆 ${gameObj.title} complete! This module counts toward PE makeup credit.`;
  $('#lesson').classList.remove('hidden');
  $('#lesson').innerHTML=`<b>Credit earned:</b> You completed all ${state.deck.length} required questions and the Spike mini-game.`;
  $('#gameStage').innerHTML=`<div class="stageInner"><div class="heroPrompt"><h3>Module Complete</h3><p>You finished ${gameObj.title} with <b>${state.score}</b> points.</p><div class="hudRow"><span class="hudPill">${state.deck.length} questions completed</span><span class="hudPill">Mini-game completed</span></div></div></div>`;
  $('#nextBtn').disabled=false;
  $('#nextBtn').textContent='Back to Games';
  state.locked=true;
  $('#nextBtn').onclick=()=>{ $('#nextBtn').textContent='Next →'; $('#nextBtn').onclick=null; renderGameSelect(); show('gameSelect') };
  sfx('win');
}

function renderRound(){
  const game=(GAMES[state.unit]||[]).find(g=>g.id===state.game);
  $('#gameStage').innerHTML='';
  if(!game) return;
  if(game.type==='fitt') renderFitt();
  if(game.type==='spike-dash') renderSpikeQuest();
  if(game.type==='rescue') renderRescue();
  if(game.type==='badminton-court') renderBadmintonCourt();
  if(game.type==='grip') renderGrip();
  if(game.type==='volley-court') renderVolleyCourt();
  if(game.type==='rotation') renderRotation();
}

function answer(correct,clicked,correctEl=null){
  state.locked=true;
  if(clicked){
    if(correct) clicked.classList.add('correct');
    else clicked.classList.add('wrong');
  }
  if(correctEl && !correct) correctEl.classList.add('correct');
  if(correct) successCommon(); else failCommon();
}

function renderFitt(){
  const item=state.current;
  $('#gameStage').innerHTML=`<div class="stageInner">
    <div class="fittBoard">
      <div>
        <div class="heroPrompt">
          <h3>${item.prompt}</h3>
          <p>Which FITT part should the player focus on?</p>
        </div>
        <div class="fittPads">
          ${['Frequency','Intensity','Time','Type'].map(v=>`<button type="button" class="fittPad" data-choice="${v}">${v}<span>${item.padTips[v]}</span></button>`).join('')}
        </div>
      </div>
      <div class="fittMeta">
        <div class="coachTip"><h4>FITT meter</h4><p><b>F</b> = how often<br><b>I</b> = how hard<br><b>T</b> = how long<br><b>T</b> = what kind</p></div>
        <div class="coachTip"><h4>Goal</h4><p>${item.goal}</p></div>
      </div>
    </div>
  </div>`;
  $$('.fittPad').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.locked) return;
    const correct=btn.dataset.choice===item.answer;
    const correctEl=$(`.fittPad[data-choice="${item.answer}"]`);
    answer(correct,btn,correctEl);
  }));
}

function renderRescue(){
  const i=state.current;
  $('#gameStage').innerHTML=`<div class="stageInner">
    <div class="rescueWrap">
      <div class="planCard">
        <h3>Broken Workout Plan</h3>
        <dl>
          <dt>Goal</dt><dd>${i.goal}</dd>
          <dt>Current plan</dt><dd>${i.plan}</dd>
          <dt>Main problem</dt><dd>${i.problem}</dd>
          <dt>Best fix target</dt><dd>${i.fixFocus}</dd>
        </dl>
      </div>
      <div class="fixGrid">
        ${i.choices.map(c=>`<button type="button" class="fixCard" data-choice="${c}">${c}</button>`).join('')}
      </div>
    </div>
  </div>`;
  $$('.fixCard').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.locked) return;
    const correct=btn.dataset.choice===i.answer;
    const correctEl=$(`.fixCard[data-choice="${CSS.escape(i.answer)}"]`);
    answer(correct,btn,correctEl);
  }));
}

function renderBadmintonCourt(){
  const i=state.current;
  $('#gameStage').innerHTML=`<div class="stageInner">
    <div class="courtWrap">
      <div class="courtHud">
        <div class="heroPrompt">
          <h3>${i.prompt}</h3>
          <p>Tap the best target area on the opponent's side.</p>
        </div>
        <div class="court">
          <div class="line netV"></div>
          <div class="midDash top"></div>
          <div class="midDash bottom"></div>
          <div class="midVert left"></div>
          <div class="midVert right"></div>
          <div class="actor player bulldogPlayer"><img src="assets/ftb_student_1.png" alt="Pueblo bulldog player"></div>
          <div class="actor foe bulldogPlayer" style="top:${i.foeTop}%"><img src="assets/ftb_student_2.png" alt="Pueblo bulldog opponent"></div>
          <div class="actor ball">🏸</div>
          <button type="button" class="zoneBtn bad-back" data-zone="back">Back Court<br>Clear</button>
          <button type="button" class="zoneBtn bad-mid" data-zone="mid">Middle<br>Drive</button>
          <button type="button" class="zoneBtn bad-front" data-zone="front">Front Court<br>Drop / Net</button>
        </div>
      </div>
      <div class="courtInfo">
        <div class="coachTip"><h4>Opponent read</h4><p>${i.read}</p></div>
        <div class="coachTip"><h4>Think like a player</h4><p>Use space. If they are too close, push them back. If they are stuck deep, make them move forward.</p></div>
      </div>
    </div>
  </div>`;
  $$('.zoneBtn').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.locked) return;
    const pick=btn.dataset.zone;
    animateBallTo(btn);
    const correct=pick===i.answer;
    const correctEl=$(`.zoneBtn[data-zone="${i.answer}"]`);
    setTimeout(()=>answer(correct,btn,correctEl),220);
  }));
}

function animateBallTo(btn){
  const ball=$('.actor.ball');
  const court=btn.closest('.court');
  const bRect=btn.getBoundingClientRect();
  const cRect=court.getBoundingClientRect();
  ball.style.left=((bRect.left-cRect.left)+(bRect.width/2))+'px';
  ball.style.top=((bRect.top-cRect.top)+(bRect.height/2))+'px';
  ball.style.transform='translate(-50%,-50%) scale(1.15)';
}

function renderGrip(){
  const i=state.current;
  $('#gameStage').innerHTML=`<div class="stageInner">
    <div class="heroPrompt">
      <h3>${i.prompt}</h3>
      <p>Choose the best grip or body position for the play.</p>
    </div>
    <div class="choiceGrid">
      ${i.choices.map(c=>`<button type="button" class="choiceCard" data-choice="${c.id}">
        <b>${c.title}</b>
        <small>${c.desc}</small>
      </button>`).join('')}
    </div>
    <div class="coachTip"><h4>Quick cue</h4><p>${i.tip}</p></div>
  </div>`;
  $$('.choiceCard').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.locked) return;
    const correct=btn.dataset.choice===i.answer;
    const correctEl=$(`.choiceCard[data-choice="${i.answer}"]`);
    answer(correct,btn,correctEl);
  }));
}

function renderVolleyCourt(){
  const i=state.current;
  $('#gameStage').innerHTML=`<div class="stageInner">
    <div class="courtWrap">
      <div class="courtHud">
        <div class="heroPrompt">
          <h3>${i.prompt}</h3>
          <p>Tap the best team target on the court.</p>
        </div>
        <div class="court volley">
          <div class="line netV"></div>
          <div class="midDash top"></div>
          <div class="midDash bottom"></div>
          <div class="midVert left"></div>
          <div class="midVert right"></div>
          <div class="actor player bulldogPlayer" style="left:${i.playerLeft}%;top:${i.playerTop}%"><img src="assets/ftb_student_2.png" alt="Pueblo volleyball player"></div>
          <div class="actor foe bulldogPlayer" style="top:${i.foeTop}%"><img src="assets/ftb_student_1.png" alt="Pueblo volleyball teammate"></div>
          <div class="actor ball">🏐</div>
          <button type="button" class="zoneBtn volley-pass" data-zone="pass">Pass Zone</button>
          <button type="button" class="zoneBtn volley-set" data-zone="set">Setter Target</button>
          <button type="button" class="zoneBtn volley-left" data-zone="left">Left Attack</button>
          <button type="button" class="zoneBtn volley-right" data-zone="right">Deep Right</button>
        </div>
      </div>
      <div class="courtInfo">
        <div class="coachTip"><h4>Read the play</h4><p>${i.read}</p></div>
        <div class="coachTip"><h4>Volleyball reminder</h4><p>Good teams pass to the setter target, communicate early, and put playable balls in smart locations.</p></div>
      </div>
    </div>
  </div>`;
  $$('.zoneBtn').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.locked) return;
    const pick=btn.dataset.zone;
    animateBallTo(btn);
    const correct=pick===i.answer;
    const correctEl=$(`.zoneBtn[data-zone="${i.answer}"]`);
    setTimeout(()=>answer(correct,btn,correctEl),220);
  }));
}

function renderRotation(){
  const i=state.current;
  $('#gameStage').innerHTML=`<div class="stageInner">
    <div class="rotationStage">
      <div>
        <div class="heroPrompt">
          <h3>${i.prompt}</h3>
          <p>Tap the correct court spot.</p>
        </div>
        <div class="rotationCourt">
          <div class="halfLine"></div>
          <div class="vLine left"></div>
          <div class="vLine right"></div>
          ${[1,2,3,4,5,6].map(n=>`<button type="button" class="rotPos p${n}" data-pos="${n}">${n}</button>`).join('')}
        </div>
      </div>
      <div class="rotationList">
        <div class="rotationCard">
          <h4>Situation</h4>
          <p>${i.read}</p>
        </div>
        <div class="rotationCard">
          <h4>Remember</h4>
          <p>Volleyball spots rotate clockwise. Position 1 is back-right and serves. Position 2 is front-right. Position 3 is front-middle. Position 4 is front-left. Position 5 is back-left. Position 6 is back-middle.</p>
        </div>
      </div>
    </div>
  </div>`;
  $$('.rotPos').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.locked) return;
    const correct=btn.dataset.pos===String(i.answer);
    const correctEl=$(`.rotPos[data-pos="${i.answer}"]`);
    answer(correct,btn,correctEl);
  }));
}

function stopSpikeQuest(){
  if(!state.arcade) return;
  window.removeEventListener('keydown',state.arcade.keyHandler);
  state.arcade=null;
}

function renderSpikeQuest(rewardMode=false){
  stopSpikeQuest();
  const map=[
    '###############',
    '#S....#......Q#',
    '#.###.#.###...#',
    '#.....#.......#',
    '#.###...###.#.#',
    '#...#.......#.#',
    '###.#.#####.#.#',
    '#...#.....#...#',
    '#.#####.#.###.#',
    '#Q......#....E#',
    '###############'
  ].map(row=>row.split(''));
  const pellets=new Set(), powers=new Set();
  let start={x:1,y:1}, exit={x:13,y:9};
  map.forEach((row,y)=>row.forEach((cell,x)=>{
    if(cell==='S') start={x,y};
    if(cell==='E') exit={x,y};
    if(cell==='.') pellets.add(`${x},${y}`);
    if(cell==='Q') powers.add(`${x},${y}`);
  }));
  const game={map,pellets,powers,player:{...start},start,exit,powerMoves:0,questions:0,totalPowers:powers.size,paused:false,keyHandler:null};
  state.arcade=game;
  state.locked=false;
  const activeGame=(GAMES[state.unit]||[]).find(g=>g.id===state.game);
  $('#gameStage').innerHTML=`<div class="stageInner spikeQuest">
    <div class="questHeader">
      <img class="questCharacter" src="assets/ui_spike_reward.png" alt="">
      <div><b>${rewardMode?'BONUS: SPIKE POWER-P QUEST':(activeGame?.title||"Spike's Power-P Quest").toUpperCase()}</b><span>Collect paw points, grab both Power-P boosts, then reach the gold exit.</span></div>
      <div class="questStats"><span id="questPaws">0 paws</span><span id="questPower">Power ready</span></div>
    </div>
    <div class="mazeShell">
      <canvas id="spikeMaze" width="750" height="550" aria-label="Spike's maze game"></canvas>
      <div id="questQuestion" class="questQuestion hidden" role="dialog" aria-modal="true"></div>
    </div>
    <div class="gameControls">
      <div class="controlHelp"><b>Move Spike</b><span>Arrow keys / WASD • click a nearby path • or use the touch pad</span></div>
      <div class="dpad" aria-label="Touch movement controls">
        <button type="button" data-move="up" aria-label="Move up">▲</button>
        <button type="button" data-move="left" aria-label="Move left">◀</button>
        <button type="button" data-move="down" aria-label="Move down">▼</button>
        <button type="button" data-move="right" aria-label="Move right">▶</button>
      </div>
    </div>
  </div>`;
  $('#feedback').className='feedback good';
  $('#feedback').textContent=rewardMode?'You completed 10 questions—your mini-game is unlocked! Finish the maze to continue.':'Collect the glowing paw points.';
  $('#nextBtn').disabled=true;
  const canvas=$('#spikeMaze'),ctx=canvas.getContext('2d');
  const spike=new Image(); spike.src='assets/ftb_spike_avatar.png'; spike.onload=()=>drawSpikeMaze();

  function drawSpikeMaze(){
    if(state.arcade!==game) return;
    const cw=canvas.width/map[0].length,ch=canvas.height/map.length;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const bg=ctx.createLinearGradient(0,0,0,canvas.height);bg.addColorStop(0,'#451127');bg.addColorStop(1,'#210a15');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
    map.forEach((row,y)=>row.forEach((cell,x)=>{
      if(cell==='#'){
        ctx.fillStyle=(x+y)%2?'#8f2446':'#761936';ctx.fillRect(x*cw+2,y*ch+2,cw-4,ch-4);
        ctx.strokeStyle='rgba(255,218,126,.32)';ctx.lineWidth=2;ctx.strokeRect(x*cw+5,y*ch+5,cw-10,ch-10);
      }else{
        ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(x*cw,y*ch,cw,ch);
      }
    }));
    pellets.forEach(key=>{const [x,y]=key.split(',').map(Number);ctx.fillStyle='#ffd36b';ctx.beginPath();ctx.arc(x*cw+cw/2,y*ch+ch/2,5,0,Math.PI*2);ctx.fill()});
    powers.forEach(key=>{const [x,y]=key.split(',').map(Number);ctx.shadowColor='#ffcf5c';ctx.shadowBlur=18;ctx.fillStyle='#fff4b0';ctx.beginPath();ctx.arc(x*cw+cw/2,y*ch+ch/2,17,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#721634';ctx.font='900 20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('P',x*cw+cw/2,y*ch+ch/2+1)});
    ctx.fillStyle=game.questions===game.totalPowers?'#ffd86e':'#76636a';ctx.fillRect(exit.x*cw+9,exit.y*ch+9,cw-18,ch-18);ctx.fillStyle='#421126';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('EXIT',exit.x*cw+cw/2,exit.y*ch+ch/2);
    if(game.powerMoves>0){ctx.shadowColor='#ffd86e';ctx.shadowBlur=26;ctx.fillStyle='rgba(255,216,110,.3)';ctx.beginPath();ctx.arc(game.player.x*cw+cw/2,game.player.y*ch+ch/2,23,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
    ctx.save();ctx.beginPath();ctx.arc(game.player.x*cw+cw/2,game.player.y*ch+ch/2,21,0,Math.PI*2);ctx.clip();
    if(spike.complete)ctx.drawImage(spike,game.player.x*cw+cw/2-24,game.player.y*ch+ch/2-24,48,48);else{ctx.fillStyle='#aaa';ctx.fill()};ctx.restore();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(game.player.x*cw+cw/2,game.player.y*ch+ch/2,22,0,Math.PI*2);ctx.stroke();
  }
  function move(dx,dy){
    if(state.arcade!==game||game.paused||state.locked)return;
    const nx=game.player.x+dx,ny=game.player.y+dy;
    if(!map[ny]||map[ny][nx]==='#'){sfx('bump');return}
    game.player={x:nx,y:ny};sfx('step');
    const key=`${nx},${ny}`;
    if(pellets.delete(key)){state.score+=game.powerMoves>0?20:10;sfx('pellet')}
    if(game.powerMoves>0)game.powerMoves--;
    if(powers.delete(key)){
      if(rewardMode){game.questions++;game.powerMoves=10;state.score+=100;sfx('power')}
      else askPowerQuestion();
    }
    if(nx===exit.x&&ny===exit.y){
      if(game.questions<game.totalPowers){$('#feedback').className='feedback bad';$('#feedback').textContent='The exit is locked. Find every glowing Power-P first!';sfx('bump')}
      else{
        state.score+=250;setScoreBar();stopSpikeQuest();
        if(rewardMode){state.rewardDone=true;state.locked=true;$('#feedback').className='feedback good';$('#feedback').textContent='🏆 Mini-game complete! Continue the module.';$('#gameStage').innerHTML='<div class="stageInner bonusComplete"><img src="assets/ui_spike_reward.png" alt="Spike and the Puppy Squad"><div class="heroPrompt"><h3>Bonus Complete</h3><p>You powered up Spike and cleared the maze.</p></div></div>';$('#nextBtn').disabled=false;$('#nextBtn').textContent=state.round>=state.deck.length?'Finish Module →':'Continue Questions →';sfx('win')}
        else finishGame();
        return;
      }
    }
    $('#questPaws').textContent=`${Math.round(state.score/10)} paws`;
    $('#questPower').textContent=game.powerMoves>0?`Power boost: ${game.powerMoves}`:`Power-Ps: ${game.questions}/${game.totalPowers}`;
    setScoreBar();drawSpikeMaze();
  }
  function askPowerQuestion(){
    game.paused=true;sfx('power');
    let pool,choices;
    if(state.unit==='badminton'){
      pool=poolBadCourt(state.grade,state.level);choices=shuffle(['back','mid','front']);
    }else if(state.unit==='volleyball'){
      pool=poolVolleyCourt(state.grade,state.level);choices=shuffle(['pass','set','left','right']);
    }else{
      pool=poolFitt(state.grade,state.level);choices=shuffle(['Frequency','Intensity','Time','Type']);
    }
    const q=pool[Math.floor(Math.random()*pool.length)];
    const labels={back:'Back Court',mid:'Middle Court',front:'Front Court',pass:'Pass Zone',set:'Setter Target',left:'Left Attack',right:'Deep Right'};
    const modal=$('#questQuestion');modal.classList.remove('hidden');
    modal.innerHTML=`<div class="powerBadge">POWER-P QUESTION</div><h3>${q.prompt}</h3><p>Make the smart PE choice to power up Spike.</p><div class="powerChoices">${choices.map(c=>`<button type="button" data-choice="${c}">${labels[c]||c}</button>`).join('')}</div>`;
    $$('.powerChoices button',modal).forEach(btn=>btn.addEventListener('click',()=>{
      const correct=btn.dataset.choice===q.answer;
      $$('.powerChoices button',modal).forEach(b=>b.disabled=true);
      btn.classList.add(correct?'correct':'wrong');
      if(correct){state.score+=150;state.streak++;game.powerMoves=10;sfx('ok');$('#feedback').className='feedback good';$('#feedback').textContent=`Power up! ${q.why}`}
      else{state.streak=0;sfx('bad');$('#feedback').className='feedback bad';$('#feedback').textContent=`Coach cue: ${q.why}`}
      game.questions++;
      setTimeout(()=>{if(state.arcade!==game)return;modal.classList.add('hidden');game.paused=false;setScoreBar();drawSpikeMaze()},700);
    }));
  }
  game.keyHandler=e=>{const keys={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};if(keys[e.key]){e.preventDefault();move(...keys[e.key])}};
  window.addEventListener('keydown',game.keyHandler);
  $$('.dpad button').forEach(btn=>btn.addEventListener('click',()=>{const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[btn.dataset.move];move(...m)}));
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*(canvas.width/r.width),y=(e.clientY-r.top)*(canvas.height/r.height),cx=(game.player.x+.5)*(canvas.width/map[0].length),cy=(game.player.y+.5)*(canvas.height/map.length);if(Math.abs(x-cx)>Math.abs(y-cy))move(x>cx?1:-1,0);else move(0,y>cy?1:-1)});
  setScoreBar();drawSpikeMaze();
}

function generatePool(game,grade,level){
  if(game.type==='spike-dash') return [{id:`spike-quest-${grade}-${level}`,prompt:'Power-P Quest',hint:'Use arrow keys, WASD, the mouse, or the touch pad.',why:'Movement and questions work together.',learn:'Navigate, collect, and apply PE knowledge.'}];
  if(game.type==='fitt') return poolFitt(grade,level);
  if(game.type==='rescue') return poolRescue(grade,level);
  if(game.type==='badminton-court') return poolBadCourt(grade,level);
  if(game.type==='grip') return poolGrip(grade,level);
  if(game.type==='volley-court') return poolVolleyCourt(grade,level);
  if(game.type==='rotation') return poolRotation(grade,level);
  return [];
}

function poolFitt(grade,level){
  const vars={
    Frequency:{tips:'How often / days per week'},
    Intensity:{tips:'How hard / effort level'},
    Time:{tips:'How long / minutes'},
    Type:{tips:'What kind / activity'}
  };
  const rows=[
    ['A student changes from working out 2 days a week to 4 days a week.','Frequency','Exercise days per week changed.','Build better fitness with more weekly practice.'],
    ['A player jogs 10 minutes and decides to jog 20 minutes.','Time','The workout got longer.','Stay active for a longer chunk of time.'],
    ['A student switches from walking to running.','Intensity','The work got harder.','Raise the effort level.'],
    ['A player changes from cycling to swimming.','Type','The activity itself changed.','Use a different activity.'],
    ['A class keeps the same sport but tries to work more days each week.','Frequency','The plan changes how often it happens.','Add more workout days.'],
    ['A student wants to push harder instead of staying easy the whole time.','Intensity','The effort level is the key change.','Turn up the challenge.'],
    ['A player keeps the same effort but adds 10 more minutes.','Time','Minutes changed.','Stay active longer.'],
    ['A student wants to train flexibility instead of cardio.','Type','The main activity focus changes.','Pick a different kind of exercise.']
  ];
  let more=[
    ['Coach says, “Same laps, but run them faster.”','Intensity','Faster pace means harder effort.','Push the pace higher.'],
    ['The plan changes from 1 PE workout a week to 3.','Frequency','Weekly count changes.','More often is frequency.'],
    ['The workout goes from 15 minutes to 25 minutes.','Time','Workout length changes.','The number of minutes matters.'],
    ['The student swaps sit-ups for planks.','Type','Exercise choice changes.','The kind of exercise changes.']
  ];
  if(grade==='8') rows.push(...more);
  return rows.map((r,i)=>({
    id:`fitt-${grade}-${level}-${i}`,
    prompt:r[0],
    answer:r[1],
    goal:r[3],
    why:r[2],
    learn:`${r[1]} is the correct FITT part here.`,
    hint:`Focus on what changed most: days, effort, minutes, or activity type.`,
    padTips:{
      Frequency:vars.Frequency.tips,
      Intensity:vars.Intensity.tips,
      Time:vars.Time.tips,
      Type:vars.Type.tips
    }
  }));
}

function poolRescue(grade,level){
  const rows=[
    ['A student wants better endurance.','They work out once a week for 8 minutes at a very easy pace.','The plan is too small to improve endurance very much.','Increase time and frequency','Add more days and more minutes each week.',['Increase time and frequency','Use random drills with no plan','Stop after one short set','Only change the shoe color']],
    ['A student wants more muscular strength.','They only stretch lightly and never use resistance work.','The training does not match the goal.','Add resistance exercises','Use strength exercises that fit the goal.',['Add resistance exercises','Do less work every week','Only sit during PE','Avoid all effort']],
    ['A student wants flexibility.','They sprint hard every day but never stretch.','The activity type does not match flexibility well.','Add flexibility work','Pick activities that improve flexibility.',['Add flexibility work','Run even faster','Do fewer warm-ups','Only rest at home']],
    ['A student wants cardio fitness.','They do 4 push-ups and then stop.','The plan does not give enough cardio time.','Build continuous cardio time','Cardio needs longer continuous movement.',['Build continuous cardio time','Add one pencil','Only count reps louder','Switch shoes mid-workout']],
    ['A student wants badminton quickness.','They play once and never practice footwork.','The practice is not specific enough.','Add footwork and more repetition','Use movements that match the skill.',['Add footwork and more repetition','Do random yoga poses only','Only talk about badminton','Skip practice entirely']]
  ];
  if(grade!=='6'){
    rows.push(['A student wants better volleyball passing.','They only practice serving and never receive passes.','The practice is not specific to the goal.','Train the target skill more directly','Specificity matters.',['Train the target skill more directly','Do less communication','Stand still the whole practice','Only practice shoe tying']]);
  }
  return rows.map((r,i)=>({
    id:`rescue-${grade}-${level}-${i}`,
    goal:r[0],
    plan:r[1],
    problem:r[2],
    answer:r[3],
    fixFocus:r[3],
    why:r[4],
    learn:`The best repair directly fixes the biggest weakness in the plan.`,
    hint:`Choose the option that actually repairs the real problem.`,
    choices:shuffle(r[5])
  }));
}

function poolBadCourt(grade,level){
  const rows=[
    ['Your opponent is crowding the net. What target makes the most sense?','back','A clear moves them away from the net.','They are too close, so push them deep.',24],
    ['Your opponent is stuck deep in the back court. Where should you go next?','front','A drop/net shot makes them come forward.','They are deep, so use the front.',74],
    ['The rally is quick and flat. Which space keeps pressure on?','mid','A drive through the middle keeps the rally fast.','Flat rally = drive pressure.',50],
    ['You need more time to recover after your shot. Where should you send it?','back','A higher deeper shot buys time.','Deep shots give recovery time.',35],
    ['Your opponent keeps backing up too far. What softer target is smart?','front','A net/drop shot punishes a player who sits too deep.','Front court punishes deep court camping.',81],
    ['The middle is open in doubles and your opponents look unsure. Which target is smart?','mid','The middle can cause confusion and weak returns.','Middle shots make two defenders decide.',48]
  ];
  return rows.map((r,i)=>({
    id:`badcourt-${grade}-${level}-${i}`,
    prompt:r[0],
    answer:r[1],
    why:r[2],
    read:r[3],
    hint:'Use the opponent’s position to choose front, middle, or back court.',
    foeTop:r[4]
  }));
}

function poolGrip(grade,level){
  const choices=[
    {id:'forehand',title:'Forehand handshake grip',desc:'Best for many forehand shots and clears.'},
    {id:'backhand',title:'Backhand thumb grip',desc:'Thumb supports backhand shots and pushes.'},
    {id:'ready',title:'Ready position',desc:'Balanced position before the shuttle is hit.'}
  ];
  const rows=[
    ['You are about to hit a basic forehand clear. Choose the best grip.','forehand','The forehand handshake grip lines the racket up well for many forehand shots.','Forehand shots usually start from a handshake grip.','Look for the grip used for many basic forehand hits.'],
    ['You need to hit a simple backhand push. Choose the best grip.','backhand','The thumb grip supports many backhand actions.','Backhand work often needs thumb support.','Which option helps backhand control with the thumb?'],
    ['Your opponent is about to hit and you are waiting to react. Choose the best body/racket position.','ready','The ready position helps you move either direction quickly.','Be balanced before the shot comes.','Choose the balanced ready-to-react choice.'],
    ['The shuttle comes to your forehand side at shoulder height. Which grip fits best?','forehand','A forehand grip is the most natural choice on that side.','Forehand side usually means forehand grip.','Side of body matters.'],
    ['You are at the net and need a quick backhand block. Which grip makes sense?','backhand','Backhand thumb grip helps quick backhand control.','Short quick backhand work needs thumb control.','Think backhand = thumb support.']
  ];
  return rows.map((r,i)=>({
    id:`grip-${grade}-${level}-${i}`,
    prompt:r[0],
    answer:r[1],
    why:r[2],
    tip:r[3],
    hint:r[4],
    learn:'Grip choice should match the side, shot, and ready position.',
    choices:shuffle(choices)
  }));
}

function poolVolleyCourt(grade,level){
  const rows=[
    ['A teammate serve-receives the ball. Where should the team try to send the next touch?','set','Good volleyball usually builds toward the setter target.','A good pass helps the setter run the offense.',32,62,45],
    ['The ball is low and hard off a serve. What is the best team target?','pass','First priority is a controlled pass.','Control first, then set up the play.',58,72,44],
    ['Your team gets a high free ball and can attack safely. Which target is best?','left','A controlled attack to an open area is smart.','Free balls can become attacks.',42,55,41],
    ['The right side of the opponent court is empty. Where could your team place it?','right','Deep right is the smart open target.','Attack open space.',36,55,57],
    ['Your teammate shouts “setter!” after a pass. Which area are they calling?','set','They want the pass near the setter target.','Communication helps offense.',51,65,51]
  ];
  return rows.map((r,i)=>({
    id:`volley-${grade}-${level}-${i}`,
    prompt:r[0],
    answer:r[1],
    why:r[2],
    read:r[3],
    playerLeft:r[4], playerTop:r[5], foeTop:r[6],
    hint:'Think pass first, then setter target, then attack open space.',
    learn:'A smart volleyball choice usually helps your team control the ball and build the next hit.'
  }));
}

function poolRotation(grade,level){
  const rows=[
    ['Which spot is Position 1, the serving spot?','1','Position 1 is back-right and serves.','Server starts from back-right.'],
    ['Which spot is front-middle?','3','Position 3 is front-middle.','Front-middle = Position 3.'],
    ['Which spot is back-left?','5','Position 5 is back-left.','Back-left = Position 5.'],
    ['Your team rotates clockwise after winning the serve. If you were in Position 2, where do you go next?','1','Position 2 moves to Position 1 when rotating clockwise.','Front-right rotates to back-right.'],
    ['Which spot is front-left?','4','Position 4 is front-left.','Front-left = Position 4.'],
    ['Which spot is back-middle?','6','Position 6 is back-middle.','Back-middle = Position 6.']
  ];
  return rows.map((r,i)=>({
    id:`rotation-${grade}-${level}-${i}`,
    prompt:r[0],
    answer:r[1],
    why:r[2],
    read:r[3],
    hint:'Think of the six basic volleyball spots around the court.',
    learn:'Rotation and court spots help teams stay organized.'
  }));
}

function renderBuilder(){
  state.selectedExercises=[]; state.sets=[]; state.workoutStart=null;
  $('#workoutRun').classList.add('hidden');
  $('#workoutClock').textContent='00:00';
  $$('.builderControls button').forEach(b=>b.classList.remove('selected'));
  $('.builderControls button[data-filter="all"]').classList.add('selected');
  drawExercises('all'); drawSelected();
  show('builder');
}
function drawExercises(filter){
  const grid=$('#exerciseGrid'); grid.innerHTML='';
  EXERCISES.filter(e=>filter==='all'||e.cat===filter).forEach(e=>{
    const selected=state.selectedExercises.some(x=>x.id===e.id);
    const b=document.createElement('button');
    b.type='button'; b.className='exercise'+(selected?' selected':'');
    b.innerHTML=`<b>${e.name}</b><span>${e.cat.toUpperCase()} • ${e.rx}</span>`;
    b.addEventListener('click',()=>toggleExercise(e));
    grid.appendChild(b);
  })
}
function toggleExercise(e){
  const idx=state.selectedExercises.findIndex(x=>x.id===e.id);
  if(idx>=0) state.selectedExercises.splice(idx,1);
  else{
    if(state.selectedExercises.length>=15){ sfx('bad'); return; }
    state.selectedExercises.push(e); sfx('add');
  }
  drawExercises($('.builderControls .selected')?.dataset.filter||'all');
  drawSelected();
}
function drawSelected(){
  const list=$('#selectedList'); list.innerHTML='';
  state.selectedExercises.forEach((e,i)=>{
    const d=document.createElement('div'); d.className='selectedItem';
    d.innerHTML=`<span>${i+1}. ${e.name}<br><small>${e.rx}</small></span><button type="button">Remove</button>`;
    d.querySelector('button').addEventListener('click',()=>toggleExercise(e));
    list.appendChild(d);
  });
  $('#workoutCount').textContent=`${state.selectedExercises.length}/15`;
  $('#startWorkoutBtn').disabled=state.selectedExercises.length<15;
}
function startWorkout(){
  state.sets=[]; state.workoutStart=Date.now();
  clearInterval(state.workoutTimer);
  state.selectedExercises.forEach(e=>{
    state.sets.push({e,set:1,done:false});
    state.sets.push({e,set:2,done:false});
  });
  $('#workoutRun').classList.remove('hidden');
  state.workoutTimer=setInterval(()=>$('#workoutClock').textContent=timeText(Date.now()-state.workoutStart),1000);
  drawSets(); sfx('level');
}
function drawSets(){
  const list=$('#setList'); list.innerHTML='';
  state.sets.forEach((s,i)=>{
    const d=document.createElement('div'); d.className='setItem'+(s.done?' done':'');
    d.innerHTML=`<span>${i+1}. ${s.e.name} — Set ${s.set}<br><small>${s.e.rx}</small></span><button type="button">${s.done?'✓ Done':'Complete'}</button>`;
    d.querySelector('button').addEventListener('click',()=>{s.done=!s.done; sfx(s.done?'ok':'tap'); drawSets()});
    list.appendChild(d);
  });
  const done=state.sets.filter(s=>s.done).length;
  $('#workoutProgress').textContent=`${done}/${state.sets.length} sets complete`;
  $('#finishWorkoutBtn').disabled=done<state.sets.length;
}
function finishWorkout(){
  clearInterval(state.workoutTimer);
  const names=state.selectedExercises.map(e=>e.name).join(', ');
  const mins=state.workoutStart?timeText(Date.now()-state.workoutStart):'00:00';
  record('Workout Builder completed',{score:`${state.sets.filter(s=>s.done).length}/${state.sets.length} sets • ${mins}`,game:'Workout Builder',unit:'builder',level:'rookie',rounds:state.sets.length,exercises:names});
  show('unitHub'); sfx('win');
}

function logout(){
  clearInterval(state.timer); clearInterval(state.workoutTimer);
  $('#resultText').textContent=buildReport();
  show('results'); sfx('win');
}
function buildReport(){
  let text=`PUEBLO PE MAKEUP SESSION RESULTS\n\nStudent: ${state.student}\nGrade: ${gradeLabel()}\nPeriod: ${state.period}\nMode: PE Makeup\nCompleted Modules: ${state.completedModules}\nDate: ${new Date().toLocaleString()}\n\nCREDIT RULE: Credit is based on completed grade-level modules, not elapsed time.\n\nACTIVITIES:\n`;
  if(!state.results.length) text+='No completed activities yet.\n';
  state.results.forEach((r,i)=>{
    text += `\n${i+1}. ${r.summary}\n   Unit: ${r.unit}\n   Module: ${r.game}\n   Questions Completed: ${r.rounds}\n   Score / Progress: ${r.score || 'Complete'}\n`;
    if(r.exercises) text += `   Exercises: ${r.exercises}\n`;
  });
  text += `\nCoach: ${CFG.COACH_EMAIL_TO||'bsupiot@kyrene.org'}\nCC: ${CFG.COACH_EMAIL_CC||'bsupiot@gmail.com'}\n`;
  return text;
}
function emailResults(){
  const subject=encodeURIComponent(`Pueblo PE Arcade Results - ${state.student}`);
  const body=encodeURIComponent(buildReport());
  location.href=`mailto:${CFG.COACH_EMAIL_TO||'bsupiot@kyrene.org'}?cc=${encodeURIComponent(CFG.COACH_EMAIL_CC||'bsupiot@gmail.com')}&subject=${subject}&body=${body}`;
}
function copyResults(){
  const txt=buildReport();
  navigator.clipboard?.writeText(txt).then(()=>{
    $('#resultText').textContent=txt+'\n\nCopied to clipboard.';
    sfx('ok');
  }).catch(()=>alert('Copy is not available on this device.'));
}
function resetSession(){
  state.student=''; state.grade=''; state.period=''; state.results=[]; state.unit=null; state.game=null;
  $('#student').value=''; $('#grade').value=''; $('#period').value='';
  state.completedModules=0; state.browserGuard=false; show('home'); sfx('tap');
}

function bind(){
  setTimeout(()=>$('#splash')?.classList.add('hide'),700);
  $('#startBtn').addEventListener('click',initStart);
  $('#pHome').addEventListener('click',homeBack);
  $('#homeBtn').addEventListener('click',homeBack);
  $('#logoutBtn').addEventListener('click',logout);
  $('#soundBtn').addEventListener('click',()=>{state.sound=!state.sound; $('#soundBtn').textContent=state.sound?'🔊':'🔇'; sfx('tap')});
  $$('.toUnits').forEach(b=>b.addEventListener('click',()=>{show('unitHub'); sfx('tap')}));
  $$('.toGameSelect').forEach(b=>b.addEventListener('click',()=>{renderGameSelect(); show('gameSelect'); sfx('tap')}));
  $('#hintBtn').addEventListener('click',hint);
  $('#nextBtn').addEventListener('click',()=>nextRound(false));
  $('#quitRoundBtn').addEventListener('click',()=>{renderGameSelect(); show('gameSelect'); sfx('tap')});
  $$('.builderControls button').forEach(b=>b.addEventListener('click',()=>{$$('.builderControls button').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); drawExercises(b.dataset.filter); sfx('tap')}));
  $('#startWorkoutBtn').addEventListener('click',startWorkout);
  $('#finishWorkoutBtn').addEventListener('click',finishWorkout);
  $('#emailBtn').addEventListener('click',emailResults);
  $('#printBtn').addEventListener('click',()=>window.print());
  $('#copyBtn').addEventListener('click',copyResults);
  $('#newSessionBtn').addEventListener('click',resetSession);
  window.addEventListener('popstate',()=>{if(state.browserGuard&&state.student){alert('Please use the Back buttons inside PE Arcade so your module stays intact.');history.pushState({peArcade:true},'',location.href)}});
  window.addEventListener('beforeunload',e=>{if(state.student&&state.browserGuard){e.preventDefault();e.returnValue=''}});
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./service-worker.js').catch(()=>{}) }
}
bind();
})();

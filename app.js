const state={
lang:localStorage.getItem('ela-lang')||'bilingual',
theme:localStorage.getItem('ela-theme')||'light',
mistakes:JSON.parse(localStorage.getItem('ela-mistakes')||'[]'),
history:JSON.parse(localStorage.getItem('ela-history')||'[]'),
progress:JSON.parse(localStorage.getItem('ela-progress')||'{"reading":{"attempts":0,"correct":0},"grammar":{"attempts":0,"correct":0},"vocabulary":{"attempts":0,"correct":0},"writing":{"attempts":0,"correct":0}}'),
diag:[],mock:[],bank:[],weak:[]
};
const readingQs=()=>READING_PASSAGES.flatMap(p=>p.questions);const allQs=()=>[...GRAMMAR_QUESTIONS,...VOCAB_QUESTIONS,...WRITING_QUESTIONS,...readingQs()];const shuffle=a=>[...a].sort(()=>Math.random()-.5);
function loc(en,zh){if(state.lang==='english')return en;if(state.lang==='chinese')return zh;return `<span data-en-only>${en}</span><span data-zh-only>${zh}</span>`}window.loc=loc;
function applyLang(){document.body.classList.remove('lang-english','lang-chinese');if(state.lang==='english')document.body.classList.add('lang-english');if(state.lang==='chinese')document.body.classList.add('lang-chinese');document.querySelectorAll('[data-en]').forEach(e=>e.innerHTML=loc(e.dataset.en,e.dataset.zh));document.querySelectorAll('.lang-switch button').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.lang))}
document.querySelectorAll('.lang-switch button').forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;localStorage.setItem('ela-lang',state.lang);renderAll()});
function applyTheme(){document.body.classList.toggle('dark',state.theme==='dark');document.getElementById('themeBtn').textContent=state.theme==='dark'?'☀':'☾'}document.getElementById('themeBtn').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';localStorage.setItem('ela-theme',state.theme);applyTheme()};applyTheme();
function showPage(id){
  const target=document.getElementById(id);
  if(!target) return;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  target.classList.add('active');
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===id));
  if(id==='mistakes') renderMistakes();
  if(id==='weakness') renderWeakness();
  updateStats();
  window.scrollTo({top:0,behavior:'smooth'});
}
window.showPage=showPage;document.querySelectorAll('.nav').forEach(n=>n.addEventListener('click',e=>{e.preventDefault();showPage(n.dataset.page)}));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>showPage(b.dataset.jump));

const DETAIL_SKILLS={
 reading:[['main','Main / Central Idea','主旨 / 中心思想'],['inference','Inference','推断'],['evidence','Text Evidence','文本证据'],['theme','Theme','主题'],['pov','Point of View','视角'],['purpose',"Author's Purpose",'作者目的'],['context','Vocabulary in Context','语境词义'],['structure','Text Structure','文章结构']],
 grammar:[['sentence_parts','Sentence Parts','句子成分'],['sentence_patterns','Sentence Patterns','基本句型'],['clauses','Phrases & Clauses','短语与从句'],['tenses','Verb Tenses','动词时态'],['agreement','Subject-Verb Agreement','主谓一致'],['pronouns','Pronouns','代词'],['modifiers','Modifiers','修饰语'],['connectors','Prepositions & Conjunctions','介词与连词'],['voice','Active & Passive Voice','主动与被动'],['punctuation','Punctuation','标点'],['errors','Sentence Errors','常见句子错误'],['parallel','Parallel Structure','平行结构']],
 vocabulary:[['context','Context Clues','语境线索'],['roots','Roots / Prefixes / Suffixes','词根 / 前后缀'],['synonym','Synonyms','近义词'],['antonym','Antonyms','反义词'],['connotation','Connotation','感情色彩'],['figurative','Figurative Language','修辞语言'],['academic','Academic Vocabulary','学术词汇']],
 writing:[['transition','Transitions','过渡词'],['organization','Paragraph Organization','段落组织'],['revision','Revision','句子修改'],['evidence','Evidence','证据'],['sentence_combining','Sentence Combining','句子合并'],['clarity','Clarity','表达清晰'],['tone','Tone & Style','语气与文体'],['conclusion','Conclusions','结尾'],['editing','Editing','语法编辑']]
};
function skillText(x){return state.lang==='english'?x[1]:state.lang==='chinese'?x[2]:x[1]+' / '+x[2]}
function readingSkillMatch(q,key){const t=(q.en||'').toLowerCase();return key==='main'?/central idea|main idea/.test(t):key==='inference'?/infer|inference/.test(t):key==='evidence'?/detail|support|evidence/.test(t):key==='theme'?/theme|lesson/.test(t):key==='pov'?/point of view|narrator/.test(t):key==='purpose'?/author|purpose/.test(t):key==='context'?/most nearly mean|what does|means:/.test(t):key==='structure'?/structure|sequence|contribute/.test(t):false}
function skillPool(area,key){if(area==='grammar')return GRAMMAR_QUESTIONS.filter(q=>q.topic===key);if(area==='vocabulary')return VOCAB_QUESTIONS.filter(q=>q.topic===key);if(area==='writing')return WRITING_QUESTIONS.filter(q=>q.topic===key);if(area==='reading')return readingQs().filter(q=>readingSkillMatch(q,key));return[]}
function renderSkillMap(){const el=document.getElementById('skillMap');if(!el)return;const icons={reading:'📖',grammar:'🔤',vocabulary:'🧠',writing:'✍️'};el.innerHTML=Object.entries(DETAIL_SKILLS).map(([area,skills])=>`<section class="skill-group"><h4>${icons[area]} ${area[0].toUpperCase()+area.slice(1)}</h4><div class="skill-list">${skills.map(x=>`<button onclick="openDetailSkill('${area}','${x[0]}')"><b>${skillText(x)}</b><small>${skillPool(area,x[0]).length} questions / 题</small></button>`).join('')}</div></section>`).join('')}
function renderSubskillBrowsers(){[['reading','readingSkillBrowser'],['grammar','grammarSkillBrowser'],['vocabulary','vocabSkillBrowser'],['writing','writingSkillBrowser']].forEach(([area,id])=>{const el=document.getElementById(id);if(el)el.innerHTML=DETAIL_SKILLS[area].map(x=>`<button onclick="openDetailSkill('${area}','${x[0]}')"><span>${skillText(x)}</span><small>${skillPool(area,x[0]).length} Q</small></button>`).join('')})}
window.openDetailSkill=function(area,key){if(area==='grammar'){activeGrammar=key;showPage('grammar');renderGrammar();return}const qs=shuffle(skillPool(area,key)).slice(0,15);state.bank=qs;showPage('bank');document.getElementById('bankWorkspace').innerHTML=`<div class="practice-box"><h3>${skillText(DETAIL_SKILLS[area].find(x=>x[0]===key))}</h3><p>${loc('Focused practice for this skill.','这个知识点的专项练习。')}</p><div id="bankSet"></div><button class="primary" onclick="submitBank()">Submit / 提交</button><div id="bankResult"></div></div>`;renderSet('bankSet',qs)};

function getQ(id){return allQs().find(q=>q.id===id)}
function ensureProgress(){
  ['reading','grammar','vocabulary','writing'].forEach(a=>{
    if(!state.progress[a]) state.progress[a]={attempts:0,correct:0};
    if(typeof state.progress[a].attempts!=='number') state.progress[a].attempts=0;
    if(typeof state.progress[a].correct!=='number') state.progress[a].correct=0;
  });
}
function recordProgress(q,isCorrect){
  if(!q||!q.area) return;
  ensureProgress();
  if(!state.progress[q.area]) state.progress[q.area]={attempts:0,correct:0};
  state.progress[q.area].attempts++;
  if(isCorrect) state.progress[q.area].correct++;
  localStorage.setItem('ela-progress',JSON.stringify(state.progress));
}
function areaAccuracy(area){
  ensureProgress();
  const p=state.progress[area];
  return p.attempts?Math.round(p.correct/p.attempts*100):0;
}
function overallPractice(){
  ensureProgress();
  const vals=Object.values(state.progress);
  const attempts=vals.reduce((s,p)=>s+p.attempts,0);
  const correct=vals.reduce((s,p)=>s+p.correct,0);
  return {attempts,correct,percent:attempts?Math.round(correct/attempts*100):0};
}
window.recordProgress=recordProgress;

function saveMistake(q,selected){
  if(!q) return;
  let m=state.mistakes.find(x=>x.qid===q.id);
  if(m){
    m.selected=selected;
    m.times=(m.times||1)+1;
    m.date=new Date().toLocaleDateString();
  }else{
    state.mistakes.push({qid:q.id,selected,times:1,date:new Date().toLocaleDateString()});
  }
  localStorage.setItem('ela-mistakes',JSON.stringify(state.mistakes));
  const badge=document.getElementById('mistakeBadge');
  if(badge) badge.textContent=state.mistakes.length;
}
function explain(q,selected,englishOnly=false){const yours=selected==null?'—':`${String.fromCharCode(65+selected)}. ${q.options[selected]}`;const correct=`${String.fromCharCode(65+q.answer)}. ${q.options[q.answer]}`;return `<div class="answer yours"><b>${englishOnly?'Your answer':loc('Your answer','你的答案')}:</b> ${yours}</div><div class="answer correct"><b>${englishOnly?'Correct answer':loc('Correct answer','正确答案')}:</b> ${correct}</div><div class="why"><b>${englishOnly?'Why':loc('Why','为什么')}:</b><br>${englishOnly?q.whyEn:loc(q.whyEn,q.whyZh)}</div><div class="remember"><b>${englishOnly?'Strategy':loc('Strategy','方法')}:</b><br>${englishOnly?q.rememberEn:loc(q.rememberEn,q.rememberZh)}</div>`}
function updateStats(){
  ensureProgress();
  const total=allQs().length;
  const best=state.history.filter(h=>h.type==='diagnostic').map(h=>h.percent);
  const practice=overallPractice();

  document.getElementById('stats').innerHTML=`
    <article class="progress-stat"><strong>${practice.percent}%</strong><span>Overall Practice / 综合练习</span><small>${practice.correct}/${practice.attempts||0} correct</small></article>
    <article><strong>${practice.attempts}</strong><span>Questions Attempted / 已练题目</span><small>${total} questions available</small></article>
    <article class="clickable-stat" onclick="showPage('mistakes')"><strong>${state.mistakes.length}</strong><span>Mistakes / 错题</span><small>Click to review / 点击复习</small></article>
    <article><strong>${best.length?Math.max(...best)+'%':'—'}</strong><span>Best Diagnostic / 最佳摸底</span><small>${state.history.length} tests completed</small></article>`;

  document.getElementById('mistakeBadge').textContent=state.mistakes.length;
  if(document.getElementById('skillMap'))renderSkillMap();

  const reading=areaAccuracy('reading'), grammar=areaAccuracy('grammar'),
        vocabulary=areaAccuracy('vocabulary'), writing=areaAccuracy('writing');
  const attemptedAreas=['reading','grammar','vocabulary','writing'].filter(a=>state.progress[a].attempts>0);
  const readiness=attemptedAreas.length
    ? Math.round(attemptedAreas.reduce((s,a)=>s+areaAccuracy(a),0)/attemptedAreas.length)
    : null;
  document.getElementById('readinessScore').textContent=readiness===null?'—%':readiness+'%';

  const grid=document.getElementById('areaGrid');
  if(grid){
    grid.querySelectorAll('article').forEach((card,i)=>{
      const area=['reading','grammar','vocabulary','writing'][i];
      if(!area) return;
      let meter=card.querySelector('.area-progress');
      if(!meter){
        meter=document.createElement('div');
        meter.className='area-progress';
        card.appendChild(meter);
      }
      const p=state.progress[area], pct=areaAccuracy(area);
      meter.innerHTML=`<div><span>${p.attempts?pct+'%':'Not started / 未开始'}</span><small>${p.correct}/${p.attempts} correct</small></div><i><b style="width:${pct}%"></b></i>`;
    });
  }
}function renderDashboard(){const areas=[['📖','Reading Lab','阅读理解','Main idea, inference, evidence, theme, point of view.'],['🔤','Grammar Lab','语法训练','Sentence parts, clauses, tenses, agreement, modifiers.'],['🧠','Vocabulary','词汇训练','Context clues, roots, connotation, academic vocabulary.'],['✍️','Writing & Editing','写作修改','Revision, transitions, evidence, organization, editing.']];document.getElementById('areaGrid').innerHTML=areas.map((a,i)=>`<article onclick="showPage('${['reading','grammar','vocabulary','writing'][i]}')">${a[0]}<h4>${loc(a[1],a[2])}</h4><p>${a[3]}</p></article>`).join('')}
let activeGrammar='sentence_parts';function renderGrammar(){document.getElementById('grammarTabs').innerHTML=GRAMMAR_TOPICS.map(t=>`<button class="${t.id===activeGrammar?'active':''}" onclick="activeGrammar='${t.id}';renderGrammar()">${t.en} / ${t.zh}</button>`).join('');const t=GRAMMAR_TOPICS.find(x=>x.id===activeGrammar),q=GRAMMAR_QUESTIONS.find(x=>x.topic===activeGrammar);document.getElementById('grammarWorkspace').innerHTML=`<article class="lesson"><h3>${loc(t.en,t.zh)}</h3><div class="bilingual"><div class="lang-panel" data-en-only><b>Definition & Rule</b><p>${t.ruleEn}</p></div><div class="lang-panel" data-zh-only><b>定义与规则</b><p>${t.ruleZh}</p></div></div><div class="example">${t.example}<br><small>${t.focus}</small></div><h4>${loc('Quick Check','快速练习')}</h4><p>${loc(q.en,q.zh)}</p>${q.options.map((o,i)=>`<button class="option" onclick="checkQuick('${q.id}',${i},this)">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}<div id="quickFb"></div></article>`;applyLang()}
window.activeGrammar=activeGrammar;window.renderGrammar=renderGrammar;window.checkQuick=(id,i,btn)=>{const q=getQ(id),box=btn.parentElement;box.querySelectorAll('.option').forEach(b=>b.disabled=true);btn.classList.add(i===q.answer?'correct':'wrong');recordProgress(q,i===q.answer);if(i!==q.answer){box.querySelectorAll('.option')[q.answer].classList.add('correct');saveMistake(q,i)}document.getElementById('quickFb').innerHTML=`<div class="feedback">${explain(q,i)}</div>`;updateStats()};
let activePassage=READING_PASSAGES[0].id;function renderReading(){document.getElementById('readingTabs').innerHTML=READING_PASSAGES.map(p=>`<button class="${p.id===activePassage?'active':''}" onclick="activePassage='${p.id}';renderReading()">${p.title} • ${p.genre}</button>`).join('');const p=READING_PASSAGES.find(x=>x.id===activePassage);document.getElementById('readingWorkspace').innerHTML=`<article class="passage-card"><span class="tag">${p.genre}</span><span class="tag">Grade ${p.grade}</span><h3>${p.title}</h3><div class="passage-text">${p.text.split('\n\n').map(x=>`<p>${x}</p>`).join('')}</div>${p.questions.map((q,n)=>`<div class="question"><h4>${n+1}. ${loc(q.en,q.zh)}</h4>${q.options.map((o,i)=>`<button class="option" onclick="checkReading('${q.id}',${i},this)">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}<div class="feedback" id="rfb-${q.id}"></div></div>`).join('')}</article>`;applyLang()}window.activePassage=activePassage;window.renderReading=renderReading;window.checkReading=(id,i,btn)=>{const q=getQ(id),card=btn.closest('.question');card.querySelectorAll('.option').forEach(b=>b.disabled=true);btn.classList.add(i===q.answer?'correct':'wrong');recordProgress(q,i===q.answer);if(i!==q.answer){card.querySelectorAll('.option')[q.answer].classList.add('correct');saveMistake(q,i)}document.getElementById('rfb-'+id).innerHTML=explain(q,i);updateStats()};
function renderSet(container,questions,englishOnly=false){document.getElementById(container).innerHTML=questions.map((q,n)=>`<article class="question" data-qid="${q.id}"><span class="tag">${q.area}</span><h4>${n+1}. ${englishOnly?q.en:loc(q.en,q.zh)}</h4>${q.options.map((o,i)=>`<label><input type="radio" name="${container}-${q.id}" value="${i}"> ${String.fromCharCode(65+i)}. ${o}</label>`).join('')}<div class="feedback hidden"></div></article>`).join('');applyLang()}
function submitSet(container,qs,englishOnly=false){
  let score=0;
  const root=document.getElementById(container);
  if(!root) return {score:0,total:qs.length,percent:0};

  qs.forEach(q=>{
    const card=root.querySelector(`[data-qid="${q.id}"]`);
    if(!card) return;
    const ch=card.querySelector('input:checked');
    const sel=ch?+ch.value:null;
    const fb=card.querySelector('.feedback');
    fb.classList.remove('hidden');

    const correct=sel===q.answer;
    if(correct) score++;
    recordProgress(q,correct);
    if(!correct) saveMistake(q,sel);
    fb.innerHTML=explain(q,sel,englishOnly);
  });

  root.querySelectorAll('input').forEach(i=>i.disabled=true);
  updateStats();
  renderWeakness();
  return {score,total:qs.length,percent:Math.round(score/qs.length*100)};
}
let vocabSet=[],writingSet=[];function renderVocab(){vocabSet=shuffle(VOCAB_QUESTIONS).slice(0,12);document.getElementById('vocabWorkspace').innerHTML=`<div class="practice-box"><div id="vocabSet"></div><button class="primary" onclick="submitVocab()">Check Answers / 提交答案</button><div id="vocabResult"></div></div>`;renderSet('vocabSet',vocabSet)}window.submitVocab=()=>{const r=submitSet('vocabSet',vocabSet);document.getElementById('vocabResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total}</h3><p>${loc('Progress saved automatically.','进度已自动保存。')}</p><button class="secondary" onclick="renderVocab()">New Vocabulary Set / 换一组词汇题</button></div>`};function renderWriting(){writingSet=shuffle(WRITING_QUESTIONS).slice(0,12);document.getElementById('writingWorkspace').innerHTML=`<div class="practice-box"><div id="writingSet"></div><button class="primary" onclick="submitWriting()">Check Answers / 提交答案</button><div id="writingResult"></div></div>`;renderSet('writingSet',writingSet)}window.submitWriting=()=>{const r=submitSet('writingSet',writingSet);document.getElementById('writingResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total}</h3><p>${loc('Progress saved automatically.','进度已自动保存。')}</p><button class="secondary" onclick="renderWriting()">New Writing Set / 换一组写作题</button></div>`};
function renderBank(){const counts={Reading:readingQs().length,Grammar:GRAMMAR_QUESTIONS.length,Vocabulary:VOCAB_QUESTIONS.length,Writing:WRITING_QUESTIONS.length};document.getElementById('bankSummary').innerHTML=Object.entries(counts).map(([k,v])=>`<article><strong>${v}</strong><span>${k}</span></article>`).join('');document.getElementById('bankArea').innerHTML='<option value="all">All / 全部</option><option value="reading">Reading</option><option value="grammar">Grammar</option><option value="vocabulary">Vocabulary</option><option value="writing">Writing</option>'}
document.getElementById('startBank').onclick=()=>{let pool=allQs(),area=document.getElementById('bankArea').value,n=+document.getElementById('bankCount').value;if(area!=='all')pool=pool.filter(q=>q.area===area);state.bank=shuffle(pool).slice(0,n);document.getElementById('bankWorkspace').innerHTML='<div class="practice-box"><div id="bankSet"></div><button class="primary" onclick="submitBank()">Submit / 提交</button><div id="bankResult"></div></div>';renderSet('bankSet',state.bank)};window.submitBank=()=>{const r=submitSet('bankSet',state.bank);document.getElementById('bankResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total} (${r.percent}%)</h3></div>`};
function makeDiag(){state.diag=shuffle([...shuffle(readingQs()).slice(0,6),...shuffle(GRAMMAR_QUESTIONS).slice(0,8),...shuffle(VOCAB_QUESTIONS).slice(0,5),...shuffle(WRITING_QUESTIONS).slice(0,5)]);document.getElementById('diagId').textContent='D-'+Math.floor(1000+Math.random()*9000);renderSet('diagWorkspace',state.diag);document.getElementById('diagAnswered').textContent='0 / 24';document.querySelectorAll('#diagWorkspace input').forEach(i=>i.onchange=()=>document.getElementById('diagAnswered').textContent=`${document.querySelectorAll('#diagWorkspace input:checked').length} / 24`);document.getElementById('diagResult').classList.add('hidden')}document.getElementById('newDiag').onclick=makeDiag;document.getElementById('submitDiag').onclick=()=>{const r=submitSet('diagWorkspace',state.diag);state.history.push({type:'diagnostic',date:new Date().toISOString(),percent:r.percent});localStorage.setItem('ela-history',JSON.stringify(state.history));const b=document.getElementById('diagResult');b.classList.remove('hidden');b.innerHTML=`<h3>${r.score}/${r.total} (${r.percent}%)</h3><p>${r.percent>=85?loc('Strong foundation. Review only the missed areas.','基础较稳，重点复习错题。'):loc('Open the Mistake Book and Weak Areas next.','下一步打开错题本和薄弱点分析。')}</p>`;updateStats()};
function renderMistakes(){
  const s=document.getElementById('mistakeArea');
  const workspace=document.getElementById('mistakeWorkspace');
  if(!s||!workspace) return;

  const prev=s.value||'all';
  s.innerHTML='<option value="all">All / 全部</option><option value="reading">Reading</option><option value="grammar">Grammar</option><option value="vocabulary">Vocabulary</option><option value="writing">Writing</option>';
  s.value=prev;
  s.onchange=renderMistakes;

  // Remove stale mistake IDs safely, but preserve all valid existing mistakes.
  state.mistakes=state.mistakes.filter(m=>!!getQ(m.qid));
  localStorage.setItem('ela-mistakes',JSON.stringify(state.mistakes));

  const shown=state.mistakes.filter(m=>{
    const q=getQ(m.qid);
    return q&&(prev==='all'||q.area===prev);
  });

  workspace.innerHTML=shown.length
    ? shown.map((m,idx)=>{
        const q=getQ(m.qid);
        return `<article class="mistake-card">
          <div class="mistake-head">
            <div><span class="tag">${q.area}</span><span class="tag">Wrong ${m.times} time(s) / 错${m.times}次</span></div>
            <strong>#${idx+1}</strong>
          </div>
          <h4>${loc(q.en,q.zh)}</h4>
          ${explain(q,m.selected)}
          <div class="mistake-actions">
            <button class="primary" onclick="retryOne('${q.id}')">Retry / 重练</button>
            <button class="secondary" onclick="masterOne('${q.id}')">Mark Mastered / 已掌握</button>
          </div>
        </article>`
      }).join('')
    : '<div class="empty"><h3>No saved mistakes yet / 还没有错题</h3><p>Wrong answers from Reading, Grammar, Vocabulary, Writing, Question Bank, Diagnostic, and Mock Exam will appear here automatically.</p><p>阅读、语法、词汇、写作、题库、摸底和模拟考试中的错题都会自动进入这里。</p></div>';

  applyLang();
  document.getElementById('mistakeBadge').textContent=state.mistakes.length;
  if(document.getElementById('skillMap'))renderSkillMap();
}window.masterOne=id=>{state.mistakes=state.mistakes.filter(m=>m.qid!==id);localStorage.setItem('ela-mistakes',JSON.stringify(state.mistakes));renderMistakes();updateStats()};window.retryOne=id=>{state.bank=[getQ(id)];showPage('bank');document.getElementById('bankWorkspace').innerHTML='<div class="practice-box"><div id="bankSet"></div><button class="primary" onclick="submitBank()">Submit / 提交</button><div id="bankResult"></div></div>';renderSet('bankSet',state.bank)};document.getElementById('clearMistakes').onclick=()=>{if(confirm('Clear all mistakes? / 确定清空全部错题吗？')){state.mistakes=[];localStorage.setItem('ela-mistakes','[]');renderMistakes();updateStats()}};document.getElementById('practiceMistakes').onclick=()=>{const qs=state.mistakes.map(m=>getQ(m.qid)).filter(Boolean).slice(0,20);if(!qs.length)return;state.bank=qs;showPage('bank');document.getElementById('bankWorkspace').innerHTML='<div class="practice-box"><div id="bankSet"></div><button class="primary" onclick="submitBank()">Submit / 提交</button><div id="bankResult"></div></div>';renderSet('bankSet',qs)};
function renderWeakness(){const c={reading:0,grammar:0,vocabulary:0,writing:0};state.mistakes.forEach(m=>{const q=getQ(m.qid);if(q)c[q.area]+=m.times||1});document.getElementById('weakCards').innerHTML=Object.entries(c).map(([k,v])=>`<article><strong>${v}</strong><span>${k} mistake points</span></article>`).join('')}document.getElementById('trainWeak').onclick=()=>{const c={reading:0,grammar:0,vocabulary:0,writing:0};state.mistakes.forEach(m=>{const q=getQ(m.qid);if(q)c[q.area]+=m.times||1});const area=Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];state.weak=shuffle(allQs().filter(q=>q.area===area)).slice(0,15);document.getElementById('weakWorkspace').innerHTML=`<div class="practice-box"><h3>Target: ${area}</h3><div id="weakSet"></div><button class="primary" onclick="submitWeak()">Submit / 提交</button><div id="weakResult"></div></div>`;renderSet('weakSet',state.weak)};window.submitWeak=()=>{const r=submitSet('weakSet',state.weak);document.getElementById('weakResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total}</h3></div>`};
function makeMock(){const p=shuffle(READING_PASSAGES).slice(0,2);state.mock=[...p.flatMap(x=>x.questions),...shuffle(GRAMMAR_QUESTIONS).slice(0,12),...shuffle(VOCAB_QUESTIONS).slice(0,8),...shuffle(WRITING_QUESTIONS).slice(0,8)];document.getElementById('mockWorkspace').innerHTML=p.map((x,i)=>`<article class="passage-card"><h3>Passage ${i+1}: ${x.title}</h3><div class="passage-text">${x.text.split('\n\n').map(y=>`<p>${y}</p>`).join('')}</div></article>`).join('')+'<div id="mockSet"></div>';renderSet('mockSet',state.mock,true);document.getElementById('mockAnswered').textContent=`0 / ${state.mock.length}`;document.querySelectorAll('#mockSet input').forEach(i=>i.onchange=()=>document.getElementById('mockAnswered').textContent=`${document.querySelectorAll('#mockSet input:checked').length} / ${state.mock.length}`);document.getElementById('mockResult').classList.add('hidden')}document.getElementById('newMock').onclick=makeMock;document.getElementById('submitMock').onclick=()=>{const r=submitSet('mockSet',state.mock,true);state.history.push({type:'mock',date:new Date().toISOString(),percent:r.percent});localStorage.setItem('ela-history',JSON.stringify(state.history));const by={reading:[0,0],grammar:[0,0],vocabulary:[0,0],writing:[0,0]};state.mock.forEach(q=>{by[q.area][1]++;const card=document.querySelector(`#mockSet [data-qid="${q.id}"]`),ch=card.querySelector('input:checked');if(ch&&+ch.value===q.answer)by[q.area][0]++});const b=document.getElementById('mockResult');b.classList.remove('hidden');b.innerHTML=`<h3>Mock Score: ${r.score}/${r.total} (${r.percent}%)</h3>${Object.entries(by).map(([k,v])=>`<p><b>${k}</b>: ${v[0]}/${v[1]} (${Math.round(v[0]/v[1]*100)}%)</p>`).join('')}`;updateStats()};
function renderAll(){ensureProgress();renderDashboard();renderGrammar();renderReading();renderVocab();renderWriting();renderBank();renderMistakes();renderWeakness();updateStats();applyLang();renderSkillMap();renderSubskillBrowsers()}
makeDiag();makeMock();renderAll();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

const state={
lang:localStorage.getItem('ela-lang')||'bilingual',
theme:localStorage.getItem('ela-theme')||'light',
mistakes:JSON.parse(localStorage.getItem('ela-mistakes')||'[]'),
history:JSON.parse(localStorage.getItem('ela-history')||'[]'),
questionHistory:JSON.parse(localStorage.getItem('ela-question-history')||'{}'),
progress:JSON.parse(localStorage.getItem('ela-progress')||'{"reading":{"attempts":0,"correct":0},"grammar":{"attempts":0,"correct":0},"vocabulary":{"attempts":0,"correct":0},"writing":{"attempts":0,"correct":0}}'),
diag:[],mock:[],bank:[],weak:[]
};
const readingQs=()=>READING_PASSAGES.flatMap(p=>p.questions);
const allQs=()=>[...GRAMMAR_QUESTIONS,...VOCAB_QUESTIONS,...WRITING_QUESTIONS,...readingQs()];
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const SESSION_SIZE=12;
function qHistory(id){if(!state.questionHistory[id])state.questionHistory[id]={seen:0,correct:0,wrong:0,lastSeen:0};return state.questionHistory[id]}
function saveQuestionHistory(){localStorage.setItem('ela-question-history',JSON.stringify(state.questionHistory))}
function recordQuestionHistory(q,correct){const h=qHistory(q.id);h.seen++;if(correct)h.correct++;else h.wrong++;h.lastSeen=Date.now();saveQuestionHistory()}
function freshFirst(pool,count){return [...pool].sort((a,b)=>{const A=qHistory(a.id),B=qHistory(b.id);if((A.seen===0)!==(B.seen===0))return A.seen===0?-1:1;if(A.seen!==B.seen)return A.seen-B.seen;const wa=A.wrong*2-A.correct,wb=B.wrong*2-B.correct;if(wa!==wb)return wb-wa;return Math.random()-.5}).slice(0,Math.min(count,pool.length))}
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
function renderSkillMap(){
  const el=document.getElementById('skillMap');
  if(!el)return;
  const icons={reading:'📖',grammar:'🔤',vocabulary:'🧠',writing:'✍️'};
  el.innerHTML=Object.entries(DETAIL_SKILLS).map(([area,skills])=>`<section class="skill-group">
    <h4>${icons[area]} ${area[0].toUpperCase()+area.slice(1)}</h4>
    <div class="skill-list">
      ${skills.map(x=>{
        const n=skillPool(area,x[0]).length;
        return `<button ${n===0?'disabled':''} onclick="openDetailSkill('${area}','${x[0]}')">
          <b>${skillText(x)}</b>
          <small>${n} Q bank · ${Math.min(SESSION_SIZE,n)}/session</small>
        </button>`;
      }).join('')}
    </div>
  </section>`).join('');
}
function renderSubskillBrowsers(){
  [['reading','readingSkillBrowser'],['grammar','grammarSkillBrowser'],['vocabulary','vocabSkillBrowser'],['writing','writingSkillBrowser']].forEach(([area,id])=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.innerHTML=DETAIL_SKILLS[area].map(x=>{
      const n=skillPool(area,x[0]).length;
      return `<button ${n===0?'disabled':''} onclick="openDetailSkill('${area}','${x[0]}')">
        <span>${skillText(x)}</span>
        <small>${n} Q bank · ${Math.min(SESSION_SIZE,n)}/session</small>
      </button>`;
    }).join('');
  });
}
const focusedPractice={area:null,key:null,questions:[],index:0,score:0,answered:false};

function passageForQuestion(qid){
  return READING_PASSAGES.find(p=>p.questions.some(q=>q.id===qid)) || null;
}

function resetFocusedPractice(area,key,shuffleOrder=false,fullBank=false){
  const pool=skillPool(area,key);
  focusedPractice.area=area;
  focusedPractice.key=key;
  focusedPractice.questions=fullBank?(shuffleOrder?shuffle(pool):[...pool]):freshFirst(pool,SESSION_SIZE);
  focusedPractice.index=0;focusedPractice.score=0;focusedPractice.answered=false;
}

function focusedWorkspaceId(area){
  return area==='reading'?'readingWorkspace':area==='vocabulary'?'vocabWorkspace':'writingWorkspace';
}

function renderFocusedPractice(){
  const {area,key,questions,index,score}=focusedPractice;
  if(!area||area==='grammar') return;
  const workspace=document.getElementById(focusedWorkspaceId(area));
  if(!workspace) return;

  const detail=DETAIL_SKILLS[area].find(x=>x[0]===key);
  const total=questions.length;

  if(!total){
    workspace.innerHTML=`<div class="empty"><h3>${skillText(detail)}</h3><p>${loc('No questions are available for this skill yet.','这个知识点目前还没有题目。')}</p></div>`;
    return;
  }

  const q=questions[index];
  const progress=Math.round(((index+(focusedPractice.answered?1:0))/total)*100);
  let passageHtml='';

  if(area==='reading'){
    const p=passageForQuestion(q.id);
    if(p){
      passageHtml=`<article class="focused-passage">
        <span class="tag">${p.genre}</span><span class="tag">Grade ${p.grade}</span>
        <h3>${p.title}</h3>
        <div class="passage-text">${p.text.split('\n\n').map(x=>`<p>${x}</p>`).join('')}</div>
      </article>`;
    }
  }

  workspace.innerHTML=`<div class="focused-practice">
    <div class="focused-head">
      <div>
        <span class="eyebrow">${area.toUpperCase()} • FOCUSED PRACTICE</span>
        <h3>${skillText(detail)}</h3>
        <p>${loc(`${skillPool(area,key).length} questions in this bank. This session uses ${total} and prioritizes unseen questions.`,`这个细分类题库共有 ${skillPool(area,key).length} 题。本次练习 ${total} 题，并优先抽取没见过的新题。`)}</p>
      </div>
      <div class="focused-counter"><strong>${index+1}</strong><span>/ ${total}</span></div>
    </div>

    <div class="focused-progress"><i><b style="width:${progress}%"></b></i></div>

    ${passageHtml}

    <article class="focused-question-card">
      <h4>${loc(q.en,q.zh)}</h4>
      <div class="focused-options">
        ${q.options.map((o,i)=>`<button class="option" onclick="answerFocusedQuestion('${q.id}',${i},this)">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}
      </div>
      <div id="focusedFeedback"></div>
      <button id="focusedNext" class="primary hidden" onclick="nextFocusedQuestion()">${index===total-1?loc('Finish Skill','完成专题'):loc('Next Question','下一题')}</button>
    </article>
  </div>`;
  applyLang();
}

window.answerFocusedQuestion=function(id,i,btn){
  if(focusedPractice.answered) return;
  const q=getQ(id);
  if(!q) return;

  focusedPractice.answered=true;
  const card=btn.closest('.focused-question-card');
  card.querySelectorAll('.option').forEach(b=>b.disabled=true);

  const correct=i===q.answer;
  btn.classList.add(correct?'correct':'wrong');
  if(correct) focusedPractice.score++;

  recordProgress(q,correct);
  if(!correct){
    card.querySelectorAll('.option')[q.answer].classList.add('correct');
    saveMistake(q,i);
  }

  document.getElementById('focusedFeedback').innerHTML=`<div class="feedback">${explain(q,i)}</div>`;
  document.getElementById('focusedNext').classList.remove('hidden');
  updateStats();
};

window.nextFocusedQuestion=function(){
  const total=focusedPractice.questions.length;
  if(focusedPractice.index<total-1){
    focusedPractice.index++;
    focusedPractice.answered=false;
    renderFocusedPractice();
    const el=document.querySelector('.focused-practice');
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }

  const pct=total?Math.round(focusedPractice.score/total*100):0;
  const workspace=document.getElementById(focusedWorkspaceId(focusedPractice.area));
  workspace.innerHTML=`<div class="topic-complete">
    <div class="score-circle"><strong>${focusedPractice.score}/${total}</strong><span>${pct}%</span></div>
    <div>
      <h3>${pct>=90?loc('Excellent! Skill mastered.','非常好！这个知识点掌握得很稳。'):pct>=70?loc('Good work. Review your misses.','做得不错，复习一下错题。'):loc('This skill needs more practice.','这个知识点还需要继续练习。')}</h3>
      <p>${loc(`You completed all ${total} questions in this skill.`,`你已经完成这个知识点的全部 ${total} 道题。`)}</p>
      <div class="result-actions">
        <button class="primary" onclick="restartFocusedPractice(false)">${loc('Next Fresh Set','下一组新题')}</button><button class="secondary" onclick="restartFocusedPractice(true)">${loc('Practice Full Bank','练完整题库')}</button>
        <button class="secondary" onclick="showPage('mistakes')">${loc('Review Mistakes','查看错题')}</button>
      </div>
    </div>
  </div>`;
  updateStats();
};

window.restartFocusedPractice=function(fullBank=false){
  resetFocusedPractice(focusedPractice.area,focusedPractice.key,true,fullBank);
  renderFocusedPractice();
};

window.openDetailSkill=function(area,key){
  if(area==='grammar'){
    showPage('grammar');
    selectGrammarTopic(key);
    return;
  }

  showPage(area);
  resetFocusedPractice(area,key,false);
  renderFocusedPractice();
};

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
  recordQuestionHistory(q,isCorrect);
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
function explain(q,selected,englishOnly=false){
 const L=(en,zh)=>englishOnly?en:loc(en,zh);
 const yours=selected==null?'—':`${String.fromCharCode(65+selected)}. ${q.options[selected]}`;
 const correct=`${String.fromCharCode(65+q.answer)}. ${q.options[q.answer]}`;
 const selWhy=selected==null?L('No answer was selected.','没有选择答案。'):L((q.optionWhyEn||[])[selected]||'This choice does not fit the rule or evidence.',(q.optionWhyZh||[])[selected]||'这个选项不符合规则或证据。');
 const rows=q.options.map((o,i)=>`<div class="option-explain ${i===q.answer?'is-correct-option':''} ${selected===i?'is-your-option':''}"><b>${String.fromCharCode(65+i)}. ${o}</b><span>${L((q.optionWhyEn||[])[i]||(i===q.answer?'Correct.':'Incorrect.'),(q.optionWhyZh||[])[i]||(i===q.answer?'正确。':'错误。'))}</span></div>`).join('');
 const evidence=(q.evidenceEn||q.evidenceZh)?`<div class="evidence-box"><b>${L('Evidence / clue','文本证据 / 关键线索')}:</b><br>${L(q.evidenceEn||'',q.evidenceZh||'')}</div>`:'';
 return `<div class="answer yours"><b>${L('Your answer','你的答案')}:</b> ${yours}</div>
 <div class="selected-analysis"><b>${L('Why your choice is right/wrong','为什么你的选择对/错')}:</b><br>${selWhy}</div>
 <div class="answer correct"><b>${L('Correct answer','正确答案')}:</b> ${correct}</div>
 <div class="why"><b>${L('Why the correct answer is correct','为什么正确答案正确')}:</b><br>${L(q.whyEn,q.whyZh)}</div>
 ${evidence}
 <div class="remember"><b>${L('How to solve this next time','下次怎么判断')}:</b><br>${L(q.rememberEn,q.rememberZh)}</div>
 <details class="option-analysis"><summary>${L('Explain every option','查看每个选项为什么对/错')}</summary>${rows}</details>`;
}
function updateStats(){
  ensureProgress();
  const total=allQs().length;
  const best=state.history.filter(h=>h.type==='diagnostic').map(h=>h.percent);
  const practice=overallPractice();

  document.getElementById('stats').innerHTML=`
    <article class="progress-stat"><strong>${practice.percent}%</strong><span>Overall Practice / 综合练习</span><small>${practice.correct}/${practice.attempts||0} correct</small></article>
    <article><strong>${practice.attempts}</strong><span>Questions Attempted / 已练题目</span><small>${total} questions available · ${allQs().filter(q=>qHistory(q.id).seen===0).length} unseen / 未见</small></article>
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
let activeGrammar='sentence_parts';
let grammarPracticeOrder=[];
let grammarPracticeIndex=0;
let grammarPracticeScore=0;
let grammarPracticeAnswered=false;

function grammarTopicQuestions(topic){
  return GRAMMAR_QUESTIONS.filter(q=>q.topic===topic);
}

function resetGrammarPractice(shuffleOrder=false,fullBank=false){
  const qs=grammarTopicQuestions(activeGrammar);
  grammarPracticeOrder=fullBank?(shuffleOrder?shuffle(qs):[...qs]):freshFirst(qs,SESSION_SIZE);
  grammarPracticeIndex=0;grammarPracticeScore=0;grammarPracticeAnswered=false;
}

function renderGrammar(){
  document.getElementById('grammarTabs').innerHTML=GRAMMAR_TOPICS.map(t=>{
    const count=grammarTopicQuestions(t.id).length;
    return `<button class="${t.id===activeGrammar?'active':''}" onclick="selectGrammarTopic('${t.id}')">${t.en} / ${t.zh}<small>${count} Q bank · ${Math.min(SESSION_SIZE,count)}/session</small></button>`;
  }).join('');

  const t=GRAMMAR_TOPICS.find(x=>x.id===activeGrammar);
  if(!grammarPracticeOrder.length || !grammarPracticeOrder.every(q=>q.topic===activeGrammar)) resetGrammarPractice(false);
  const total=grammarPracticeOrder.length;
  const q=grammarPracticeOrder[grammarPracticeIndex];

  const practiceHtml=total?`<div class="grammar-practice-card">
    <div class="grammar-practice-head">
      <div><b>${loc('Topic Practice','专题练习')}</b><span>${grammarPracticeIndex+1} / ${total}</span></div>
      <div class="grammar-mini-progress"><i><b style="width:${((grammarPracticeIndex+(grammarPracticeAnswered?1:0))/total)*100}%"></b></i></div>
    </div>
    <p class="grammar-question">${loc(q.en,q.zh)}</p>
    <div class="grammar-options">${q.options.map((o,i)=>`<button class="option" data-idx="${i}" onclick="answerGrammarQuestion('${q.id}',${i},this)">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}</div>
    <div id="quickFb"></div>
    <div class="grammar-practice-actions">
      <button id="grammarNextBtn" class="primary hidden" onclick="nextGrammarQuestion()">${grammarPracticeIndex===total-1?loc('Finish Topic','完成专题'):loc('Next Question','下一题')}</button>
    </div>
  </div>`:`<div class="empty">${loc('No questions yet.','这个专题暂时没有题目。')}</div>`;

  document.getElementById('grammarWorkspace').innerHTML=`<article class="lesson">
    <h3>${loc(t.en,t.zh)}</h3>
    <div class="bilingual"><div class="lang-panel" data-en-only><b>Definition & Rule</b><p>${t.ruleEn}</p></div><div class="lang-panel" data-zh-only><b>定义与规则</b><p>${t.ruleZh}</p></div></div>
    <div class="example">${t.example}<br><small>${t.focus}</small></div>
    ${practiceHtml}
  </article>`;
  applyLang();
}

window.selectGrammarTopic=function(id){
  activeGrammar=id;
  window.activeGrammar=id;
  resetGrammarPractice(false);
  renderGrammar();
};
window.activeGrammar=activeGrammar;
window.renderGrammar=renderGrammar;

window.answerGrammarQuestion=function(id,i,btn){
  if(grammarPracticeAnswered) return;
  const q=getQ(id),box=btn.closest('.grammar-practice-card');
  grammarPracticeAnswered=true;
  box.querySelectorAll('.option').forEach(b=>b.disabled=true);
  const correct=i===q.answer;
  btn.classList.add(correct?'correct':'wrong');
  if(correct) grammarPracticeScore++;
  recordProgress(q,correct);
  if(!correct){
    box.querySelectorAll('.option')[q.answer].classList.add('correct');
    saveMistake(q,i);
  }
  document.getElementById('quickFb').innerHTML=`<div class="feedback">${explain(q,i)}</div>`;
  const next=document.getElementById('grammarNextBtn');
  if(next) next.classList.remove('hidden');
  updateStats();
};

window.nextGrammarQuestion=function(){
  const total=grammarPracticeOrder.length;
  if(grammarPracticeIndex<total-1){
    grammarPracticeIndex++;
    grammarPracticeAnswered=false;
    renderGrammar();
    const card=document.querySelector('.grammar-practice-card');
    if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  const pct=total?Math.round(grammarPracticeScore/total*100):0;
  document.querySelector('.grammar-practice-card').innerHTML=`<div class="grammar-topic-result">
    <div class="score-circle"><strong>${grammarPracticeScore}/${total}</strong><span>${pct}%</span></div>
    <div><h3>${pct>=90?loc('Excellent! Topic mastered.','非常好！这个专题掌握得很稳。'):pct>=70?loc('Good work. Review the missed questions.','做得不错，重点复习错题。'):loc('This topic needs more practice.','这个专题还需要继续练习。')}</h3>
    <p>${loc(`This session is complete. The full topic bank contains ${grammarTopicQuestions(activeGrammar).length} questions.`,`本次练习完成。这个专题完整题库共有 ${grammarTopicQuestions(activeGrammar).length} 题。`)}</p>
    <div class="grammar-result-actions"><button class="primary" onclick="restartGrammarPractice(false)">${loc('Next Fresh Set','下一组新题')}</button><button class="secondary" onclick="restartGrammarPractice(true)">${loc('Practice Full Bank','练完整题库')}</button><button class="secondary" onclick="showPage('mistakes')">${loc('Review Mistakes','查看错题')}</button></div></div>
  </div>`;
  updateStats();
};

window.restartGrammarPractice=function(fullBank=false){resetGrammarPractice(true,fullBank);renderGrammar();};
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
let vocabSet=[],writingSet=[];
function renderVocab(){
  vocabSet=freshFirst(VOCAB_QUESTIONS,12);
  document.getElementById('vocabWorkspace').innerHTML=`<div class="practice-box">
    <h3>${loc('Mixed Quick Practice','综合快速练习')}</h3>
    <p>${loc('This mixed set is separate from the skill buttons above. Click a skill above when you want to complete every question in that category.','这组是综合快速练习。要完成某个细分类的全部题目，请点击上方对应知识点。')}</p>
    <div id="vocabSet"></div>
    <button class="primary" onclick="submitVocab()">Check Answers / 提交答案</button>
    <div id="vocabResult"></div>
  </div>`;
  renderSet('vocabSet',vocabSet);
}
window.submitVocab=()=>{
  const r=submitSet('vocabSet',vocabSet);
  document.getElementById('vocabResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total}</h3><p>${loc('Progress saved automatically.','进度已自动保存。')}</p><button class="secondary" onclick="renderVocab()">New Mixed Set / 换一组综合题</button></div>`;
};

function renderWriting(){
  writingSet=freshFirst(WRITING_QUESTIONS,12);
  document.getElementById('writingWorkspace').innerHTML=`<div class="practice-box">
    <h3>${loc('Mixed Quick Practice','综合快速练习')}</h3>
    <p>${loc('This mixed set is separate from the skill buttons above. Click a skill above when you want to complete every question in that category.','这组是综合快速练习。要完成某个细分类的全部题目，请点击上方对应知识点。')}</p>
    <div id="writingSet"></div>
    <button class="primary" onclick="submitWriting()">Check Answers / 提交答案</button>
    <div id="writingResult"></div>
  </div>`;
  renderSet('writingSet',writingSet);
}
window.submitWriting=()=>{
  const r=submitSet('writingSet',writingSet);
  document.getElementById('writingResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total}</h3><p>${loc('Progress saved automatically.','进度已自动保存。')}</p><button class="secondary" onclick="renderWriting()">New Mixed Set / 换一组综合题</button></div>`;
};
function renderBank(){const counts={Reading:readingQs().length,Grammar:GRAMMAR_QUESTIONS.length,Vocabulary:VOCAB_QUESTIONS.length,Writing:WRITING_QUESTIONS.length};document.getElementById('bankSummary').innerHTML=Object.entries(counts).map(([k,v])=>`<article><strong>${v}</strong><span>${k}</span></article>`).join('');document.getElementById('bankArea').innerHTML='<option value="all">All / 全部</option><option value="reading">Reading</option><option value="grammar">Grammar</option><option value="vocabulary">Vocabulary</option><option value="writing">Writing</option>'}
document.getElementById('startBank').onclick=()=>{let pool=allQs(),area=document.getElementById('bankArea').value,n=+document.getElementById('bankCount').value;if(area!=='all')pool=pool.filter(q=>q.area===area);state.bank=freshFirst(pool,n);document.getElementById('bankWorkspace').innerHTML='<div class="practice-box"><div id="bankSet"></div><button class="primary" onclick="submitBank()">Submit / 提交</button><div id="bankResult"></div></div>';renderSet('bankSet',state.bank)};window.submitBank=()=>{const r=submitSet('bankSet',state.bank);document.getElementById('bankResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total} (${r.percent}%)</h3></div>`};
function makeDiag(){state.diag=shuffle([...freshFirst(readingQs(),6),...freshFirst(GRAMMAR_QUESTIONS,8),...freshFirst(VOCAB_QUESTIONS,5),...freshFirst(WRITING_QUESTIONS,5)]);document.getElementById('diagId').textContent='D-'+Math.floor(1000+Math.random()*9000);renderSet('diagWorkspace',state.diag);document.getElementById('diagAnswered').textContent='0 / 24';document.querySelectorAll('#diagWorkspace input').forEach(i=>i.onchange=()=>document.getElementById('diagAnswered').textContent=`${document.querySelectorAll('#diagWorkspace input:checked').length} / 24`);document.getElementById('diagResult').classList.add('hidden')}document.getElementById('newDiag').onclick=makeDiag;document.getElementById('submitDiag').onclick=()=>{const r=submitSet('diagWorkspace',state.diag);state.history.push({type:'diagnostic',date:new Date().toISOString(),percent:r.percent});localStorage.setItem('ela-history',JSON.stringify(state.history));const b=document.getElementById('diagResult');b.classList.remove('hidden');b.innerHTML=`<h3>${r.score}/${r.total} (${r.percent}%)</h3><p>${r.percent>=85?loc('Strong foundation. Review only the missed areas.','基础较稳，重点复习错题。'):loc('Open the Mistake Book and Weak Areas next.','下一步打开错题本和薄弱点分析。')}</p>`;updateStats()};
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
function renderWeakness(){const c={reading:0,grammar:0,vocabulary:0,writing:0};state.mistakes.forEach(m=>{const q=getQ(m.qid);if(q)c[q.area]+=m.times||1});document.getElementById('weakCards').innerHTML=Object.entries(c).map(([k,v])=>`<article><strong>${v}</strong><span>${k} mistake points</span></article>`).join('')}document.getElementById('trainWeak').onclick=()=>{const c={reading:0,grammar:0,vocabulary:0,writing:0};state.mistakes.forEach(m=>{const q=getQ(m.qid);if(q)c[q.area]+=m.times||1});const area=Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];state.weak=freshFirst(allQs().filter(q=>q.area===area),15);document.getElementById('weakWorkspace').innerHTML=`<div class="practice-box"><h3>Target: ${area}</h3><div id="weakSet"></div><button class="primary" onclick="submitWeak()">Submit / 提交</button><div id="weakResult"></div></div>`;renderSet('weakSet',state.weak)};window.submitWeak=()=>{const r=submitSet('weakSet',state.weak);document.getElementById('weakResult').innerHTML=`<div class="result"><h3>${r.score}/${r.total}</h3></div>`};
function makeMock(){const p=shuffle(READING_PASSAGES).slice(0,2);state.mock=[...p.flatMap(x=>x.questions),...shuffle(GRAMMAR_QUESTIONS).slice(0,12),...shuffle(VOCAB_QUESTIONS).slice(0,8),...shuffle(WRITING_QUESTIONS).slice(0,8)];document.getElementById('mockWorkspace').innerHTML=p.map((x,i)=>`<article class="passage-card"><h3>Passage ${i+1}: ${x.title}</h3><div class="passage-text">${x.text.split('\n\n').map(y=>`<p>${y}</p>`).join('')}</div></article>`).join('')+'<div id="mockSet"></div>';renderSet('mockSet',state.mock,true);document.getElementById('mockAnswered').textContent=`0 / ${state.mock.length}`;document.querySelectorAll('#mockSet input').forEach(i=>i.onchange=()=>document.getElementById('mockAnswered').textContent=`${document.querySelectorAll('#mockSet input:checked').length} / ${state.mock.length}`);document.getElementById('mockResult').classList.add('hidden')}document.getElementById('newMock').onclick=makeMock;document.getElementById('submitMock').onclick=()=>{const r=submitSet('mockSet',state.mock,true);state.history.push({type:'mock',date:new Date().toISOString(),percent:r.percent});localStorage.setItem('ela-history',JSON.stringify(state.history));const by={reading:[0,0],grammar:[0,0],vocabulary:[0,0],writing:[0,0]};state.mock.forEach(q=>{by[q.area][1]++;const card=document.querySelector(`#mockSet [data-qid="${q.id}"]`),ch=card.querySelector('input:checked');if(ch&&+ch.value===q.answer)by[q.area][0]++});const b=document.getElementById('mockResult');b.classList.remove('hidden');b.innerHTML=`<h3>Mock Score: ${r.score}/${r.total} (${r.percent}%)</h3>${Object.entries(by).map(([k,v])=>`<p><b>${k}</b>: ${v[0]}/${v[1]} (${Math.round(v[0]/v[1]*100)}%)</p>`).join('')}`;updateStats()};
function renderAll(){ensureProgress();renderDashboard();renderGrammar();renderReading();renderVocab();renderWriting();renderBank();renderMistakes();renderWeakness();updateStats();applyLang();renderSkillMap();renderSubskillBrowsers()}
makeDiag();makeMock();renderAll();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

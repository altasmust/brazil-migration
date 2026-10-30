const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};function el(){return {innerHTML:'',textContent:'',style:{},value:'2',open:false,focus(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},setAttribute(){}}}
const ctx={window:{addEventListener(){}},document:{body:{dataset:{page:'home'}},getElementById(id){return elements[id]??=el()},querySelectorAll(){return []},addEventListener(){}},console,Intl,URL,URLSearchParams,history:{replaceState(){}},location:{href:'https://example.com/degerlendirme/',hash:''},setTimeout,Blob};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),ctx);
vm.runInContext(`
for(const [id,q] of Object.entries(DATA.quizzes)){
 const maxAnswers=q.questions.map(x=>x.multi?x.options.map((_,i)=>i):x.options.findIndex(o=>o.points===Math.max(...x.options.map(v=>v.points))));
 if(scoreOf(id,maxAnswers).score!==100)throw Error('max '+id);
 if(scoreOf(id,[]).score!==0)throw Error('empty '+id);
 if(scoreOf(id,q.questions.map(()=>null)).score!==0)throw Error('skip '+id);
 startQuiz(id);
 for(let i=0;i<10;i++){const x=q.questions[i];if(x.multi){x.options.forEach((_,j)=>chooseAnswer(j));chooseAnswer(0);chooseAnswer(0)}else chooseAnswer(maxAnswers[i]);nextQuestion()}
 if(!resultText.includes('100/100'))throw Error('full flow '+id);
 step=0;drawQuestion();skipQuestion();if(scoreOf(id,answers).score>=100)throw Error('skip recompute '+id);
}
if(band(60)!=='Yetersiz'||band(61)!=='Orta'||band(80)!=='Orta'||band(81)!=='Mükemmel')throw Error('boundaries');
if(scoreOf('sirket',[0,0,0,0,[0,0,1,2,3,4],0]).raw!==115)throw Error('multi cap');
book('oturum',1);if(!document.getElementById('booking-body').innerHTML.includes('3.525 USD'))throw Error('family pricing');
console.log('PASS: all 5 quiz flows, normalization, multi-select toggles/cap, back/skip recalculation, score boundaries, family pricing and result generation.');
`,ctx);

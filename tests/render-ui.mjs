import vm from 'node:vm';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
let js=readFileSync('public/panel/features.js','utf8');js=js.slice(0,js.indexOf("document.addEventListener('click',async"))+`\nglobalThis.qa=(state,view)=>{S=state;selected=state.member.id;page=view;return ({overview,documents:files,finance:finances,services:applications,support,team,profile,reports})[view]()};})();`;
let ctx={localStorage:{getItem(){return 'tr'}},location:{origin:'https://example.test',pathname:'/panel/'},document:{addEventListener(){}},Date,Intl,console,setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(js,ctx);
const member={id:'sample',role:'customer',name:'Mustafa ALTAŞ',email:'mustafa@example.test',permissions:{},scope:'all'};const state={member,customers:[member],items:[],members:[],sales:[],countries:['Türkiye','Brezilya']};
for(let i=0;i<3;i++)state.items.push({id:'doc'+i,kind:'document',owner:'sample',created:Date.now(),data:{slot:i,name:'belge.pdf',direction:'out',status:'Yüklendi'}});
state.items.push({id:'a1',kind:'application',owner:'sample',created:Date.now(),data:{service:'Oturum İzni',status:'Avukatta',from:'Türkiye',expiry:'2027-10-20'}});
let base=readFileSync('public/panel/index.html','utf8').replace('<script src="/panel/workspace.js" defer></script>','');mkdirSync('public/qa-panel',{recursive:true});
for(const view of ['overview','documents','finance','services','support','profile']){let html=base.replace(/<main[\s\S]*?<\/main>/,`<main id="content">${ctx.qa(state,view)}</main>`);writeFileSync('public/qa-panel/'+view+'.html',html)}
console.log('UI fixture renders passed (synthetic records; not an authorization test).');

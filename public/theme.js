(function(){
const root=document.documentElement,system=matchMedia('(prefers-color-scheme: dark)');
let preference;try{preference=localStorage.getItem('brasil-theme')}catch(e){}
function apply(dark){root.dataset.theme=dark?'dark':'light';root.style.colorScheme=dark?'dark':'light';document.querySelectorAll('.theme-toggle').forEach(b=>{b.setAttribute('aria-pressed',String(dark));b.setAttribute('aria-label',dark?'Açık moda geç':'Koyu moda geç');b.querySelector('.theme-icon').textContent=dark?'☀':'☾';b.querySelector('.theme-label').textContent=dark?'Açık':'Koyu'})}
apply(preference?preference==='dark':system.matches);
window.toggleTheme=function(){const dark=root.dataset.theme!=='dark';preference=dark?'dark':'light';apply(dark);try{localStorage.setItem('brasil-theme',preference)}catch(e){}};
system.addEventListener('change',e=>{if(!preference)apply(e.matches)});
document.addEventListener('DOMContentLoaded',()=>{apply(root.dataset.theme==='dark');const night=new Image();night.src='/sao-paulo-night.webp';night.decode?.().catch(()=>{});requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('theme-ready')))});
})();

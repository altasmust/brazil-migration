(function(){
const root=document.documentElement,system=matchMedia('(prefers-color-scheme: dark)');
let preference;try{preference=localStorage.getItem('brasil-theme')}catch(e){}
function nights(){document.querySelectorAll('img[data-night]').forEach(i=>{if(i.dataset.night.startsWith('/sao-paulo-night')){i.srcset='/sao-paulo-night-960.webp 960w, /sao-paulo-night.webp 1536w';i.sizes='(max-width: 760px) 60vw, 100vw'}i.src=i.dataset.night;i.removeAttribute('data-night')})}
function apply(dark){if(dark&&document.body)nights();root.dataset.theme=dark?'dark':'light';root.style.colorScheme=dark?'dark':'light';document.querySelectorAll('.theme-toggle').forEach(b=>{b.setAttribute('aria-pressed',String(dark));b.setAttribute('aria-label',dark?'Açık moda geç':'Koyu moda geç');b.querySelector('.theme-icon').textContent=dark?'☀':'☾';b.querySelector('.theme-label').textContent=dark?'Açık':'Koyu'})}
apply(preference?preference==='dark':system.matches);
window.toggleTheme=function(){const dark=root.dataset.theme!=='dark';preference=dark?'dark':'light';apply(dark);try{localStorage.setItem('brasil-theme',preference)}catch(e){}};
system.addEventListener('change',e=>{if(!preference)apply(e.matches)});
window.bmNights=nights;addEventListener('load',()=>setTimeout(()=>(window.requestIdleCallback||setTimeout)(nights),3500));
document.addEventListener('DOMContentLoaded',()=>{apply(root.dataset.theme==='dark');requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('theme-ready')))});
})();

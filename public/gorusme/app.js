/* ===== Configuration: change these to rebrand (e.g. for another site) ===== */
const CONFIG = {
  brand: 'Brazil Migration Görüşme',
  peerPrefix: 'brazilmigration-gorusme-',  // keep stable so old invite links keep working
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
    // Add a TURN server here for strict corporate/mobile networks, e.g.:
    // { urls: 'turn:YOUR_HOST:3478', username: 'USER', credential: 'PASS' }
  ]
};

const LANGS = {
  tr: { code:'tr', sr:'tr-TR', tts:'tr-TR', short:'TR', label:'Türkçe', sw:'var(--tr)' },
  pt: { code:'pt', sr:'pt-BR', tts:'pt-BR', short:'PT', label:'Português', sw:'var(--br)' }
};

const I18N = {
  tr: {
    tagline:'Tercümanlı görüntülü görüşme', camOffPreview:'Kamera kapalı', mic:'Mikrofon', cam:'Kamera',
    micDevice:'Mikrofon', camDevice:'Kamera', headline:'Dil engeli olmadan görüşün.',
    lead:'Siz kendi dilinizde konuşun; karşı taraf altyazıyı ve isterse sesi kendi dilinde alsın.',
    yourLang:'Konuştuğunuz dil · Seu idioma', name:'Adınız', namePh:'Ad Soyad', room:'Oda kodu',
    roomPh:'Boş bırakın, otomatik oluşsun', create:'Oda oluştur', join:'Odaya katıl',
    fine:'En iyi sonuç için Chrome veya Edge kullanın. Görüntü ve ses doğrudan iki cihaz arasında taşınır, sunucuda kaydedilmez.',
    f1t:'Akan altyazı', f1d:'Cümle bitmeden çeviri ekrana düşer.',
    f2t:'Sesli çeviri', f2d:'Çeviriyi duymak isterseniz tek dokunuşla açın.',
    f3t:'Doğrudan bağlantı', f3d:'Görüntü sunucuya uğramaz; döküm yalnız sizde kalır.',
    roomShort:'Oda', camOffThem:'Kamerası kapalı', you:'Siz', swapTip:'Görüntüleri yer değiştir',
    waitTitle:'Karşı taraf bekleniyor', waitText:'Bu linki gönderin. Açtığında dil otomatik Portekizce seçili gelir.',
    copy:'Kopyala', logTab:'Döküm', chatTab:'Sohbet', logEmpty:'Konuşmalar burada iki dilde birikir.',
    chatEmpty:'Yazdığınız mesaj karşı tarafa çevrilerek gider. Adres, tarih veya dosya numarası paylaşmak için idealdir.',
    download:'Dökümü indir', chatPh:'Mesaj yazın…', voice:'Sesli çeviri', share:'Ekran', panelBtn:'Sohbet', more:'Diğer',
    capSize:'Altyazı boyutu', ownCaps:'Kendi altyazımı göster', showOrig:'Orijinal metni göster',
    copyLink:'Davet linkini kopyala', fullscreen:'Tam ekran', end:'Bitir',
    endTitle:'Görüşme sona erdi', stDur:'Süre', stLines:'Çevrilen cümle', stMsgs:'Mesaj',
    endNote:'Döküm yalnızca bu cihazda tutuluyor. Sayfayı kapatmadan önce indirin.', newCall:'Yeni görüşme',
    connecting:'Bağlanıyor', waiting:'Bekleniyor', connected:'Bağlı', reconnecting:'Yeniden bağlanıyor', left:'Karşı taraf ayrıldı',
    listening:'Dinliyor', paused:'Çeviri sesi okunuyor', noSR:'Konuşma tanıma yok · Chrome/Edge kullanın', srNet:'Konuşma tanıma bağlantısı koptu',
    copied:'Link kopyalandı', joined:'{n} görüşmeye katıldı', leftT:'{n} görüşmeden ayrıldı',
    needRoom:'Katılmak için oda kodunu yazın.', taken:'Bu oda zaten açık. "Odaya katıl"a basın veya başka kod deneyin.',
    notFound:'Bu kodla açık oda bulunamadı. Kodu kontrol edin veya karşı tarafın odayı açmasını bekleyin.',
    media:'Kamera veya mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin verin.',
    noMedia:'Kamera bulunamadı; yalnız sesle devam ediliyor.', signal:'Bağlantı sunucusuna ulaşılamadı. İnternetinizi kontrol edip tekrar deneyin.',
    shareOn:'Ekranınız paylaşılıyor', shareFail:'Ekran paylaşımı başlatılamadı.', themShare:'{n} ekranını paylaşıyor',
    voiceOn:'Sesli çeviri açık', voiceOff:'Sesli çeviri kapalı', speakerDefault:'Karşı taraf',
    meSpeaks:'Siz: Türkçe', pair:'TR → PT', retry:'Tekrar dene'
  },
  pt: {
    tagline:'Videochamada com tradução', camOffPreview:'Câmera desligada', mic:'Microfone', cam:'Câmera',
    micDevice:'Microfone', camDevice:'Câmera', headline:'Converse sem barreira de idioma.',
    lead:'Fale no seu idioma; a outra pessoa recebe a legenda e, se quiser, a voz no idioma dela.',
    yourLang:'Seu idioma · Konuştuğunuz dil', name:'Seu nome', namePh:'Nome e sobrenome', room:'Código da sala',
    roomPh:'Deixe vazio para gerar', create:'Criar sala', join:'Entrar na sala',
    fine:'Use Chrome ou Edge para o melhor resultado. Vídeo e áudio vão direto entre os dois aparelhos e não ficam gravados em servidor.',
    f1t:'Legenda contínua', f1d:'A tradução aparece antes de a frase terminar.',
    f2t:'Voz traduzida', f2d:'Ative com um toque se quiser ouvir a tradução.',
    f3t:'Conexão direta', f3d:'O vídeo não passa por servidor; a transcrição fica só com você.',
    roomShort:'Sala', camOffThem:'Câmera desligada', you:'Você', swapTip:'Trocar vídeos de lugar',
    waitTitle:'Aguardando a outra pessoa', waitText:'Envie este link. Ao abrir, o idioma já vem em turco.',
    copy:'Copiar', logTab:'Transcrição', chatTab:'Chat', logEmpty:'As falas ficam aqui nos dois idiomas.',
    chatEmpty:'Sua mensagem chega traduzida. Ideal para endereços, datas ou números de processo.',
    download:'Baixar transcrição', chatPh:'Escreva uma mensagem…', voice:'Voz traduzida', share:'Tela', panelBtn:'Chat', more:'Mais',
    capSize:'Tamanho da legenda', ownCaps:'Mostrar minha legenda', showOrig:'Mostrar texto original',
    copyLink:'Copiar link do convite', fullscreen:'Tela cheia', end:'Encerrar',
    endTitle:'Chamada encerrada', stDur:'Duração', stLines:'Frases traduzidas', stMsgs:'Mensagens',
    endNote:'A transcrição fica só neste aparelho. Baixe antes de fechar a página.', newCall:'Nova chamada',
    connecting:'Conectando', waiting:'Aguardando', connected:'Conectado', reconnecting:'Reconectando', left:'A outra pessoa saiu',
    listening:'Ouvindo', paused:'Lendo a tradução', noSR:'Sem reconhecimento de fala · use Chrome/Edge', srNet:'Reconhecimento de fala desconectado',
    copied:'Link copiado', joined:'{n} entrou na chamada', leftT:'{n} saiu da chamada',
    needRoom:'Digite o código da sala para entrar.', taken:'Esta sala já está aberta. Clique em "Entrar na sala" ou use outro código.',
    notFound:'Nenhuma sala aberta com este código. Confira o código ou aguarde a outra pessoa abrir a sala.',
    media:'Permissão de câmera ou microfone negada. Libere pelo cadeado na barra de endereço.',
    noMedia:'Câmera não encontrada; seguindo só com áudio.', signal:'Não foi possível acessar o servidor de conexão. Verifique a internet e tente de novo.',
    shareOn:'Sua tela está sendo compartilhada', shareFail:'Não foi possível compartilhar a tela.', themShare:'{n} está compartilhando a tela',
    voiceOn:'Voz traduzida ligada', voiceOff:'Voz traduzida desligada', speakerDefault:'Outra pessoa',
    meSpeaks:'Você: Português', pair:'PT → TR', retry:'Tentar de novo'
  }
};

/* ===== State ===== */
const $ = id => document.getElementById(id);
const S = {
  me: 'tr', name: '', room: '', role: null,
  stream: null, camOn: true, micOn: true, screenStream: null,
  peer: null, conn: null, call: null, peerName: '', peerLang: null,
  rec: null, recWanted: true, recPaused: false,
  voiceOn: false, showOwn: true, showOrig: true, capSize: 22,
  startedAt: null, timerId: null, lines: [], msgs: 0, unread: 0, panelOpen: false, panelTab: 'log',
  audioCtx: null, meterRaf: 0
};
const t = (k, vars) => { let s = (I18N[S.me][k] ?? I18N.tr[k] ?? k); if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]); return s; };
const other = l => l === 'tr' ? 'pt' : 'tr';
const store = { get(k){ try { return localStorage.getItem('ij-' + k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem('ij-' + k, v); } catch(e){} } };
const initials = n => (n || '?').trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase() || '?';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function show(view){ ['lobby','call','ended'].forEach(v => $(v).hidden = v !== view); }
function toast(msg, bad){ const el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = msg; $('toasts').appendChild(el); setTimeout(() => el.remove(), 3200); }

/* ===== i18n ===== */
function applyLang(){
  document.documentElement.lang = S.me === 'tr' ? 'tr' : 'pt-BR';
  document.querySelectorAll('[data-i]').forEach(el => el.textContent = t(el.dataset.i));
  document.querySelectorAll('[data-iph]').forEach(el => el.placeholder = t(el.dataset.iph));
  document.querySelectorAll('[data-i-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.iAria)));
  $('lang-tr').setAttribute('aria-pressed', S.me === 'tr');
  $('lang-pt').setAttribute('aria-pressed', S.me === 'pt');
  ['brandName','tbBrand'].forEach(id => $(id).textContent = CONFIG.brand);
  document.title = CONFIG.brand;
}

/* ===== Lobby: preview, devices, meter ===== */
async function openMedia(micId, camId){
  const audio = { echoCancellation:true, noiseSuppression:true, autoGainControl:true, ...(micId ? { deviceId:{ exact:micId } } : {}) };
  const video = { width:{ ideal:1280 }, height:{ ideal:720 }, ...(camId ? { deviceId:{ exact:camId } } : {}) };
  try { return await navigator.mediaDevices.getUserMedia({ audio, video }); }
  catch(e){
    if (e.name === 'NotAllowedError') throw e;
    try { const s = await navigator.mediaDevices.getUserMedia({ audio }); toast(t('noMedia')); return s; }
    catch(e2){ throw e2; }
  }
}
async function fillDevices(){
  const list = await navigator.mediaDevices.enumerateDevices();
  const fill = (sel, kind, current) => {
    const items = list.filter(d => d.kind === kind);
    sel.innerHTML = items.map((d,i) => `<option value="${esc(d.deviceId)}">${esc(d.label || (kind === 'audioinput' ? 'Mic ' : 'Cam ') + (i+1))}</option>`).join('');
    if (current) sel.value = current;
    sel.disabled = items.length < 2;
  };
  const a = S.stream && S.stream.getAudioTracks()[0], v = S.stream && S.stream.getVideoTracks()[0];
  fill($('selMic'), 'audioinput', a && a.getSettings().deviceId);
  fill($('selCam'), 'videoinput', v && v.getSettings().deviceId);
}
async function startPreview(){
  try {
    S.stream = await openMedia(store.get('mic'), store.get('cam'));
  } catch(e){
    try { S.stream = await openMedia(); } catch(e2){ lobbyErr(t('media')); return false; }
  }
  $('pvVideo').srcObject = S.stream;
  applyTrackStates();
  startMeter();
  fillDevices().catch(() => {});
  return true;
}
async function switchDevice(kind, id){
  const isAudio = kind === 'audio';
  try {
    const s = await navigator.mediaDevices.getUserMedia(isAudio
      ? { audio:{ deviceId:{ exact:id }, echoCancellation:true, noiseSuppression:true } }
      : { video:{ deviceId:{ exact:id }, width:{ ideal:1280 }, height:{ ideal:720 } } });
    const nt = isAudio ? s.getAudioTracks()[0] : s.getVideoTracks()[0];
    const old = isAudio ? S.stream.getAudioTracks()[0] : S.stream.getVideoTracks()[0];
    if (old){ S.stream.removeTrack(old); old.stop(); }
    S.stream.addTrack(nt);
    store.set(isAudio ? 'mic' : 'cam', id);
    replaceOutgoing(nt);
    applyTrackStates();
    if (isAudio) startMeter();
  } catch(e){ toast(t('media'), true); }
}
function startMeter(){
  cancelAnimationFrame(S.meterRaf);
  const track = S.stream && S.stream.getAudioTracks()[0];
  if (!track) return;
  try {
    S.audioCtx = S.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const src = S.audioCtx.createMediaStreamSource(new MediaStream([track]));
    const an = S.audioCtx.createAnalyser(); an.fftSize = 512; src.connect(an);
    const buf = new Uint8Array(an.fftSize), bars = $('pvMeter').querySelectorAll('i');
    const loop = () => {
      an.getByteTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++){ const v = (buf[i] - 128) / 128; sum += v * v; }
      const lvl = S.micOn ? Math.min(1, Math.sqrt(sum / buf.length) * 5) : 0;
      bars.forEach((b, i) => { const on = lvl > (i + 0.5) / bars.length; b.classList.toggle('on', on); b.style.height = on ? (6 + i * 2) + 'px' : '4px'; });
      S.meterRaf = requestAnimationFrame(loop);
    };
    loop();
  } catch(e){}
}
document.addEventListener('pointerdown', () => { if (S.audioCtx && S.audioCtx.state === 'suspended') S.audioCtx.resume(); }, { passive:true });

function applyTrackStates(){
  if (!S.stream) return;
  S.stream.getAudioTracks().forEach(tr => tr.enabled = S.micOn);
  S.stream.getVideoTracks().forEach(tr => tr.enabled = S.camOn);
  const hasCam = S.stream.getVideoTracks().length > 0;
  const camVisible = S.camOn && hasCam;
  // lobby
  setIcon($('pvMic'), S.micOn ? 'i-mic' : 'i-mic-off'); $('pvMic').classList.toggle('off', !S.micOn); $('pvMic').setAttribute('aria-pressed', S.micOn);
  setIcon($('pvCam'), camVisible ? 'i-cam' : 'i-cam-off'); $('pvCam').classList.toggle('off', !camVisible); $('pvCam').setAttribute('aria-pressed', camVisible);
  $('pvOff').hidden = camVisible; $('pvAvatar').textContent = initials($('name').value);
  // call
  setIcon($('micBtn'), S.micOn ? 'i-mic' : 'i-mic-off'); $('micBtn').classList.toggle('off', !S.micOn);
  setIcon($('camBtn'), camVisible ? 'i-cam' : 'i-cam-off'); $('camBtn').classList.toggle('off', !camVisible);
  $('selfPlate').classList.toggle('mic-off', !S.micOn);
  $('selfAvatar').textContent = initials(S.name);
  if (!S.screenStream) $('selfPh').hidden = camVisible;
  sendState();
}
function setIcon(btn, id){ const u = btn.querySelector('use'); if (u) u.setAttribute('href', '#' + id); }
function lobbyErr(msg){ $('lobbyErr').textContent = msg || ''; $('lobbyErr').hidden = !msg; }

/* ===== Translation ===== */
const tcache = new Map();
async function translate(text, from, to){
  const key = from + '|' + to + '|' + text;
  if (tcache.has(key)) return tcache.get(key);
  let out = null;
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
    if (r.ok){ const j = await r.json(); out = (j[0] || []).map(x => x[0]).join(''); }
  } catch(e){}
  if (!out){
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to === 'pt' ? 'pt-BR' : to}`);
      const j = await r.json(); out = j.responseData && j.responseData.translatedText;
    } catch(e){}
  }
  out = out || text;
  if (tcache.size > 400) tcache.clear();
  tcache.set(key, out);
  return out;
}

/* ===== Captions ===== */
const capEls = {};
function renderCap(slot, { lang, who, main, orig, live, mine }){
  let el = capEls[slot];
  if (!el){
    el = document.createElement('div');
    el.innerHTML = '<span class="bar"></span><span class="who"></span><span class="main"></span><span class="orig"></span>';
    if (mine) $('captions').appendChild(el); else $('captions').prepend(el);
    capEls[slot] = el;
  }
  el.className = `cap ${lang}${live ? ' live' : ''}${mine ? ' mine' : ''}`;
  el.querySelector('.who').textContent = who;
  el.querySelector('.main').textContent = main;
  const o = el.querySelector('.orig'); o.textContent = orig || ''; o.hidden = !orig || !S.showOrig;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.remove(); delete capEls[slot]; }, live ? 7000 : 8000 + Math.min(6000, main.length * 60));
}
function addLine(entry){
  S.lines.push(entry);
  $('logEmpty').hidden = true;
  const mineFirst = entry.lang === S.me ? entry.orig : entry.tr;
  const second = entry.lang === S.me ? entry.tr : entry.orig;
  const d = document.createElement('div');
  d.className = 'entry ' + entry.lang;
  d.innerHTML = `<span class="bar"></span><div><div class="meta"><time>${esc(entry.time)}</time><span>${esc(entry.who)}</span></div><div class="t1">${esc(mineFirst)}</div><div class="t2">${esc(second)}</div></div>`;
  const body = $('logBody'); const atEnd = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
  body.appendChild(d); if (atEnd) body.scrollTop = body.scrollHeight;
}
const nowStr = () => new Date().toLocaleTimeString(S.me === 'tr' ? 'tr-TR' : 'pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

/* ===== Speech synthesis ===== */
let voicesCache = [];
const loadVoices = () => { if ('speechSynthesis' in window) voicesCache = speechSynthesis.getVoices(); };
if ('speechSynthesis' in window){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(text){
  if (!S.voiceOn || !('speechSynthesis' in window) || !text) return;
  const lang = LANGS[S.me].tts;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = 1.04;
  const vs = voicesCache.filter(v => (v.lang || '').replace('_','-').toLowerCase().startsWith(lang.toLowerCase()));
  const v = vs.find(v => /google|natural|online/i.test(v.name)) || vs[0];
  if (v) u.voice = v;
  u.onstart = () => pauseRecognition(true);
  u.onend = u.onerror = () => { if (!speechSynthesis.speaking) pauseRecognition(false); };
  speechSynthesis.speak(u);
}

/* ===== Speech recognition (own voice) ===== */
const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
let interimTimer = 0, lastInterimSent = '', segId = 0;
function setSR(text, live){ $('srChip').hidden = !text; $('srText').textContent = text || ''; $('srChip').classList.toggle('rec', !!live); }
function startRecognition(){
  if (!SRClass){ setSR(t('noSR'), false); return; }
  if (S.rec) return;
  const rec = new SRClass();
  rec.lang = LANGS[S.me].sr; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  rec.onstart = () => setSR(t('listening') + ' · ' + LANGS[S.me].label, true);
  rec.onresult = ev => {
    for (let i = ev.resultIndex; i < ev.results.length; i++){
      const res = ev.results[i], text = res[0].transcript.trim();
      if (!text) continue;
      if (res.isFinal) finalizeSegment(text);
      else interimSegment(text);
    }
  };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){ S.recWanted = false; setSR(t('media'), false); }
    else if (e.error === 'network'){ setSR(t('srNet'), false); }
  };
  rec.onend = () => {
    S.rec = null;
    if (S.recWanted && !S.recPaused && S.micOn) setTimeout(startRecognition, 200);
    else if (!S.recPaused) setSR('', false);
  };
  S.rec = rec;
  try { rec.start(); } catch(e){ S.rec = null; }
}
function stopRecognition(){ const r = S.rec; S.rec = null; if (r){ r.onend = null; try { r.abort(); } catch(e){} } }
function pauseRecognition(p){
  if (S.recPaused === p) return;
  S.recPaused = p;
  if (p){ stopRecognition(); setSR(t('paused'), false); }
  else if (S.recWanted && S.micOn) startRecognition();
}
function interimSegment(text){
  const id = segId;
  renderCap('me', { lang:S.me, who:t('you'), main:text, live:true, mine:true });
  clearTimeout(interimTimer);
  interimTimer = setTimeout(async () => {
    if (text === lastInterimSent || id !== segId) return;
    lastInterimSent = text;
    const tr = await translate(text, S.me, other(S.me));
    if (id !== segId) return;
    send({ type:'interim', id, text, tr, lang:S.me });
  }, 450);
}
async function finalizeSegment(text){
  const id = segId++; clearTimeout(interimTimer); lastInterimSent = '';
  const tr = await translate(text, S.me, other(S.me));
  renderCap('me', { lang:S.me, who:t('you'), main:text, orig:tr, mine:true });
  addLine({ time:nowStr(), who:S.name || t('you'), lang:S.me, orig:text, tr });
  send({ type:'final', id, text, tr, lang:S.me });
}

/* ===== Peer messaging ===== */
function send(msg){ if (S.conn && S.conn.open){ try { S.conn.send(msg); } catch(e){} } }
function sendState(){ send({ type:'state', mic:S.micOn, cam:S.camOn && !!(S.stream && S.stream.getVideoTracks().length), screen:!!S.screenStream }); }
function onData(m){
  if (!m || typeof m !== 'object') return;
  const who = S.peerName || t('speakerDefault');
  const lang = m.lang || S.peerLang || other(S.me);
  switch (m.type){
    case 'hello':
      S.peerName = String(m.name || '').slice(0, 40) || t('speakerDefault'); S.peerLang = m.lang;
      $('remoteName').textContent = S.peerName; $('remotePhName').textContent = S.peerName;
      $('remoteAvatar').textContent = initials(S.peerName); $('remoteAvatar').className = 'avatar ' + (m.lang || '');
      $('remoteSw').style.background = LANGS[m.lang] ? LANGS[m.lang].sw : 'var(--muted)';
      toast(t('joined', { n:S.peerName }));
      break;
    case 'state':
      $('remotePlate').classList.toggle('mic-off', !m.mic);
      $('remotePh').hidden = !!m.cam || !!m.screen;
      $('tileRemote').classList.toggle('mirror', false);
      if (m.screen && !S._peerSharing) toast(t('themShare', { n:who }));
      S._peerSharing = !!m.screen;
      break;
    case 'interim':
      renderCap('them', { lang, who, main:m.tr || '…', orig:m.text, live:true });
      break;
    case 'final':
      renderCap('them', { lang, who, main:m.tr, orig:m.text });
      addLine({ time:nowStr(), who, lang, orig:m.text, tr:m.tr });
      speak(m.tr);
      break;
    case 'chat':
      addMsg({ me:false, who, text:m.tr, orig:m.text });
      break;
    case 'bye':
      onPeerLeft();
      break;
  }
}

/* ===== Chat ===== */
function addMsg({ me, who, text, orig }){
  S.msgs++;
  $('chatEmpty').hidden = true;
  const d = document.createElement('div');
  d.className = 'msg' + (me ? ' me' : '');
  d.innerHTML = `<span class="meta">${esc(who)} · ${esc(nowStr().slice(0,5))}</span><span class="t1">${esc(text)}</span>${orig && orig !== text ? `<span class="t2">${esc(orig)}</span>` : ''}`;
  $('chatBody').appendChild(d); $('chatBody').scrollTop = $('chatBody').scrollHeight;
  if (!me && !(S.panelOpen && S.panelTab === 'chat')){ S.unread++; updateBadge(); }
}
function updateBadge(){ ['chatBadge','chatBadge2'].forEach(id => { $(id).hidden = !S.unread; $(id).textContent = S.unread; }); }
$('chatFoot').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('chatInput').value.trim(); if (!text) return;
  $('chatInput').value = '';
  const tr = await translate(text, S.me, other(S.me));
  addMsg({ me:true, who:t('you'), text, orig:tr });
  send({ type:'chat', text, tr, lang:S.me });
});

/* ===== Connection ===== */
function setConn(kind, text){ $('connDot').className = 'dot ' + (kind || ''); $('connText').textContent = text; }
function inviteLink(){
  const u = new URL(location.href); u.search = ''; u.hash = '';
  u.searchParams.set('oda', S.room); u.searchParams.set('dil', other(S.me));
  return u.toString();
}
function wireConn(c){
  if (S.conn && S.conn !== c){ try { S.conn.close(); } catch(e){} }
  S.conn = c;
  c.on('open', () => { c.send({ type:'hello', name:S.name || t('speakerDefault'), lang:S.me }); sendState(); });
  c.on('data', onData);
  c.on('close', () => { if (S.conn === c) onPeerLeft(); });
  c.on('error', () => {});
}
function wireCall(c){
  if (S.call && S.call !== c){ try { S.call.close(); } catch(e){} }
  S.call = c;
  c.on('stream', rs => {
    $('vRemote').srcObject = rs;
    $('waiting').hidden = true;
    setConn('ok', t('connected'));
    startTimer();
    $('vRemote').play().catch(() => {});
  });
  c.on('close', () => { if (S.call === c) onPeerLeft(); });
  c.on('error', () => {});
  // watch ICE health
  const pcWatch = setInterval(() => {
    const pc = c.peerConnection; if (!pc){ return; }
    const st = pc.iceConnectionState;
    if (st === 'disconnected') setConn('warn', t('reconnecting'));
    else if (st === 'failed'){ setConn('bad', t('left')); clearInterval(pcWatch); }
    else if (st === 'connected' || st === 'completed'){ if ($('connText').textContent !== t('connected')) setConn('ok', t('connected')); }
    if (S.call !== c) clearInterval(pcWatch);
  }, 1500);
}
function onPeerLeft(){
  if ($('waiting').hidden === false) return;
  toast(t('leftT', { n:S.peerName || t('speakerDefault') }));
  setConn('warn', t('left'));
  $('vRemote').srcObject = null;
  $('waitTitle').textContent = t('left');
  $('waiting').hidden = false;
  S.conn = null; S.call = null;
  if (S.role === 'guest'){ setTimeout(() => S.peer && !S.peer.destroyed && connectToHost(), 3000); }
}
function connectToHost(){
  setConn('warn', t('connecting'));
  wireConn(S.peer.connect(CONFIG.peerPrefix + S.room, { reliable:true }));
  wireCall(S.peer.call(CONFIG.peerPrefix + S.room, outgoingStream()));
}
function outgoingStream(){
  if (!S.screenStream) return S.stream;
  return new MediaStream([...S.stream.getAudioTracks(), ...S.screenStream.getVideoTracks()]);
}
function replaceOutgoing(track){
  const pc = S.call && S.call.peerConnection; if (!pc) return;
  const sender = pc.getSenders().find(s => s.track && s.track.kind === track.kind) || pc.getSenders().find(s => !s.track);
  if (sender) sender.replaceTrack(track).catch(() => {});
}
function cleanRoom(v){ return (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
function newRoomCode(){ const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(6)); r.forEach(x => s += a[x % a.length]); return s; }

async function begin(role){
  // Planlı görüşme linki (otomatik=1): önce odayı açmayı dene, oda zaten açıksa katıl. Kim önce gelirse oda sahibi olur.
  if (S.auto && role === 'guest' && !S._autoTried){ S._autoTried = true; role = 'host'; }
  lobbyErr('');
  S.name = $('name').value.trim(); store.set('name', S.name);
  let code = cleanRoom($('room').value);
  if (role === 'guest' && !code){ lobbyErr(t('needRoom')); $('room').focus(); return; }
  if (role === 'host' && !code) code = newRoomCode();
  S.room = code; S.role = role; $('room').value = code;
  if (!S.stream && !(await startPreview())) return;
  const btn = role === 'host' ? $('createBtn') : $('joinBtn'); btn.disabled = true;

  const peer = role === 'host' ? new Peer(CONFIG.peerPrefix + code, { config:{ iceServers:CONFIG.iceServers } })
                               : new Peer({ config:{ iceServers:CONFIG.iceServers } });
  S.peer = peer;
  peer.on('open', () => {
    btn.disabled = false;
    enterCall();
    if (role === 'guest') connectToHost();
  });
  peer.on('connection', c => wireConn(c));
  peer.on('call', c => { c.answer(outgoingStream()); wireCall(c); });
  peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch(e){} }, 1500); });
  peer.on('error', e => {
    btn.disabled = false;
    if (e.type === 'unavailable-id'){ peer.destroy(); if (S.auto){ S.peer = null; begin('guest'); return; } lobbyErr(t('taken')); show('lobby'); }
    else if (e.type === 'peer-unavailable'){
      if ($('call').hidden){ return; }
      if (S.role === 'guest' && !S._everConnected){ teardownPeer(); show('lobby'); lobbyErr(t('notFound')); }
      else if (S.role === 'guest'){ setTimeout(() => S.peer && !S.peer.destroyed && !S.call && connectToHost(), 4000); }
    }
    else if (['network','server-error','socket-error','socket-closed'].includes(e.type)){ if ($('call').hidden) lobbyErr(t('signal')); else setConn('bad', t('reconnecting')); }
  });
}
function enterCall(){
  show('call');
  history.replaceState(null, '', location.pathname + '?oda=' + encodeURIComponent(S.room) + '&dil=' + S.me);
  $('roomChip').textContent = S.room;
  $('linkText').textContent = inviteLink();
  $('mySw').style.background = LANGS[S.me].sw; $('mySw2').style.background = LANGS[S.me].sw;
  $('pairText').textContent = t('pair'); $('meLabel').textContent = t('meSpeaks');
  $('vSelf').srcObject = S.stream;
  $('waitTitle').textContent = t('waitTitle');
  $('waitText').hidden = S.role === 'guest'; $('waitText').closest('.wait-card').querySelector('.linkbox').hidden = S.role === 'guest';
  setConn(S.role === 'guest' ? 'warn' : '', S.role === 'guest' ? t('connecting') : t('waiting'));
  applyTrackStates();
  S.recWanted = true; startRecognition();
}
function teardownPeer(){
  stopRecognition(); S.recWanted = false;
  try { S.call && S.call.close(); } catch(e){}
  try { S.conn && S.conn.close(); } catch(e){}
  try { S.peer && S.peer.destroy(); } catch(e){}
  S.call = S.conn = S.peer = null;
}

/* ===== Timer ===== */
function fmt(ms){ const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' : '') + String(m).padStart(2,'0') + ':' + String(ss).padStart(2,'0'); }
function startTimer(){ S._everConnected = true; if (S.startedAt) return; S.startedAt = Date.now(); S.timerId = setInterval(() => $('timer').textContent = fmt(Date.now() - S.startedAt), 1000); }

/* ===== Screen share ===== */
async function toggleScreen(){
  if (S.screenStream){ stopScreen(); return; }
  try {
    S.screenStream = await navigator.mediaDevices.getDisplayMedia({ video:{ frameRate:15 }, audio:false });
    const vt = S.screenStream.getVideoTracks()[0];
    vt.onended = stopScreen;
    replaceOutgoing(vt);
    $('vSelf').srcObject = S.screenStream; $('tileSelf').classList.remove('mirror'); $('selfPh').hidden = true;
    $('screenBtn').classList.add('active');
    toast(t('shareOn'));
    sendState();
  } catch(e){ if (e.name !== 'NotAllowedError') toast(t('shareFail'), true); S.screenStream = null; }
}
function stopScreen(){
  if (!S.screenStream) return;
  S.screenStream.getTracks().forEach(tr => tr.stop()); S.screenStream = null;
  const cam = S.stream.getVideoTracks()[0]; if (cam) replaceOutgoing(cam);
  $('vSelf').srcObject = S.stream; $('tileSelf').classList.add('mirror');
  $('screenBtn').classList.remove('active');
  applyTrackStates();
}

/* ===== Panel ===== */
function openPanel(tab){
  S.panelOpen = true; $('panel').hidden = false; selectTab(tab || S.panelTab);
  $('panelBtn').classList.add('active');
}
function closePanel(){ S.panelOpen = false; $('panel').hidden = true; $('panelBtn').classList.remove('active'); }
function selectTab(tab){
  S.panelTab = tab;
  $('tabLog').setAttribute('aria-selected', tab === 'log'); $('tabChat').setAttribute('aria-selected', tab === 'chat');
  $('logBody').hidden = $('logFoot').hidden = tab !== 'log';
  $('chatBody').hidden = $('chatFoot').hidden = tab !== 'chat';
  if (tab === 'chat'){ S.unread = 0; updateBadge(); setTimeout(() => $('chatInput').focus(), 50); }
}

/* ===== Transcript ===== */
function downloadTranscript(){
  const head = `${CONFIG.brand}\n${t('roomShort')}: ${S.room}\n${new Date().toLocaleString(S.me === 'tr' ? 'tr-TR' : 'pt-BR')}\n${S.startedAt ? t('stDur') + ': ' + fmt(Date.now() - S.startedAt) + '\n' : ''}\n`;
  const body = S.lines.map(l => `[${l.time}] ${l.who} (${l.lang.toUpperCase()})\n  ${l.orig}\n  → ${l.tr}`).join('\n\n');
  const blob = new Blob([head + body + '\n'], { type:'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `gorusme-${S.room}-${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ===== End ===== */
function endCall(){
  send({ type:'bye' });
  const dur = S.startedAt ? Date.now() - S.startedAt : 0;
  clearInterval(S.timerId);
  stopScreen(); teardownPeer();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  cancelAnimationFrame(S.meterRaf);
  if (S.stream){ S.stream.getTracks().forEach(tr => tr.stop()); S.stream = null; }
  $('endRoom').textContent = t('roomShort') + ' ' + S.room;
  $('stDur').textContent = fmt(dur); $('stLines').textContent = S.lines.length; $('stMsgs').textContent = S.msgs;
  $('endDl').hidden = !S.lines.length;
  show('ended');
}

/* ===== Copy ===== */
async function copyInvite(){
  const link = inviteLink();
  try { await navigator.clipboard.writeText(link); toast(t('copied')); }
  catch(e){ const r = document.createRange(); r.selectNodeContents($('linkText')); getSelection().removeAllRanges(); getSelection().addRange(r); }
}

/* ===== Wiring ===== */
document.querySelectorAll('.lang').forEach(b => b.addEventListener('click', () => { S.me = b.dataset.lang; store.set('lang', S.me); applyLang(); }));
$('pvMic').onclick = () => { S.micOn = !S.micOn; applyTrackStates(); };
$('pvCam').onclick = () => { S.camOn = !S.camOn; applyTrackStates(); };
$('selMic').onchange = e => switchDevice('audio', e.target.value);
$('selCam').onchange = e => switchDevice('video', e.target.value);
$('name').addEventListener('input', () => $('pvAvatar').textContent = initials($('name').value));
$('room').addEventListener('input', e => { const p = e.target.selectionStart; e.target.value = cleanRoom(e.target.value); e.target.setSelectionRange(p, p); });
let formRole = 'host';
$('joinForm').addEventListener('submit', e => { e.preventDefault(); begin(formRole); });
$('joinBtn').onclick = e => { if (formRole !== 'guest') begin('guest'); };
$('createBtn').addEventListener('click', e => { if (formRole !== 'host'){ e.preventDefault(); begin('host'); } });

$('micBtn').onclick = () => {
  S.micOn = !S.micOn; applyTrackStates();
  if (S.micOn){ S.recWanted = true; if (!S.recPaused) startRecognition(); } else { S.recWanted = false; stopRecognition(); setSR('', false); }
};
$('camBtn').onclick = () => { S.camOn = !S.camOn; applyTrackStates(); };
$('voiceBtn').onclick = () => {
  S.voiceOn = !S.voiceOn;
  $('voiceBtn').classList.toggle('active', S.voiceOn);
  $('vRemote').volume = S.voiceOn ? 0.2 : 1;
  if (!S.voiceOn && 'speechSynthesis' in window){ speechSynthesis.cancel(); pauseRecognition(false); }
  if (S.voiceOn && 'speechSynthesis' in window){ const u = new SpeechSynthesisUtterance(''); speechSynthesis.speak(u); } // unlock audio on iOS/Chrome
  toast(S.voiceOn ? t('voiceOn') : t('voiceOff'));
  store.set('voice', S.voiceOn ? '1' : '0');
};
$('screenBtn').onclick = toggleScreen;
if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) $('screenBtn').hidden = true;
$('panelBtn').onclick = () => S.panelOpen ? closePanel() : openPanel(S.unread ? 'chat' : S.panelTab);
$('tabLog').onclick = () => selectTab('log');
$('tabChat').onclick = () => selectTab('chat');
$('closePanel').onclick = closePanel;
$('dlBtn').onclick = downloadTranscript;
$('endDl').onclick = downloadTranscript;
$('endBtn').onclick = endCall;
$('rejoin').onclick = () => { location.href = location.pathname; };
$('copyLink2').onclick = copyInvite;
$('copyLinkBtn').onclick = () => { copyInvite(); toggleMenu(false); };
$('fullBtn').onclick = () => { toggleMenu(false); if (document.fullscreenElement) document.exitFullscreen().catch(()=>{}); else document.documentElement.requestFullscreen().catch(()=>{}); };
$('tileSelf').onclick = swapTiles;
$('tileSelf').onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); swapTiles(); } };
function swapTiles(){
  const a = $('vRemote').srcObject, b = $('vSelf').srcObject;
  // swap which stream appears large by swapping element roles
  const big = $('tileRemote'), small = $('tileSelf');
  const bigIsRemote = !big.dataset.swapped;
  big.dataset.swapped = bigIsRemote ? '1' : '';
  $('vRemote').srcObject = b; $('vSelf').srcObject = a;
  $('vRemote').muted = bigIsRemote; $('vSelf').muted = !bigIsRemote;
  big.classList.toggle('mirror', bigIsRemote && !S.screenStream); small.classList.toggle('mirror', !bigIsRemote && !S.screenStream);
  [['remotePlate','selfPlate'],['remotePh','selfPh']].forEach(([x,y]) => { const tx = $(x).hidden; $(x).hidden = $(y).hidden; $(y).hidden = tx; });
}
function toggleMenu(open){ const m = $('menu'); const o = open ?? m.hidden; m.hidden = !o; $('moreBtn').setAttribute('aria-expanded', o); }
$('moreBtn').onclick = e => { e.stopPropagation(); toggleMenu(); };
document.addEventListener('click', e => { if (!$('menu').hidden && !e.target.closest('.menu')) toggleMenu(false); });
$('capSeg').querySelectorAll('button').forEach(b => b.onclick = () => setCapSize(+b.dataset.s));
function setCapSize(px){ S.capSize = px; document.documentElement.style.setProperty('--cap-size', px + 'px'); $('capSeg').querySelectorAll('button').forEach(b => { b.setAttribute('aria-pressed', +b.dataset.s === px); b.style.fontSize = (11 + (+b.dataset.s - 18) / 2) + 'px'; }); store.set('cap', px); }
$('ownCapsBtn').onclick = () => { S.showOwn = !S.showOwn; $('ownCapsBtn').setAttribute('aria-checked', S.showOwn); $('captions').classList.toggle('hide-own', !S.showOwn); store.set('own', S.showOwn ? '1':'0'); };
$('origBtn').onclick = () => { S.showOrig = !S.showOrig; $('origBtn').setAttribute('aria-checked', S.showOrig); document.querySelectorAll('.cap .orig').forEach(o => o.hidden = !S.showOrig || !o.textContent); store.set('orig', S.showOrig ? '1':'0'); };
document.addEventListener('keydown', e => {
  if ($('call').hidden || e.target.closest('input,textarea,select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'm') $('micBtn').click(); else if (k === 'v') $('camBtn').click(); else if (k === 't') $('voiceBtn').click(); else if (k === 'c') $('panelBtn').click();
  else if (k === 'escape'){ toggleMenu(false); }
});
window.addEventListener('beforeunload', () => send({ type:'bye' }));

/* ===== Init ===== */
(function init(){
  const qs = new URLSearchParams(location.search);
  if (qs.get('otomatik') === '1') S.auto = true;
  const sl = store.get('lang'); if (sl && LANGS[sl]) S.me = sl;
  if (qs.get('dil') && LANGS[qs.get('dil')]) S.me = qs.get('dil');
  if (store.get('name')) $('name').value = store.get('name');
  if (qs.get('oda')) $('room').value = cleanRoom(qs.get('oda'));
  if (store.get('own') === '0'){ S.showOwn = false; $('ownCapsBtn').setAttribute('aria-checked', 'false'); $('captions').classList.add('hide-own'); }
  if (store.get('orig') === '0'){ S.showOrig = false; $('origBtn').setAttribute('aria-checked', 'false'); }
  setCapSize(+(store.get('cap') || (innerWidth < 640 ? 18 : 22)));
  applyLang();
  // An invite link puts the "join" action first
  if (qs.get('oda')){ formRole = 'guest'; $('joinBtn').className = 'btn btn-primary'; $('createBtn').className = 'btn btn-ghost'; $('joinBtn').type = 'submit'; $('createBtn').type = 'button';
    $('joinBtn').parentNode.prepend($('joinBtn')); }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ lobbyErr(t('media')); return; }
  startPreview();
})();

/* ===== Brazil Migration: modül durumu ve panel ön doldurma ===== */
(async function bmBridge(){
  try {
    const r = await fetch('/api/auth/meeting', {cache:'no-store'}); const d = await r.json();
    if (d && d.enabled === false){
      const o = document.createElement('div'); o.className = 'bm-off';
      o.innerHTML = '<div><img src="/brazil-migration-logo.png" alt="Brazil Migration"><h2>' + (S.me === 'pt' ? 'Chamadas indisponíveis no momento' : 'Görüşme şu an kullanılamıyor') + '</h2><p>' + (S.me === 'pt' ? 'Entre em contato com a equipe Brazil Migration.' : 'Lütfen Brazil Migration ekibiyle iletişime geçin.') + ' <a href="/iletisim/">' + (S.me === 'pt' ? 'Contato' : 'İletişim') + '</a></p></div>';
      document.body.appendChild(o); try { S.stream && S.stream.getTracks().forEach(x => x.stop()); } catch(e){}
      return;
    }
  } catch(e){}
  const qs = new URLSearchParams(location.search);
  if (qs.get('oda')) return;
  try {
    const r = await fetch('/api/workspace/meeting', {credentials:'same-origin', cache:'no-store'}); if (!r.ok) return;
    const d = await r.json();
    if (d.name && !$('name').value) $('name').value = d.name;
    if (d.room){
      $('room').value = cleanRoom(d.room); S.auto = true; formRole = 'guest';
      $('joinBtn').className = 'btn btn-primary'; $('createBtn').className = 'btn btn-ghost'; $('joinBtn').type = 'submit'; $('createBtn').type = 'button'; $('joinBtn').parentNode.prepend($('joinBtn'));
      if (d.lang && LANGS[d.lang] && !qs.get('dil') && !store.get('lang')){ S.me = d.lang; applyLang(); }
    }
  } catch(e){}
})();

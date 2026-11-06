/* ===== Configuration: change these to rebrand (e.g. for another site) ===== */
const CONFIG = {
  brand: 'Brazil Migration Görüşme',
  peerPrefix: 'brazilmigration-gorusme-',  // keep stable so old invite links keep working
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // PeerJS'in kendi varsayılan TURN sunucuları: doğrudan bağlantı kurulamayan mobil/kurumsal ağlarda röle
    { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }
    // Add a TURN server here for strict corporate/mobile networks, e.g.:
    // { urls: 'turn:YOUR_HOST:3478', username: 'USER', credential: 'PASS' }
  ]
};

const LANGS = {
  tr: { code:'tr', sr:'tr-TR', tts:'tr-TR', short:'TR', label:'Türkçe', sw:'url(/bm/flags/tr.svg) center/cover' },
  pt: { code:'pt', sr:'pt-BR', tts:'pt-BR', short:'PT', label:'Português', sw:'url(/bm/flags/br.svg) center/cover' },
  en: { code:'en', sr:'en-US', tts:'en-US', short:'EN', label:'English', sw:'url(/bm/flags/gb.svg) center/cover' },
  fa: { code:'fa', sr:'fa-IR', tts:'fa-IR', short:'FA', label:'فارسی', sw:'url(/bm/flags/ir.svg) center/cover' }
};

const LOC = { tr:'tr-TR', pt:'pt-BR', en:'en-GB', fa:'fa-IR' };
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
    waitTitle:'Karşı taraf bekleniyor', waitText:'Bu linki gönderin. Karşı taraf kendi dilini seçer (Português, English, فارسی…).',
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
    meSpeaks:'Siz: Türkçe', pair:'TR → PT', retry:'Tekrar dene', trFail:'çeviri bekleniyor'
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
    waitTitle:'Aguardando a outra pessoa', waitText:'Envie este link. A outra pessoa escolhe o próprio idioma.',
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
    meSpeaks:'Você: Português', pair:'PT → TR', retry:'Tentar de novo', trFail:'tradução pendente'
  },
  en: {
    tagline:"Video call with live translation",
    camOffPreview:"Camera off",
    mic:"Microphone",
    cam:"Camera",
    micDevice:"Microphone",
    camDevice:"Camera",
    headline:"Talk without a language barrier.",
    lead:"Speak in your own language; the other person gets captions and, if they like, voice in theirs.",
    yourLang:"Your language",
    name:"Your name",
    namePh:"Full name",
    room:"Room code",
    roomPh:"Leave empty to generate",
    create:"Create room",
    join:"Join room",
    fine:"Use Chrome or Edge for best results. Video and audio go directly between the two devices and are not recorded on a server.",
    f1t:"Live captions",
    f1d:"Translation appears before the sentence ends.",
    f2t:"Spoken translation",
    f2d:"Turn it on with one tap to hear the translation.",
    f3t:"Direct connection",
    f3d:"Video never touches a server; the transcript stays with you.",
    roomShort:"Room",
    camOffThem:"Camera off",
    you:"You",
    swapTip:"Swap videos",
    waitTitle:"Waiting for the other person",
    waitText:"Send this link. The other person picks their own language.",
    copy:"Copy",
    logTab:"Transcript",
    chatTab:"Chat",
    logEmpty:"The conversation collects here in both languages.",
    chatEmpty:"Your message arrives translated. Ideal for addresses, dates or case numbers.",
    download:"Download transcript",
    chatPh:"Type a message…",
    voice:"Spoken translation",
    share:"Screen",
    panelBtn:"Chat",
    more:"More",
    capSize:"Caption size",
    ownCaps:"Show my captions",
    showOrig:"Show original text",
    copyLink:"Copy invite link",
    fullscreen:"Full screen",
    end:"End",
    endTitle:"Call ended",
    stDur:"Duration",
    stLines:"Translated sentences",
    stMsgs:"Messages",
    endNote:"The transcript is kept only on this device. Download it before closing the page.",
    newCall:"New call",
    connecting:"Connecting",
    waiting:"Waiting",
    connected:"Connected",
    reconnecting:"Reconnecting",
    left:"The other person left",
    listening:"Listening",
    paused:"Reading translation aloud",
    noSR:"No speech recognition · use Chrome/Edge",
    srNet:"Speech recognition disconnected",
    copied:"Link copied",
    joined:"{n} joined the call",
    leftT:"{n} left the call",
    needRoom:"Enter the room code to join.",
    taken:"This room is already open. Tap \"Join room\" or try another code.",
    notFound:"No open room with this code. Check the code or wait for the other person to open it.",
    media:"Camera or microphone permission denied. Allow it from the lock icon in the address bar.",
    noMedia:"No camera found; continuing with audio only.",
    signal:"Could not reach the connection server. Check your internet and try again.",
    shareOn:"Your screen is being shared",
    shareFail:"Could not start screen sharing.",
    themShare:"{n} is sharing their screen",
    voiceOn:"Spoken translation on",
    voiceOff:"Spoken translation off",
    speakerDefault:"Other person",
    retry:"Try again",
    trFail:"translation pending"
  },
  fa: {
    tagline:"تماس تصویری با ترجمه همزمان",
    camOffPreview:"دوربین خاموش است",
    mic:"میکروفون",
    cam:"دوربین",
    micDevice:"میکروفون",
    camDevice:"دوربین",
    headline:"بدون مانع زبان گفتگو کنید.",
    lead:"به زبان خودتان صحبت کنید؛ طرف مقابل زیرنویس و در صورت تمایل صدا را به زبان خودش دریافت می‌کند.",
    yourLang:"زبان شما",
    name:"نام شما",
    namePh:"نام و نام خانوادگی",
    room:"کد اتاق",
    roomPh:"خالی بگذارید تا ساخته شود",
    create:"ساخت اتاق",
    join:"ورود به اتاق",
    fine:"برای بهترین نتیجه از Chrome یا Edge استفاده کنید. تصویر و صدا مستقیماً بین دو دستگاه منتقل می‌شود و روی سرور ذخیره نمی‌شود.",
    f1t:"زیرنویس زنده",
    f1d:"ترجمه پیش از پایان جمله نمایش داده می‌شود.",
    f2t:"ترجمه صوتی",
    f2d:"با یک لمس، ترجمه را بشنوید.",
    f3t:"اتصال مستقیم",
    f3d:"تصویر از سرور عبور نمی‌کند؛ متن گفتگو فقط نزد شما می‌ماند.",
    roomShort:"اتاق",
    camOffThem:"دوربین خاموش است",
    you:"شما",
    swapTip:"جابجایی تصاویر",
    waitTitle:"در انتظار طرف مقابل",
    waitText:"این لینک را بفرستید. طرف مقابل زبان خود را انتخاب می‌کند.",
    copy:"کپی",
    logTab:"متن گفتگو",
    chatTab:"گفتگو",
    logEmpty:"گفتگو در اینجا به هر دو زبان جمع می‌شود.",
    chatEmpty:"پیام شما ترجمه‌شده می‌رسد. برای آدرس، تاریخ یا شماره پرونده مناسب است.",
    download:"دانلود متن گفتگو",
    chatPh:"پیام بنویسید…",
    voice:"ترجمه صوتی",
    share:"صفحه",
    panelBtn:"گفتگو",
    more:"بیشتر",
    capSize:"اندازه زیرنویس",
    ownCaps:"نمایش زیرنویس خودم",
    showOrig:"نمایش متن اصلی",
    copyLink:"کپی لینک دعوت",
    fullscreen:"تمام صفحه",
    end:"پایان",
    endTitle:"تماس پایان یافت",
    stDur:"مدت",
    stLines:"جملات ترجمه‌شده",
    stMsgs:"پیام‌ها",
    endNote:"متن گفتگو فقط روی این دستگاه نگه داشته می‌شود. پیش از بستن صفحه آن را دانلود کنید.",
    newCall:"تماس جدید",
    connecting:"در حال اتصال",
    waiting:"در انتظار",
    connected:"متصل",
    reconnecting:"اتصال مجدد",
    left:"طرف مقابل خارج شد",
    listening:"در حال شنیدن",
    paused:"در حال خواندن ترجمه",
    noSR:"تشخیص گفتار در دسترس نیست · از Chrome/Edge استفاده کنید",
    srNet:"اتصال تشخیص گفتار قطع شد",
    copied:"لینک کپی شد",
    joined:"{n} وارد تماس شد",
    leftT:"{n} از تماس خارج شد",
    needRoom:"برای ورود، کد اتاق را وارد کنید.",
    taken:"این اتاق باز است. «ورود به اتاق» را بزنید یا کد دیگری امتحان کنید.",
    notFound:"اتاق بازی با این کد پیدا نشد. کد را بررسی کنید یا منتظر طرف مقابل بمانید.",
    media:"اجازه دوربین یا میکروفون داده نشد. از نماد قفل در نوار آدرس اجازه دهید.",
    noMedia:"دوربین پیدا نشد؛ فقط با صدا ادامه می‌دهیم.",
    signal:"به سرور اتصال دسترسی نیست. اینترنت را بررسی و دوباره تلاش کنید.",
    shareOn:"صفحه شما در حال اشتراک است",
    shareFail:"اشتراک صفحه آغاز نشد.",
    themShare:"{n} صفحه خود را به اشتراک گذاشته است",
    voiceOn:"ترجمه صوتی روشن",
    voiceOff:"ترجمه صوتی خاموش",
    speakerDefault:"طرف مقابل",
    retry:"تلاش دوباره",
    trFail:"ترجمه در انتظار"
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
const other = l => (S.peerLang && S.peerLang !== l) ? S.peerLang : (l === 'tr' ? 'pt' : 'tr');
const store = { get(k){ try { return localStorage.getItem('ij-' + k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem('ij-' + k, v); } catch(e){} } };
const initials = n => (n || '?').trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase() || '?';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function show(view){ ['lobby','call','ended'].forEach(v => $(v).hidden = v !== view); }
function toast(msg, bad){ const el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = msg; $('toasts').appendChild(el); setTimeout(() => el.remove(), 3200); }

/* ===== i18n ===== */
function applyLang(){
  document.documentElement.lang = LOC[S.me] || 'tr';
  document.documentElement.dir = S.me === 'fa' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i]').forEach(el => el.textContent = t(el.dataset.i));
  document.querySelectorAll('[data-iph]').forEach(el => el.placeholder = t(el.dataset.iph));
  document.querySelectorAll('[data-i-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.iAria)));
  document.querySelectorAll('.lang[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === S.me));
  ['brandName','tbBrand'].forEach(id => $(id).textContent = CONFIG.brand);
  document.title = CONFIG.brand;
}

/* ===== Lobby: preview, devices, meter ===== */
async function openMedia(micId, camId){
  const audio = { echoCancellation:true, noiseSuppression:true, autoGainControl:true, voiceIsolation:true, channelCount:1, ...(micId ? { deviceId:{ exact:micId } } : {}) };
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
      ? { audio:{ deviceId:{ exact:id }, echoCancellation:true, noiseSuppression:true, autoGainControl:true, voiceIsolation:true, channelCount:1 } }
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
const TR_BAD = /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR|USAGE ?LIMITS/i;
async function translateOnce(text, from, to){
  try {
    const r = await fetch('/api/auth/translate', { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body:JSON.stringify({ q:text, sl:from, tl:to }) });
    if (r.ok){ const j = await r.json(); if (j.ok && j.text && !TR_BAD.test(j.text)) return j.text; }
  } catch(e){}
  try { // sunucuya ulaşılamazsa tarayıcıdan doğrudan
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
    if (r.ok){ const j = await r.json(); const o = (j[0] || []).map(x => x && x[0]).filter(Boolean).join(''); if (o && !TR_BAD.test(o)) return o; }
  } catch(e){}
  return null;
}
// Döner: çeviri; başarısızsa null (asla uyarı metni dönmez)
async function translate(text, from, to){
  if (!text || from === to) return text;
  const key = from + '|' + to + '|' + text;
  if (tcache.has(key)) return tcache.get(key);
  let out = await translateOnce(text, from, to);
  if (!out){ await new Promise(r => setTimeout(r, 700)); out = await translateOnce(text, from, to); }
  if (!out) return null;
  if (tcache.size > 600) tcache.clear();
  tcache.set(key, out);
  return out;
}
const fallbackTr = text => text + ' · (' + t('trFail') + ')';

/* ===== Captions ===== */
const capEls = {};
function renderCap(slot, { lang, who, main, orig, live, mine }){
  let el = capEls[slot];
  if (!el){
    el = document.createElement('div');
    el.innerHTML = '<span class="bar"></span><span class="who"></span><span class="main" dir="auto"></span><span class="orig" dir="auto"></span>';
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
  d.innerHTML = `<span class="bar"></span><div><div class="meta"><time>${esc(entry.time)}</time><span>${esc(entry.who)}</span></div><div class="t1" dir="auto">${esc(mineFirst)}</div><div class="t2" dir="auto">${esc(second)}</div></div>`;
  const body = $('logBody'); const atEnd = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
  body.appendChild(d); if (atEnd) body.scrollTop = body.scrollHeight;
}
const nowStr = () => new Date().toLocaleTimeString(LOC[S.me], { hour:'2-digit', minute:'2-digit', second:'2-digit' });

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
      const res = ev.results[i], text = res[0].transcript.trim(), conf = res[0].confidence;
      if (!text) continue;
      if (!VAD.accept(text, conf, res.isFinal)){ if (res.isFinal){ clearTimeout(interimTimer); removeCap('me'); segId++; } continue; }
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
  const tr0 = S.stream && S.stream.getAudioTracks()[0];
  try { if (tr0 && VAD.trackOK !== false) rec.start(tr0); else rec.start(); }
  catch(e){ VAD.trackOK = false; try { rec.start(); } catch(e2){ S.rec = null; } }
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
    if (Math.abs(text.length - lastInterimSent.length) < 4 && lastInterimSent) return;
    lastInterimSent = text;
    send({ type:'interim', id, text, lang:S.me });
  }, 650);
}
async function finalizeSegment(text){
  const id = segId++; clearTimeout(interimTimer); lastInterimSent = '';
  const to = other(S.me);
  send({ type:'final', id, text, lang:S.me });
  renderCap('me', { lang:S.me, who:t('you'), main:text, mine:true });
  const tr = await translate(text, S.me, to);
  renderCap('me', { lang:S.me, who:t('you'), main:text, orig:tr || '', mine:true });
  addLine({ time:nowStr(), who:S.name || t('you'), lang:S.me, orig:text, tr:tr || text });
}

/* ===== Peer messaging ===== */
function send(msg){ if (S.conn && S.conn.open){ try { S.conn.send(msg); } catch(e){} } }
function sendState(){ send({ type:'state', mic:S.micOn, cam:S.camOn && !!(S.stream && S.stream.getVideoTracks().length), screen:!!S.screenStream }); }
async function onData(m){
  if (!m || typeof m !== 'object') return;
  const who = S.peerName || t('speakerDefault');
  const lang = m.lang || S.peerLang || other(S.me);
  switch (m.type){
    case 'hello':
      S.peerName = String(m.name || '').slice(0, 40) || t('speakerDefault'); S.peerLang = LANGS[m.lang] ? m.lang : null; S.lastFinal = -1;
      $('pairText').textContent = LANGS[S.me].short + ' ⇄ ' + (S.peerLang ? LANGS[S.peerLang].short : '…');
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
    case 'interim': {
      if (typeof m.id === 'number' && m.id <= (S.lastFinal ?? -1)) break;
      renderCap('them', { lang, who, main:'…', orig:m.text, live:true });
      translate(m.text, lang, S.me).then(tr => { if (typeof m.id === 'number' && m.id <= (S.lastFinal ?? -1)) return; if (tr) renderCap('them', { lang, who, main:tr, orig:m.text, live:true }); });
      break; }
    case 'final': {
      if (typeof m.id === 'number') S.lastFinal = Math.max(S.lastFinal ?? -1, m.id);
      const tr = await translate(m.text, lang, S.me);
      const main = tr || fallbackTr(m.text);
      renderCap('them', { lang, who, main, orig:m.text });
      addLine({ time:nowStr(), who, lang, orig:m.text, tr:tr || m.text });
      if (tr) speak(tr);
      break; }
    case 'chat': {
      const tr = await translate(m.text, lang, S.me);
      addMsg({ me:false, who, text:tr || fallbackTr(m.text), orig:m.text });
      break; }
    case 'net':
      if (window.bmNetPeer) window.bmNetPeer(m);
      break;
    case 'lang':
      if (LANGS[m.lang]){ S.peerLang = m.lang; $('pairText').textContent = LANGS[S.me].short + ' ⇄ ' + LANGS[m.lang].short; }
      break;
    case 'lowdata':
      if (window.bmLowPeer) window.bmLowPeer(!!m.on);
      break;
    case 'bye':
      onPeerLeft();
      break;
  }
}

/* ===== Chat ===== */
function addMsg({ me, who, text, orig }){
  S.msgs++;
  (S.msgList = S.msgList || []).push({ time:nowStr(), who, text: me ? text : (orig || text), tr: me ? (orig || '') : text });
  $('chatEmpty').hidden = true;
  const d = document.createElement('div');
  d.className = 'msg' + (me ? ' me' : '');
  d.innerHTML = `<span class="meta">${esc(who)} · ${esc(nowStr().slice(0,5))}</span><span class="t1" dir="auto">${esc(text)}</span>${orig && orig !== text ? `<span class="t2" dir="auto">${esc(orig)}</span>` : ''}`;
  $('chatBody').appendChild(d); $('chatBody').scrollTop = $('chatBody').scrollHeight;
  if (!me && !(S.panelOpen && S.panelTab === 'chat')){ S.unread++; updateBadge(); }
}
function updateBadge(){ ['chatBadge','chatBadge2'].forEach(id => { $(id).hidden = !S.unread; $(id).textContent = S.unread; }); }
$('chatFoot').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('chatInput').value.trim(); if (!text) return;
  $('chatInput').value = '';
  send({ type:'chat', text, lang:S.me });
  const tr = await translate(text, S.me, other(S.me));
  addMsg({ me:true, who:t('you'), text, orig:tr || '' });
});

/* ===== Connection ===== */
function setConn(kind, text){ $('connDot').className = 'dot ' + (kind || ''); $('connText').textContent = text; }
function inviteLink(){
  const u = new URL(location.href); u.search = ''; u.hash = '';
  u.searchParams.set('oda', S.room);
  return u.toString();
}
function wireConn(c){
  const oldC = S.conn; S.conn = c;
  if (oldC && oldC !== c){ try { oldC.close(); } catch(e){} }
  c.on('open', () => { c.send({ type:'hello', name:S.name || t('speakerDefault'), lang:S.me }); sendState(); });
  c.on('data', onData);
  c.on('close', () => { if (S.conn === c) graceLeft(); });
  c.on('error', () => {});
}
function wireCall(c){
  const oldCall = S.call; S.call = c;
  if (oldCall && oldCall !== c){ try { oldCall.close(); } catch(e){} }
  c.on('stream', rs => {
    clearTimeout(S.leftT); S.leftT = 0; clearTimeout(S.retryT); S.retryN = 0;
    $('vRemote').srcObject = rs;
    $('waiting').hidden = true;
    setConn('ok', t('connected'));
    startTimer();
    $('vRemote').play().catch(() => {});
  });
  c.on('close', () => { if (S.call === c) graceLeft(); });
  c.on('error', () => {});
  // watch ICE health
  const pcWatch = setInterval(() => {
    const pc = c.peerConnection; if (!pc){ return; }
    const st = pc.iceConnectionState;
    if (st === 'disconnected'){
      setConn('warn', t('reconnecting'));
      c._discAt = c._discAt || Date.now();
      // 7 sn içinde toparlanmazsa misafir aramayı yeniler (zayıf/değişen ağ)
      if (S.role === 'guest' && Date.now() - c._discAt > 7000 && S.call === c && !c._renewed){ c._renewed = true; S.call = null; try { c.close(); } catch(e){} connectToHost(); }
    }
    else if (st === 'failed'){
      setConn('bad', t('reconnecting')); clearInterval(pcWatch);
      // ağ değişti / koptu: misafir taraf aramayı otomatik yeniler
      if (S.role === 'guest' && S.call === c) setTimeout(() => { if (S.peer && !S.peer.destroyed && S.call === c){ S.call = null; connectToHost(); } }, 1000);
    }
    else if (st === 'connected' || st === 'completed'){ c._discAt = 0; if ($('connText').textContent !== t('connected')) setConn('ok', t('connected')); }
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
  if (S.role === 'guest') retryHost();
}
function graceLeft(){
  setConn('warn', t('reconnecting'));
  if (S.role === 'guest' && !S.retryT) retryHost();
  clearTimeout(S.leftT);
  S.leftT = setTimeout(() => { S.leftT = 0; if (!S.call || !S.call.open) onPeerLeft(); }, 15000);
}
function retryHost(){
  clearTimeout(S.retryT);
  const n = S.retryN = (S.retryN || 0) + 1, wait = Math.min(15000, 1500 * Math.pow(1.6, n - 1));
  S.retryT = setTimeout(() => {
    S.retryT = 0;
    if (!S.peer || S.peer.destroyed || $('call').hidden) return;
    if (S.call && S.call.open) { S.retryN = 0; return; }
    if (S.peer.disconnected){ try { S.peer.reconnect(); } catch(e){} }
    connectToHost(); retryHost();
  }, wait);
}
function connectToHost(){
  setConn('warn', t('connecting'));
  wireConn(S.peer.connect(CONFIG.peerPrefix + S.room, { reliable:true }));
  wireCall(S.peer.call(CONFIG.peerPrefix + S.room, outgoingStream(), { sdpTransform:sdpOpus }));
}
function sdpOpus(sdp){
  try {
    const m = sdp.match(/a=rtpmap:(\d+) opus\/48000[^\r\n]*/i); if (!m) return sdp;
    const pt = m[1], add = { useinbandfec:'1', usedtx:'1', maxaveragebitrate:'32000', stereo:'0' };
    const re = new RegExp('a=fmtp:' + pt + ' ([^\\r\\n]*)');
    if (re.test(sdp)) return sdp.replace(re, (all, p) => { const kv = {}; p.split(';').forEach(x => { const [k, v] = x.trim().split('='); if (k) kv[k] = v; }); Object.assign(kv, add); return 'a=fmtp:' + pt + ' ' + Object.entries(kv).map(([k, v]) => k + '=' + v).join(';'); });
    return sdp.replace(m[0], m[0] + '\r\na=fmtp:' + pt + ' ' + Object.entries(add).map(([k, v]) => k + '=' + v).join(';'));
  } catch(e){ return sdp; }
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

  if (S.iceReady) await Promise.race([S.iceReady, new Promise(r => setTimeout(r, 2500))]);
  const pcfg = { config:{ iceServers:CONFIG.iceServers, iceCandidatePoolSize:4 }, pingInterval:4000 };
  const peer = role === 'host' ? new Peer(CONFIG.peerPrefix + code, pcfg) : new Peer(pcfg);
  S.peer = peer;
  peer.on('open', () => {
    btn.disabled = false;
    enterCall();
    if (role === 'guest') connectToHost();
  });
  peer.on('connection', c => wireConn(c));
  peer.on('call', c => { c.answer(outgoingStream(), { sdpTransform:sdpOpus }); wireCall(c); });
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
  $('pairText').textContent = LANGS[S.me].short + ' ⇄ ' + (S.peerLang && LANGS[S.peerLang] ? LANGS[S.peerLang].short : '…'); $('meLabel').textContent = t('you') + ': ' + LANGS[S.me].label;
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
  const head = `${CONFIG.brand}\n${t('roomShort')}: ${S.room}\n${new Date().toLocaleString(LOC[S.me])}\n${S.startedAt ? t('stDur') + ': ' + fmt(Date.now() - S.startedAt) + '\n' : ''}\n`;
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
  // dil: link > kayıtlı seçim > tarayıcı dili / saat dilimi (İran → Farsça)
  const guess = (() => { const ls = (navigator.languages || [navigator.language || '']).map(x => String(x).slice(0, 2).toLowerCase());
    for (const l of ls) if (LANGS[l]) return l;
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    return tz === 'Asia/Tehran' ? 'fa' : /America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Manaus|Belem)/.test(tz) ? 'pt' : tz === 'Europe/Istanbul' ? 'tr' : null; })();
  if (guess) S.me = guess;
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

/* ---------- Mobil: tam ekran görüntü, dokununca menü, ön/arka kamera ---------- */
(function bmMobile(){
  const call = $('call'), stage = $('stage');
  let hideT = 0;
  const showUI = () => {
    call.classList.remove('ui-off'); clearTimeout(hideT);
    hideT = setTimeout(() => { if (!call.hidden && $('menu').hidden && !document.querySelector('.panel:not([hidden])')) call.classList.add('ui-off'); }, 5000);
  };
  stage.addEventListener('click', e => {
    if (e.target.closest('#tileSelf,button,a,.menu')) return;
    if (call.classList.contains('ui-off')) showUI(); else { clearTimeout(hideT); call.classList.add('ui-off'); }
  });
  ['.topbar','.dock'].forEach(sel => { const el = call.querySelector(sel); if (el) el.addEventListener('pointerdown', showUI); });
  new MutationObserver(() => { if (!call.hidden) showUI(); }).observe(call, { attributes:true, attributeFilter:['hidden'] });

  S.facing = 'user';
  const flip = $('flipBtn');
  const refresh = () => navigator.mediaDevices && navigator.mediaDevices.enumerateDevices && navigator.mediaDevices.enumerateDevices().then(ds => {
    const cams = ds.filter(d => d.kind === 'videoinput').length;
    flip.hidden = !(cams > 1 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }).catch(() => {});
  refresh(); if (navigator.mediaDevices) navigator.mediaDevices.addEventListener('devicechange', refresh);
  flip.onclick = async e => {
    e.stopPropagation(); if (!S.stream || flip.disabled) return;
    const next = S.facing === 'user' ? 'environment' : 'user';
    flip.disabled = true;
    const old = S.stream.getVideoTracks()[0];
    if (old){ S.stream.removeTrack(old); old.stop(); }   // iOS iki kamerayı aynı anda açamaz
    const ask = fm => navigator.mediaDevices.getUserMedia({ video:{ facingMode:fm, width:{ ideal:1280 }, height:{ ideal:720 } } });
    let s;
    try { s = await ask({ exact:next }); } catch(_){ try { s = await ask(next); } catch(_2){ s = null; } }
    if (!s){ try { s = await ask(S.facing); } catch(_3){} toast(t('media'), true); }
    else S.facing = next;
    if (s){
      const nt = s.getVideoTracks()[0];
      S.stream.addTrack(nt);
      if (!S.screenStream) replaceOutgoing(nt);
      ['vSelf','vRemote','pvVideo'].forEach(id => { const v = $(id); if (v && v.srcObject === S.stream){ v.srcObject = null; v.srcObject = S.stream; } });
      applyTrackStates();
    }
    call.classList.toggle('rear', S.facing === 'environment');
    $('lobby').classList.toggle('rear', S.facing === 'environment');
    flip.disabled = false;
  };
})();


/* ---------- Bağlantı kalitesi: iki tarafın sinyali + zayıf ağda uyarlanan kalite ---------- */
(function bmNet(){
  const L = { tr:{ me:'Siz', q:['Kopuk','Zayıf','Orta','Güçlü'], weak:'Bağlantı zayıf: ses öncelikli, görüntü kalitesi düşürüldü', back:'Bağlantı düzeldi' },
              pt:{ me:'Você', q:['Sem sinal','Fraco','Médio','Forte'], weak:'Conexão fraca: áudio priorizado, qualidade de vídeo reduzida', back:'Conexão restabelecida' },
              en:{ me:'You', q:['No signal','Weak','Fair','Strong'], weak:'Weak connection: audio prioritised, video quality reduced', back:'Connection restored' },
              fa:{ me:'شما', q:['قطع','ضعیف','متوسط','قوی'], weak:'اتصال ضعیف: اولویت با صدا، کیفیت تصویر کاهش یافت', back:'اتصال برقرار شد' } };
  const tx = () => L[S.me] || L.tr;
  const PROFILES = { 3:{ maxBitrate:1500000, scale:1, fps:30 }, 2:{ maxBitrate:600000, scale:1.5, fps:24 }, 1:{ maxBitrate:220000, scale:2.5, fps:15 }, 0:{ maxBitrate:120000, scale:4, fps:10 } };
  let prev = null, myQ = 3, peerQ = null, peerSeen = 0, applied = null, goodStreak = 0, warned = false;

  function paint(id, q, label){
    const el = $(id); if (!el) return;
    el.dataset.q = q == null ? '' : q; el.hidden = false;
    el.querySelector('.nl').textContent = label;
    el.title = label + ': ' + (q == null ? '—' : tx().q[q]);
    el.querySelector('.nq').textContent = q == null ? '—' : tx().q[q];
  }
  window.bmNetPeer = m => { peerQ = Math.max(0, Math.min(3, m.q | 0)); peerSeen = Date.now(); paint('netThem', peerQ, S.peerName || '—'); };

  let lowN = 0, highN = 0;
  window.bmSetLow = async (on, quiet) => {
    if (!!S.lowData === !!on && !quiet) return;
    S.lowData = !!on; applied = null;
    const pc = S.call && S.call.peerConnection;
    if (pc) for (const snd of pc.getSenders()){ if (!snd.track || snd.track.kind !== 'video') continue; try { const p = snd.getParameters(); if (!p.encodings || !p.encodings.length) p.encodings = [{}]; p.encodings[0].active = !S.lowData; await snd.setParameters(p); } catch(e){} }
    send({ type:'lowdata', on:S.lowData });
    $('lowBtn').setAttribute('aria-checked', S.lowData);
    if (!quiet) toast(S.lowData ? LOWTX().on : LOWTX().off);
  };
  async function tune(target){
    const pc = S.call && S.call.peerConnection; if (!pc || applied === target) return;
    const p = PROFILES[target];
    for (const snd of pc.getSenders()){
      if (!snd.track) continue;
      try {
        const prm = snd.getParameters(); if (!prm.encodings || !prm.encodings.length) prm.encodings = [{}];
        if (snd.track.kind === 'audio'){ prm.encodings[0].priority = 'high'; prm.encodings[0].networkPriority = 'high'; }
        else {
          prm.degradationPreference = target >= 2 ? 'balanced' : 'maintain-framerate';
          prm.encodings[0].maxBitrate = S.screenStream ? Math.max(p.maxBitrate, 900000) : p.maxBitrate;
          prm.encodings[0].scaleResolutionDownBy = S.screenStream ? 1 : p.scale;
          prm.encodings[0].maxFramerate = S.screenStream ? 10 : p.fps;
          prm.encodings[0].priority = 'low';
          prm.encodings[0].active = !S.lowData;
        }
        await snd.setParameters(prm);
      } catch(e){}
    }
    applied = target;
  }

  async function tick(){
    if ($('call').hidden){ ['netMe','netThem'].forEach(id => $(id) && ($(id).hidden = true)); prev = null; applied = null; return; }
    const pc = S.call && S.call.peerConnection;
    if (!pc){ paint('netMe', S.peer && !S.peer.disconnected ? null : 0, tx().me); return; }
    const ice = pc.iceConnectionState;
    let rtt = 0, avail = 0, lost = 0, recv = 0, jitter = 0, ts = Date.now();
    try {
      const st = await pc.getStats();
      st.forEach(r => {
        if (r.type === 'candidate-pair' && (r.nominated || r.selected) && r.state === 'succeeded'){ rtt = r.currentRoundTripTime || rtt; avail = r.availableOutgoingBitrate || avail; }
        if (r.type === 'inbound-rtp' && !r.isRemote){ lost += r.packetsLost || 0; recv += r.packetsReceived || 0; if (r.kind === 'audio' && r.jitter) jitter = r.jitter; }
      });
    } catch(e){}
    let loss = 0;
    if (prev){ const dl = lost - prev.lost, dr = recv - prev.recv; loss = dl + dr > 0 ? Math.max(0, dl) / (dl + dr) : 0; }
    prev = { lost, recv, ts };
    let q = 3;
    if (ice === 'disconnected' || ice === 'failed') q = 0;
    else {
      if (loss > 0.03 || rtt > 0.3 || jitter > 0.05 || (avail && avail < 500000)) q = 2;
      if (loss > 0.08 || rtt > 0.6 || jitter > 0.1 || (avail && avail < 200000)) q = 1;
    }
    myQ = q;
    paint('netMe', q, tx().me);
    send({ type:'net', q });
    if (peerSeen && Date.now() - peerSeen > 8000){ peerQ = 0; paint('netThem', 0, S.peerName || '—'); }
    // Gönderdiğim görüntünün kalitesi: iki taraftan kötü olanına göre; düşüş hemen, yükseliş 3 ölçüm sonra
    const target = Math.min(myQ, peerQ == null ? 3 : peerQ);
    // çok zayıf bağlantıda görüntüyü durdur, ses kesintisiz sürsün; düzelince görüntü geri gelir
    lowN = target <= 1 ? lowN + 1 : 0; highN = target >= 2 ? highN + 1 : 0;
    if (!S.lowData && (S.forceLow || lowN >= 3)) await window.bmSetLow(true);
    else if (S.lowData && !S.forceLow && highN >= 5) await window.bmSetLow(false);
    if (applied == null || target < applied){ goodStreak = 0; await tune(target); }
    else if (target > applied){ if (++goodStreak >= 3){ goodStreak = 0; await tune(Math.min(3, applied + 1)); } }
    const worst = Math.min(myQ, peerQ == null ? 3 : peerQ);
    if (worst <= 1 && !warned){ warned = true; toast(tx().weak); }
    else if (worst >= 3 && warned){ warned = false; toast(tx().back); }
  }
  setInterval(() => { tick().catch(() => {}); }, 2000);
})();

/* Tarayıcının kendiliğinden picture-in-picture'a alması görüntüyü ana ekrandan kaldırıyordu → kapatıldı */
['vRemote','vSelf','pvVideo'].forEach(id => {
  const v = $(id); if (!v) return;
  v.disablePictureInPicture = true; v.setAttribute('disablepictureinpicture', '');
  v.addEventListener('enterpictureinpicture', () => { if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {}); });
});
try { if (navigator.mediaSession && navigator.mediaSession.setActionHandler) navigator.mediaSession.setActionHandler('enterpictureinpicture', null); } catch(e){}
/* Ana ekranda görüntü durursa (sekme değişimi, PiP dönüşü) yeniden oynat */
document.addEventListener('visibilitychange', () => { if (!document.hidden) ['vRemote','vSelf'].forEach(id => { const v = $(id); if (v && v.srcObject && v.paused) v.play().catch(() => {}); }); });
/* Masaüstünde fare hareketi menüleri geri getirir */
document.addEventListener('mousemove', (() => { let last = 0; return () => { const n = Date.now(); if (n - last < 400) return; last = n; const c = $('call'); if (!c.hidden && c.classList.contains('ui-off')){ c.classList.remove('ui-off'); clearTimeout(window._bmHide); window._bmHide = setTimeout(() => { if ($('menu').hidden) c.classList.add('ui-off'); }, 5000); } }; })());
/* Görüntü ekranla aynı yönde ise tam doldur (cover); dik telefon görüntüsü yatay ekranda ise kırpmadan sığdır */
(function bmFit(){
  const fit = () => ['vRemote'].forEach(id => {
    const v = $(id), box = v && v.parentElement; if (!v || !v.videoWidth || !box) return;
    const vPortrait = v.videoHeight > v.videoWidth, bPortrait = box.clientHeight > box.clientWidth;
    v.classList.toggle('fit-contain', vPortrait !== bPortrait && box.clientWidth > 160);
  });
  ['vRemote','vSelf'].forEach(id => { const v = $(id); if (v){ v.addEventListener('loadedmetadata', fit); v.addEventListener('resize', fit); } });
  addEventListener('resize', fit); setInterval(fit, 3000);
})();


/* ---------- Gürültü / yankı filtresi: yalnız sizin sesiniz çevrilir ---------- */
const VAD = (() => {
  const v = { trackOK: undefined, lastVoice: 0, remoteVoice: 0, floor: 0.008, active: false, ctx: null, la: null, ra: null, rs: null };
  const rms = an => { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); let x = 0; for (let i = 0; i < b.length; i++) x += b[i] * b[i]; return Math.sqrt(x / b.length); };
  function attach(){
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC || !S.stream) return;
      v.ctx = v.ctx || new AC();
      if (v.ctx.state === 'suspended') v.ctx.resume().catch(() => {});
      const at = S.stream.getAudioTracks()[0];
      if (at && (!v.la || v.la._t !== at)){ const an = v.ctx.createAnalyser(); an.fftSize = 1024; v.ctx.createMediaStreamSource(new MediaStream([at])).connect(an); an._t = at; v.la = an; }
      const rsrc = $('vRemote').srcObject, rt = rsrc && rsrc.getAudioTracks && rsrc.getAudioTracks()[0];
      if (rt && (!v.ra || v.ra._t !== rt)){ const an = v.ctx.createAnalyser(); an.fftSize = 1024; v.ctx.createMediaStreamSource(new MediaStream([rt])).connect(an); an._t = rt; v.ra = an; }
    } catch(e){}
  }
  setInterval(() => {
    if ($('call').hidden) return;
    attach();
    if (!v.ctx || v.ctx.state !== 'running' || !v.la){ v.active = false; return; }
    v.active = true;
    const now = Date.now(), l = rms(v.la);
    // gürültü tabanı: sessizlikte hızlı, konuşmada çok yavaş uyum
    v.floor = l < v.floor ? v.floor * 0.7 + l * 0.3 : v.floor * 0.995 + l * 0.005;
    if (l > Math.max(0.015, v.floor * 3)) v.lastVoice = now;
    if (v.ra && rms(v.ra) > 0.02) v.remoteVoice = now;
  }, 60);
  v.accept = (text, conf, isFinal) => {
    const now = Date.now(), words = text.split(/\s+/).filter(Boolean).length;
    if (isFinal && conf > 0 && conf < 0.45) return false;                    // tanıma emin değil → büyük olasılıkla ortam sesi
    if (isFinal && words === 1 && conf > 0 && conf < 0.7) return false;
    if (v.active){
      if (now - v.lastVoice > (isFinal ? 2500 : 1500)) return false;         // mikrofonda konuşma yok → ortam/TV/müzik
      if (now - v.remoteVoice < 1200 && now - v.lastVoice > 900) return false; // karşı tarafın hoparlörden gelen sesi (yankı)
    }
    return true;
  };
  return v;
})();
function removeCap(slot){ const el = capEls[slot]; if (el){ el.remove(); delete capEls[slot]; } }


/* ---------- Görüşme sonu: dökümü (ve yapay zekâ özetini) müşteri dosyasına kaydet ---------- */
(function bmSave(){
  const L = {
    tr:{ save:'Müşteri dosyasına kaydet', saving:'Kaydediliyor, özet hazırlanıyor…', saved:'Dosyaya kaydedildi', sum:'Görüşme özeti', err:'Kaydedilemedi' },
    pt:{ save:'Salvar no processo do cliente', saving:'Salvando e preparando o resumo…', saved:'Salvo no processo', sum:'Resumo da chamada', err:'Não foi possível salvar' },
    en:{ save:'Save to client file', saving:'Saving and preparing the summary…', saved:'Saved to file', sum:'Call summary', err:'Could not save' },
    fa:{ save:'ذخیره در پرونده مشتری', saving:'در حال ذخیره و تهیه خلاصه…', saved:'در پرونده ذخیره شد', sum:'خلاصه تماس', err:'ذخیره نشد' } };
  const tx = () => L[S.me] || L.tr;
  fetch('/api/workspace/meeting', { credentials:'same-origin', cache:'no-store' }).then(r => r.ok ? r.json() : null).then(d => { if (d && d.name) S.wsUser = d.name; }).catch(() => {});
  new MutationObserver(() => {
    if ($('ended').hidden) return;
    const has = (S.lines && S.lines.length) || (S.msgList && S.msgList.length);
    const b = $('endSave'); b.hidden = !(S.wsUser && has); b.disabled = false; $('endSaveT').textContent = tx().save;
    $('endSum').hidden = true;
  }).observe($('ended'), { attributes:true, attributeFilter:['hidden'] });
  $('endSave').onclick = async () => {
    const b = $('endSave'); b.disabled = true; $('endSaveT').textContent = tx().saving;
    try {
      const r = await fetch('/api/workspace/meeting/save', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ room:S.room, start:S.startedAt, end:Date.now(), peer:S.peerName || '', lines:S.lines || [], msgs:S.msgList || [] }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.message || tx().err);
      $('endSaveT').textContent = '✓ ' + tx().saved; const fn = document.querySelector('#ended [data-i="endNote"]'); if (fn) fn.hidden = true;
      if (j.summary){ $('endSumT').textContent = tx().sum; $('endSumX').textContent = j.summary; $('endSum').hidden = false; }
    } catch(e){ toast(tx().err + ': ' + e.message, true); b.disabled = false; $('endSaveT').textContent = tx().save; }
  };
})();


/* ---------- Düşük veri modu arayüzü + görüşme içinde dil değiştirme ---------- */
const LOWL = { tr:{ lbl:'Düşük veri modu (yalnız ses)', on:'Bağlantı çok zayıf: yalnız ses moduna geçildi, görüntü bağlantı düzelince geri gelir', off:'Görüntü yeniden açıldı', peer:'Bağlantı zayıf · yalnız ses', lang:'Konuştuğum dil' },
  pt:{ lbl:'Modo de poucos dados (só áudio)', on:'Conexão muito fraca: modo só áudio; o vídeo volta quando melhorar', off:'Vídeo reativado', peer:'Conexão fraca · só áudio', lang:'Idioma em que falo' },
  en:{ lbl:'Low-data mode (audio only)', on:'Very weak connection: switched to audio only; video returns when it improves', off:'Video resumed', peer:'Weak connection · audio only', lang:'Language I speak' },
  fa:{ lbl:'حالت کم‌مصرف (فقط صدا)', on:'اتصال بسیار ضعیف: فقط صدا؛ با بهتر شدن اتصال تصویر برمی‌گردد', off:'تصویر دوباره فعال شد', peer:'اتصال ضعیف · فقط صدا', lang:'زبانی که صحبت می‌کنم' } };
const LOWTX = () => LOWL[S.me] || LOWL.tr;
(function bmLow(){
  const tile = $('tileRemote'), ph = document.createElement('div');
  ph.className = 'lowdata-ph'; ph.hidden = true; ph.innerHTML = '<svg class="i"><use href="#i-mic"/></svg><span></span>';
  tile.appendChild(ph);
  window.bmLowPeer = on => { ph.hidden = !on; ph.querySelector('span').textContent = LOWTX().peer; };
  $('lowBtn').onclick = () => { S.forceLow = !S.forceLow; window.bmSetLow(S.forceLow); };
  const paint = () => {
    $('lowLbl').textContent = LOWTX().lbl; $('myLangLbl').textContent = LOWTX().lang;
    document.querySelectorAll('#langSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === S.me));
  };
  document.querySelectorAll('#langSeg button').forEach(b => b.onclick = () => {
    if (S.me === b.dataset.l) return;
    S.me = b.dataset.l; store.set('lang', S.me); applyLang(); paint();
    send({ type:'lang', lang:S.me });
    // konuşma tanıma yeni dilde yeniden başlasın
    if (S.rec){ try { S.rec.onend = null; S.rec.abort(); } catch(e){} S.rec = null; if (typeof startRecognition === 'function') startRecognition(); }
  });
  paint(); new MutationObserver(paint).observe($('menu'), { attributes:true, attributeFilter:['hidden'] });
})();

/* Yöneticinin eklediği TURN sunucuları (zayıf/filtreli ağlar için) — önce bunlar denenir */
S.iceReady = fetch('/api/auth/meeting', { cache:'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
  if (d && Array.isArray(d.ice) && d.ice.length) CONFIG.iceServers.unshift(...d.ice);
}).catch(() => {});

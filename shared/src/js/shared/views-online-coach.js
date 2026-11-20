// مربی آنلاین و تحلیل هوشمند: دریافت زنده یا پیش‌نمایش فایل، بدون ارسال داده به سرور.
let tpOcStream=null,tpOcFacing='environment',tpOcCameraBusy=false,tpOcFileUrl=null,tpOcInputMode='live';

Object.assign(views,{
 'online-coach':()=>{
  PT={t:'تحلیل هوشمند حرکت',d:'ورودی تمرین از دوربین زنده یا فایل ویدئویی در یک فضای واحد.'};
  return [
   '<div class="w tp-oc"><section class="tp-oc-hero" aria-labelledby="tp-oc-title">',
   '<div class="tp-oc-hero-copy"><span class="tag">مربی آنلاین و تحلیل حرکت</span><h1 id="tp-oc-title">تحلیل هوشمند حرکت</h1>',
   '<p>برای آماده‌سازی تمرین، تصویر را به‌صورت زنده از دوربین دریافت کن یا یک فایل ویدئویی انتخاب کن. هر دو ورودی از همین صفحه مدیریت می‌شوند.</p>',
   '<div class="tp-oc-status-row"><span class="tp-oc-status"><i class="tp-oc-dot is-idle" aria-hidden="true"></i><span id="tp-oc-camera-state">دوربین خاموش</span></span>',
   '<span class="tp-oc-status"><i class="tp-oc-dot is-offline" aria-hidden="true"></i><span id="tp-oc-engine-state">موتور تحلیل متصل نیست</span></span></div></div>',
   '<aside class="tp-oc-hero-note"><span class="tp-oc-note-icon" aria-hidden="true">◎</span><b>دو روش برای دریافت ورودی</b><p>دوربین زنده یا انتخاب ویدئوی ذخیره‌شده؛ انتخاب هرکدام در همین صفحه انجام می‌شود.</p></aside></section>',
   '<section class="tp-oc-workspace" aria-label="ورودی تمرین و وضعیت تحلیل"><div class="tp-oc-camera-card">',
   '<div class="tp-oc-card-head"><div><h2>ورودی تمرین</h2><p class="mu sm">روش دریافت تصویر را انتخاب کن</p></div><span class="tag m">پیش‌نمایش محلی</span></div>',
   '<div class="chips" role="group" aria-label="روش دریافت ورودی"><button type="button" class="chip on" id="tp-oc-mode-live" aria-pressed="true" onclick="setOnlineCoachInputMode(\'live\')">دریافت زنده از دوربین</button><button type="button" class="chip" id="tp-oc-mode-file" aria-pressed="false" onclick="setOnlineCoachInputMode(\'file\')">انتخاب فایل ویدئویی</button></div>',
   '<div id="tp-oc-live-panel"><div class="tp-oc-camera-tools"><div class="tp-oc-facing" role="group" aria-label="انتخاب دوربین"><button type="button" class="chip" id="tp-oc-back-camera" aria-pressed="true" onclick="setOnlineCoachCameraFacing(\'environment\')">دوربین پشت</button><button type="button" class="chip" id="tp-oc-front-camera" aria-pressed="false" onclick="setOnlineCoachCameraFacing(\'user\')">دوربین جلو</button></div>',
   '<div class="tp-oc-camera-actions"><button type="button" class="btn" id="tp-oc-camera-start" onclick="startOnlineCoachCamera()">روشن کردن دوربین</button><button type="button" class="btn o" id="tp-oc-camera-stop" onclick="stopOnlineCoachCamera()" disabled>خاموش کردن دوربین</button></div></div></div>',
   '<div id="tp-oc-file-panel" class="d-c" hidden><label class="fl" for="tp-oc-file">انتخاب فایل ویدئویی</label><input id="tp-oc-file" type="file" accept="video/*" onchange="selectOnlineCoachFile(this)" aria-describedby="tp-oc-file-help">',
   '<p id="tp-oc-file-help" class="mu sm">فایل در این نسخه فقط روی دستگاه خودت پیش‌نمایش می‌شود و به سرور فرستاده نمی‌شود.</p><p id="tp-oc-file-details" class="mu sm" role="status" aria-live="polite">فایلی انتخاب نشده است.</p>',
   '<button type="button" class="btn o s" id="tp-oc-file-clear" onclick="clearOnlineCoachFile()" disabled>حذف فایل انتخاب‌شده</button></div>',
   '<div class="tp-oc-stage" data-camera-active="false" data-input-mode="live"><video id="tp-oc-video" class="tp-oc-video" autoplay muted playsinline hidden preload="metadata" aria-label="پیش‌نمایش ورودی تمرین"></video>',
   '<div id="tp-oc-placeholder" class="tp-oc-placeholder"><span class="tp-oc-camera-symbol" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><rect x="5" y="12" width="27" height="24" rx="4" stroke="currentColor" stroke-width="2.5"/><path d="m32 20 11-6v20l-11-6" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="18.5" cy="24" r="6" stroke="currentColor" stroke-width="2.5"/></svg></span><b>هنوز ورودی تصویری انتخاب نشده است</b><span>دوربین را روشن کن یا به بخش انتخاب فایل برو.</span></div>',
   '<span class="tp-oc-live-label"><i aria-hidden="true"></i><span id="tp-oc-preview-label">پیش‌نمایش ورودی</span></span></div>',
   '<p id="tp-oc-camera-message" class="tp-oc-camera-message" role="status" aria-live="polite">برای شروع، دوربین را فعال کن یا یک فایل ویدئویی انتخاب کن.</p></div>',
   '<aside class="tp-oc-results" aria-label="وضعیت سرویس تحلیل">',
   '<article class="tp-oc-counter-card"><span class="tp-oc-eyebrow">وضعیت اتصال</span><h2>موتور تحلیل هوشمند</h2><p id="tp-oc-bot-state">سرویس پردازش و تحلیل حرکت هنوز به این نسخه متصل نشده است.</p><button type="button" class="btn tp-oc-count-button" id="tp-oc-analysis-start" disabled title="پس از ارائه و اتصال سرویس تحلیل فعال می‌شود">شروع تحلیل پس از اتصال سرویس</button><span class="tp-oc-disabled-note">در حال حاضر هیچ امتیاز، شمارش یا گزارش تحلیلی واقعی تولید نمی‌شود.</span></article>',
   '<article class="tp-oc-connection-card"><div class="tp-oc-connection-icon" aria-hidden="true">⌁</div><div><b>آمادگی ورودی</b><p class="mu sm" id="tp-oc-input-status">آماده انتخاب دوربین یا فایل</p></div><span class="tp-oc-connection-indicator" aria-hidden="true"></span></article>',
   '<article class="tp-oc-privacy-card"><b>حریم خصوصی و ارسال فایل</b><p>در این پیش‌نمایش، تصویر دوربین و فایل انتخابی فقط روی همین دستگاه نمایش داده می‌شوند؛ هیچ داده‌ای به سرور ارسال نمی‌شود.</p></article></aside></section>',
   '<section class="tp-oc-lower"><div class="tp-oc-guidance"><div class="tp-oc-section-title"><h2>آماده‌سازی ویدئو</h2><span class="mu sm">برای ورودی واضح‌تر</span></div><div class="tp-oc-guide-grid">',
   '<article><span aria-hidden="true">۱</span><b>تمام بدن در کادر باشد</b><p>فضای حرکت پاها و بالاتنه از تصویر خارج نشود.</p></article><article><span aria-hidden="true">۲</span><b>نور کافی داشته باش</b><p>نور مناسب، جزئیات حرکت را واضح‌تر می‌کند.</p></article><article><span aria-hidden="true">۳</span><b>زاویه ثابت انتخاب کن</b><p>برای مقایسه بهتر، زاویه دوربین را ثابت نگه دار.</p></article></div></div>',
   '<div class="tp-oc-history"><div class="tp-oc-section-title"><h2>گزارش تحلیل‌ها</h2></div><div class="tp-state"><b>هنوز گزارشی ثبت نشده است</b><p>پس از اتصال سرویس تحلیل و ثبت نتایج واقعی، گزارش جلسه‌ها اینجا نمایش داده می‌شود.</p></div></div></section>',
   '<p class="tp-oc-demo-note">محدودیت نسخه فعلی: دریافت زنده و پیش‌نمایش فایل روی دستگاه فعال است؛ ارسال به سرور، تشخیص حرکت و تولید گزارش هوش مصنوعی تا زمان ارائه و اتصال سرویس واقعی غیرفعال می‌مانند.</p></div>'
  ].join('');
 }
});

function tpOcSetMessage(message,kind='info'){
 const el=document.getElementById('tp-oc-camera-message');
 if(el){el.textContent=message;el.dataset.state=kind;}
}
function tpOcRevokeFile(){
 if(tpOcFileUrl){try{URL.revokeObjectURL(tpOcFileUrl)}catch{}tpOcFileUrl=null;}
}
function tpOcSyncModeUi(){
 const live=tpOcInputMode==='live',livePanel=document.getElementById('tp-oc-live-panel'),filePanel=document.getElementById('tp-oc-file-panel');
 const liveButton=document.getElementById('tp-oc-mode-live'),fileButton=document.getElementById('tp-oc-mode-file'),stage=document.querySelector('.tp-oc-stage');
 if(livePanel)livePanel.hidden=!live;if(filePanel)filePanel.hidden=live;
 if(liveButton){liveButton.classList.toggle('on',live);liveButton.setAttribute('aria-pressed',String(live));}
 if(fileButton){fileButton.classList.toggle('on',!live);fileButton.setAttribute('aria-pressed',String(!live));}
 if(stage)stage.dataset.inputMode=tpOcInputMode;
 const label=document.getElementById('tp-oc-preview-label');if(label)label.textContent=live?'پیش‌نمایش زنده دوربین':'پیش‌نمایش فایل ویدئویی';
}
function tpOcSyncCameraUi(active){
 const state=document.getElementById('tp-oc-camera-state'),start=document.getElementById('tp-oc-camera-start'),stop=document.getElementById('tp-oc-camera-stop');
 const video=document.getElementById('tp-oc-video'),placeholder=document.getElementById('tp-oc-placeholder');
 const hasFile=tpOcInputMode==='file'&&!!tpOcFileUrl,hasCamera=tpOcInputMode==='live'&&!!active;
 if(state)state.textContent=hasCamera?'دوربین روشن است':hasFile?'فایل ویدئویی انتخاب شده':'دوربین خاموش';
 if(start)start.disabled=hasCamera||tpOcCameraBusy;if(stop)stop.disabled=!hasCamera||tpOcCameraBusy;
 if(video)video.hidden=!(hasFile||hasCamera);if(placeholder)placeholder.hidden=hasFile||hasCamera;
 const stage=document.querySelector('.tp-oc-stage');if(stage)stage.dataset.cameraActive=hasCamera?'true':'false';
 const dot=document.querySelector('.tp-oc-status .tp-oc-dot');if(dot)dot.classList.toggle('is-active',hasCamera||hasFile);
}
function setOnlineCoachInputMode(mode){
 if(mode!=='live'&&mode!=='file')return;
 if(mode==='file'){stopOnlineCoachCamera(false);tpOcInputMode='file';tpOcSetMessage('یک فایل ویدئویی انتخاب کن. فایل فقط روی همین دستگاه پیش‌نمایش می‌شود.','info');}
 else{tpOcInputMode='live';clearOnlineCoachFile();tpOcSetMessage('برای دریافت زنده، دوربین را روشن کن. تصویر به سرور ارسال نمی‌شود.','info');tpOcSyncCameraUi(false);}
 tpOcSyncModeUi();
}
function tpOcFormatSize(bytes){
 if(!Number.isFinite(bytes)||bytes<0)return'';
 if(bytes<1024)return bytes+' بایت';
 if(bytes<1024*1024)return(bytes/1024).toFixed(1)+' کیلوبایت';
 if(bytes<1024*1024*1024)return(bytes/(1024*1024)).toFixed(1)+' مگابایت';
 return(bytes/(1024*1024*1024)).toFixed(2)+' گیگابایت';
}
function selectOnlineCoachFile(input){
 if(tpOcInputMode!=='file'||!input||!input.files||!input.files.length)return;
 const file=input.files[0];
 if(!file.type||!file.type.startsWith('video/')){input.value='';tpOcSetMessage('این فایل ویدئویی نیست. یک فایل با قالب ویدئو انتخاب کن.','error');return;}
 stopOnlineCoachCamera(false);tpOcRevokeFile();
 if(typeof URL==='undefined'||typeof URL.createObjectURL!=='function'){input.value='';tpOcSetMessage('پیش‌نمایش فایل در این مرورگر پشتیبانی نمی‌شود.','error');return;}
 const video=document.getElementById('tp-oc-video');if(!video)return;
 tpOcFileUrl=URL.createObjectURL(file);video.pause();video.srcObject=null;video.src=tpOcFileUrl;video.controls=true;video.autoplay=false;video.muted=false;video.hidden=false;video.load();
 const placeholder=document.getElementById('tp-oc-placeholder');if(placeholder)placeholder.hidden=true;
 const stage=document.querySelector('.tp-oc-stage');if(stage)stage.dataset.cameraActive='false';
 const state=document.getElementById('tp-oc-camera-state');if(state)state.textContent='فایل ویدئویی انتخاب شده';
 const details=document.getElementById('tp-oc-file-details');if(details)details.textContent=file.name+' · '+tpOcFormatSize(file.size);
 const clear=document.getElementById('tp-oc-file-clear');if(clear)clear.disabled=false;
 const inputStatus=document.getElementById('tp-oc-input-status');if(inputStatus)inputStatus.textContent='فایل برای پیش‌نمایش محلی انتخاب شد';
 const dot=document.querySelector('.tp-oc-status .tp-oc-dot');if(dot)dot.classList.add('is-active');
 tpOcSetMessage('فایل انتخاب شد و فقط روی همین دستگاه پخش می‌شود؛ هنوز به سرور ارسال یا تحلیل نمی‌شود.','success');
}
function clearOnlineCoachFile(){
 tpOcRevokeFile();const input=document.getElementById('tp-oc-file');if(input)input.value='';
 const video=document.getElementById('tp-oc-video');
 if(video){try{video.pause()}catch{}video.srcObject=null;video.removeAttribute('src');video.controls=false;video.hidden=true;video.load();}
 const placeholder=document.getElementById('tp-oc-placeholder');if(placeholder)placeholder.hidden=false;
 const details=document.getElementById('tp-oc-file-details');if(details)details.textContent='فایلی انتخاب نشده است.';
 const clear=document.getElementById('tp-oc-file-clear');if(clear)clear.disabled=true;
 const dot=document.querySelector('.tp-oc-status .tp-oc-dot');if(dot&&!tpOcStream)dot.classList.remove('is-active');
 const state=document.getElementById('tp-oc-camera-state');if(state&&tpOcInputMode==='live')state.textContent='دوربین خاموش';
 const inputStatus=document.getElementById('tp-oc-input-status');if(inputStatus)inputStatus.textContent='آماده انتخاب دوربین یا فایل';
 const stage=document.querySelector('.tp-oc-stage');if(stage&&tpOcInputMode==='live')stage.dataset.cameraActive='false';
}
async function startOnlineCoachCamera(){
 if(tpOcInputMode!=='live'||tpOcStream||tpOcCameraBusy)return;
 const start=document.getElementById('tp-oc-camera-start'),video=document.getElementById('tp-oc-video');if(!video)return;
 if(!navigator.mediaDevices||typeof navigator.mediaDevices.getUserMedia!=='function'){tpOcSetMessage('دسترسی به دوربین در این مرورگر در دسترس نیست. صفحه را با HTTPS و مرورگر به‌روز باز کن.','error');return;}
 tpOcCameraBusy=true;if(start)start.disabled=true;tpOcSetMessage('در حال درخواست اجازه دسترسی به دوربین…');
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:tpOcFacing},width:{ideal:1280},height:{ideal:720}}});
  if(!document.getElementById('tp-oc-video')||tpOcInputMode!=='live'){stream.getTracks().forEach(track=>track.stop());return;}
  tpOcStream=stream;video.removeAttribute('src');video.srcObject=stream;video.controls=false;video.autoplay=true;video.muted=true;await video.play();
  tpOcSyncCameraUi(true);const inputStatus=document.getElementById('tp-oc-input-status');if(inputStatus)inputStatus.textContent='تصویر زنده از دوربین دریافت می‌شود';
  tpOcSetMessage('پیش‌نمایش زنده فعال است و تصویر فقط روی همین دستگاه نمایش داده می‌شود؛ ارسال به سرور انجام نمی‌شود.','success');
 }catch(error){
  const message=error&&error.name==='NotAllowedError'?'اجازه دسترسی به دوربین داده نشد. مجوز دوربین را در مرورگر فعال کن.':error&&error.name==='NotFoundError'?'دوربینی روی این دستگاه پیدا نشد.':'فعال‌کردن دوربین ممکن نشد. اتصال امن HTTPS و مجوز مرورگر را بررسی کن.';
  tpOcSetMessage(message,'error');tpOcSyncCameraUi(false);
 }finally{tpOcCameraBusy=false;if(start)start.disabled=!!tpOcStream||tpOcInputMode!=='live';const stop=document.getElementById('tp-oc-camera-stop');if(stop)stop.disabled=!tpOcStream;}
}
function stopOnlineCoachCamera(announce=true){
 if(tpOcStream){tpOcStream.getTracks().forEach(track=>{try{track.stop()}catch{}});tpOcStream=null;}
 const video=document.getElementById('tp-oc-video');if(video&&video.srcObject){try{video.pause()}catch{}video.srcObject=null;}
 tpOcSyncCameraUi(false);
 if(announce&&document.getElementById('tp-oc-camera-message'))tpOcSetMessage('دوربین خاموش شد و دریافت تصویر زنده متوقف شد.');
}
async function setOnlineCoachCameraFacing(mode){
 if(mode!=='user'&&mode!=='environment')return;tpOcFacing=mode;
 const back=document.getElementById('tp-oc-back-camera'),front=document.getElementById('tp-oc-front-camera');
 if(back)back.setAttribute('aria-pressed',String(mode==='environment'));if(front)front.setAttribute('aria-pressed',String(mode==='user'));
 if(tpOcStream){stopOnlineCoachCamera(false);await startOnlineCoachCamera();}
}
function disposeOnlineCoachInput(){stopOnlineCoachCamera(false);clearOnlineCoachFile();tpOcInputMode='live';}
addEventListener('pagehide',()=>disposeOnlineCoachInput());

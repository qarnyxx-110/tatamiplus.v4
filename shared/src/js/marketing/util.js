const $=s=>document.querySelector(s),F=n=>Number(n).toLocaleString('fa-IR');
const toast=(t,k='')=>{const e=$('#ts');e.textContent=t;e.className='tp-toast on '+k;clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),3000)};
// slug: حروف فارسی/لاتین/ارقام و خط‌تیره؛ نیم‌فاصله و فاصله ← خط‌تیره
const slugify=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s_]+/g,'-').replace(/[^\p{L}\p{N}-]+/gu,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const SLUG_RE=/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const faDT=s=>{try{return s?new Date(s).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'}):''}catch{return''}};
const cookie=n=>(document.cookie.split('; ').find(x=>x.startsWith(n+'='))||'').split('=')[1]||'';
const MEDIA_TYPES=['image/jpeg','image/png','image/webp'],MEDIA_MAX=2*1024*1024;
const mediaCheck=f=>!f?'فایلی انتخاب نشده است.':!MEDIA_TYPES.includes(f.type)?'فقط تصویر JPEG، PNG یا WebP مجاز است.':f.size>MEDIA_MAX?'حجم تصویر باید حداکثر ۲ مگابایت باشد.':'';
const ST={draft:['پیش‌نویس','m'],published:['منتشرشده','ok'],scheduled:['زمان‌بندی‌شده','g']};
const stTag=s=>`<span class="tag ${(ST[s]||['','m'])[1]}">${esc((ST[s]||[s])[0])}</span>`;

// تاریخ جلالی برای زمان‌بندی: فیلدهای روز/ماه/سال/ساعت، مقدار را به‌صورت زمان محلی YYYY-MM-DDTHH:MM در input پنهان #f-<k> می‌نویسند (قرارداد ذخیره بدون تغییر)
const g2j=(gy,gm,gd)=>{const g=[0,31,59,90,120,151,181,212,243,273,304,334],y2=gm>2?gy+1:gy;let d=355666+365*gy+~~((y2+3)/4)-~~((y2+99)/100)+~~((y2+399)/400)+gd+g[gm-1],jy=-1595+33*~~(d/12053);d%=12053;jy+=4*~~(d/1461);d%=1461;if(d>365){jy+=~~((d-1)/365);d=(d-1)%365}return d<186?[jy,1+~~(d/31),1+d%31]:[jy,7+~~((d-186)/30),1+(d-186)%30]};
const j2g=(jy,jm,jd)=>{jy+=1595;let d=-355668+365*jy+~~(jy/33)*8+~~((jy%33+3)/4)+jd+(jm<7?(jm-1)*31:(jm-7)*30+186),gy=400*~~(d/146097);d%=146097;if(d>36524){gy+=100*~~(--d/36524);d%=36524;if(d>=365)d++}gy+=4*~~(d/1461);d%=1461;if(d>365){gy+=~~((d-1)/365);d=(d-1)%365}let gd=d+1;const m=[0,31,(gy%4===0&&gy%100!==0)||gy%400===0?29:28,31,30,31,30,31,31,30,31,30,31];let gm=0;for(;gm<13&&gd>m[gm];gm++)gd-=m[gm];return[gy,gm,gd]};
const JM=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const p2=n=>String(n).padStart(2,'0');
const jdt=(k,iso)=>{const t=iso?new Date(iso):null,ok=t&&!isNaN(t),loc=ok?`${t.getFullYear()}-${p2(t.getMonth()+1)}-${p2(t.getDate())}T${p2(t.getHours())}:${p2(t.getMinutes())}`:'',j=ok?g2j(t.getFullYear(),t.getMonth()+1,t.getDate()):null,id='f-'+k;
 return`<div class="tp-jdt" role="group" aria-labelledby="${id}-l" data-k="${k}"><input id="${id}" class="tp-jdt-raw" type="datetime-local" tabindex="-1" aria-hidden="true" value="${loc}" oninput="jdtFromRaw('${k}')">
 <label class="tp-jdt-f"><span class="sm mu">روز</span><select data-p="d" onchange="jdtSync('${k}')"><option value="">—</option>${Array.from({length:31},(_,i)=>`<option value="${i+1}"${j&&j[2]==i+1?' selected':''}>${F(i+1)}</option>`).join('')}</select></label>
 <label class="tp-jdt-f"><span class="sm mu">ماه</span><select data-p="m" onchange="jdtSync('${k}')"><option value="">—</option>${JM.map((m,i)=>`<option value="${i+1}"${j&&j[1]==i+1?' selected':''}>${m}</option>`).join('')}</select></label>
 <label class="tp-jdt-f"><span class="sm mu">سال</span><input data-p="y" type="text" inputmode="numeric" maxlength="4" dir="ltr" autocomplete="off" placeholder="۱۴۰۵" value="${j?j[0]:''}" oninput="jdtSync('${k}')"></label>
 <label class="tp-jdt-f"><span class="sm mu">ساعت</span><input data-p="t" type="time" dir="ltr" value="${ok?loc.slice(11):''}" oninput="jdtSync('${k}')"></label>
 <button type="button" class="btn o s" onclick="jdtClear('${k}')">پاک کردن</button><p class="tp-hint" id="${id}-h" aria-live="polite">${ok?jdtLabel(j,loc.slice(11)):'زمانی انتخاب نشده است؛ با «انتشار» مقاله همین حالا منتشر می‌شود.'}</p></div>`};
const faD=s=>String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const jdtLabel=(j,tm)=>`انتشار در ${faD(j[2])} ${JM[j[1]-1]} ${faD(j[0])}، ساعت ${faD(tm||'00:00')}`;
const jdtEl=k=>document.querySelector(`.tp-jdt[data-k="${k}"]`),jdtP=(w,p)=>w.querySelector(`[data-p="${p}"]`);
function jdtSync(k){const w=jdtEl(k),raw=$('#f-'+k),h=$('#f-'+k+'-h'),d=+jdtP(w,'d').value,m=+jdtP(w,'m').value,y=+nz(jdtP(w,'y').value),tm=jdtP(w,'t').value||'00:00';
 if(!d||!m||!y){raw.value='';h.textContent=(d||m||y)?'روز، ماه و سال را کامل انتخاب کنید.':'زمانی انتخاب نشده است؛ با «انتشار» مقاله همین حالا منتشر می‌شود.';return}
 if(y<1400||y>1499||(m>6&&d>30)||(m===12&&d===30&&g2j(...j2g(y,12,30))[2]!==30)){raw.value='';h.textContent='این تاریخ معتبر نیست؛ لطفاً روز یا سال را اصلاح کنید.';return}
 const g=j2g(y,m,d);raw.value=`${g[0]}-${p2(g[1])}-${p2(g[2])}T${tm}`;h.textContent=jdtLabel([y,m,d],tm)}
function jdtFromRaw(k){const w=jdtEl(k),v=$('#f-'+k).value,t=v?new Date(v):null;if(!t||isNaN(t))return;const j=g2j(t.getFullYear(),t.getMonth()+1,t.getDate());jdtP(w,'d').value=j[2];jdtP(w,'m').value=j[1];jdtP(w,'y').value=j[0];jdtP(w,'t').value=v.slice(11,16);$('#f-'+k+'-h').textContent=jdtLabel(j,v.slice(11,16))}
function jdtClear(k){const w=jdtEl(k);['d','m','y','t'].forEach(p=>jdtP(w,p).value='');jdtSync(k)}

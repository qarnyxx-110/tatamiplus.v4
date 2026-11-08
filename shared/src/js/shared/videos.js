let vq='',vsort='',vsv=false,vopen=false,lw=L('lastWatched',null);
const pf=s=>String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]),tm=s=>{s=Math.round(s);return pf(String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'))};
const IL=['همه سطوح','مبتدی تا متوسط','متوسط تا پیشرفته','مبتدی','همه سطوح','پیشرفته'],VC=['تکنیک‌ها','خاک','تمرین','آمادگی مسابقه','بدنسازی'],VL=['مبتدی','متوسط','پیشرفته'];
V.forEach(v=>{v.nw=(v.id*7)%12;v.ds=`آموزش نمایشی «${v.t}» در دسته ${v.c} و مناسب سطح ${v.l}. این متن نمونه است و محتوای واقعی ویدیو هنوز متصل نشده.`});
const vimg=v=>ph(v.h,'تصویر نمونه','r169','videos/video-'+pad(v.id+1)+'.jpg',`تصویر شاخص ویدیوی ${v.t} با تدریس ${I[v.i].n}`);
const svb=v=>{const o=saved.includes(v.id);return`<button class="chip ${o?'on':''}" aria-pressed="${o}" aria-label="${o?'حذف از ذخیره‌شده‌ها':'ذخیره'}: ${v.t}" onclick="sv2(${v.id})">${o?'ذخیره‌شده ✓':'ذخیره'}</button>`};
function sv2(i){saved=saved.includes(i)?saved.filter(x=>x!=i):[...saved,i];save();R('x')}
const clrV=()=>{vq='';vcat='';vlev='';vsv=false;R('x')};
const vcard=v=>`<article class="card vcd"><a class="vt" href="#/video/${v.id}" aria-label="مشاهده ${v.t}">${vimg(v)}<span class="db">${F(v.d)} دقیقه</span></a><div class="b"><a href="#/video/${v.id}"><b>${v.t}</b></a><div class="mu sm"><a href="#/instructor/${v.i}">${I[v.i].n}</a> · ${F(v.v)} بازدید</div><div>${tg(v.c)} ${tg(v.l,lvCls(v.l)||'g')}</div>${prog[v.id]?bar(prog[v.id],'','پیشرفت تماشا: '+v.t):''}<div class="pa"><a class="btn s" href="#/video/${v.id}">مشاهده ویدیو</a>${svb(v)}</div></div></article>`;
function vupd(p){const v=V[lw];if(!v)return;prog[v.id]=p;save();const a=$('#tc'),b=$('#sk'),c=$('#pv'),d=$('#pbw');if(a)a.textContent=tm(v.d*60*p/100)+' / '+tm(v.d*60);if(b)b.value=p;if(c)c.textContent=F(p);if(d)d.innerHTML=bar(p,'','پیشرفت تماشا')}
function vset(p){vupd(p);R('x')}
function vplay(){toast('این یک پخش‌کننده نمونه است؛ ویدیوی واقعی متصل نشده.')}
function vfs(){const e=document.querySelector('.vp');try{e&&e.requestFullscreen?e.requestFullscreen().catch(()=>toast('تمام‌صفحه در این مرورگر در دسترس نیست.')):toast('تمام‌صفحه در این مرورگر در دسترس نیست.')}catch{}}
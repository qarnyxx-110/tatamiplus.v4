// مسیریابی پنل (هش‌محور) + دروازه ورود. مسیرها: #/، #/articles، #/articles/new، #/articles/<id>، #/tatamipedia[/new|/<id>]، #/tatamipedia-categories
const NF=()=>`<div class="mk-login">${tpState('error','صفحه پیدا نشد','آدرس معتبر نیست.','بازگشت به خلاصه','#/')}</div>`;
async function currentView(){const h=location.hash.replace(/^#\/?/,'').split('?')[0].split('/').filter((x,i,a)=>!(x===''&&i===a.length-1&&a.length>1)),k=h[0]||'',id=h[1];
 const need=p=>can(p)?null:shell(k,tpState('error','دسترسی ندارید','حساب شما مجوز این بخش را ندارد (دسترسی واقعی در بک‌اند کنترل می‌شود).','بازگشت','#/'));
 if(h.length>2)return NF();
 if(k==='')return h.length>1?NF():dashView();
 if(k==='articles'){if(id===undefined)return can('articles.manage')?articlesView():need('articles.manage');if(id==='new'||/^\d+$/.test(id))return need('articles.manage')||articleEditView(id);return NF()}
 if(k==='tatamipedia'){if(id===undefined)return can('glossary.manage')?termsView():need('glossary.manage');if(id==='new'||/^\d+$/.test(id))return need('glossary.manage')||termEditView(id);return NF()}
 if(k==='tatamipedia-categories'&&id===undefined)return need('glossary.manage')||termCatsView();
 return NF()}
let routeSeq=0;async function route(){const my=++routeSeq;if(!ME){try{ME=await DB.me()}catch(e){$('#app').innerHTML=`<div class="mk-login">${tpState('error','اتصال به سرور ممکن نیست',errText(e),'تلاش دوباره','javascript:route()')}</div>`;return}}
 if(!ME){$('#app').innerHTML=loginView();return}
 let html;try{html=await currentView()}catch(e){html=`<div class="mk-main">${tpState('error','بارگذاری ممکن نشد',errText(e),'تلاش دوباره','javascript:route()')}</div>`}
 if(my!==routeSeq)return;$('#app').innerHTML=html;scrollTo(0,0);document.title='پنل مارکتینگ | تاتامی پلاس';if($('#rte'))rteInit();
 const sd=$('#f-seo_description'),st=$('#f-seo_title');if(sd){const u=()=>{const c=$('#c-sd');c.textContent=F(sd.value.length)+' / ۱۶۰ نویسه (توصیه‌شده)';c.classList.toggle('over',sd.value.length>160)},v=()=>{const c=$('#c-st');c.textContent=F(st.value.length)+' / ۶۰ نویسه (توصیه‌شده)';c.classList.toggle('over',st.value.length>60)};sd.addEventListener('input',u);st.addEventListener('input',v);u();v()}
 const ti=$('#f-title'),sl=$('#f-slug');if(ti&&sl&&!AE.slugTouched){ti.addEventListener('input',()=>{if(!AE.slugTouched)sl.value=slugify(ti.value)});sl.addEventListener('input',()=>{AE.slugTouched=true})}}
addEventListener('hashchange',route);route();

// نمایش/مخفی‌کردن رمز عبور در فرم ورود پنل مارکتینگ.
function toggleMarketingPassword(button){const input=button.parentElement?.querySelector('input');if(!input)return;const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'پنهان':'نمایش';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',show?'مخفی‌کردن رمز عبور':'نمایش رمز عبور');input.focus({preventScroll:true})}

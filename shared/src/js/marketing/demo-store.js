// حالت نمایشی: داده فقط در localStorage همین مرورگر ذخیره می‌شود؛ بک‌اند، احراز هویت و مجوز واقعی وجود ندارد.
const Demo=(()=>{const K='tpcms:v1',now=()=>new Date().toISOString();let S=load();
 function seed(){const s={nid:{a:1,t:1,tc:1,ac:1},articles:[],terms:[],tcats:[],acats:[]};
  BL_SEED.forEach(a=>s.articles.push({...a,id:s.nid.a++}));[...new Set(BL_SEED.map(a=>a.category))].forEach(n=>s.acats.push({id:s.nid.ac++,name:n,slug:slugify(n)}));
  TPD_SEED.categories.forEach(c=>s.tcats.push({id:s.nid.tc++,slug:c.slug,name:c.name,name_ja:c.nameJa,romaji:c.romaji,order:c.order}));
  TPD_SEED.terms.forEach(t=>s.terms.push({id:s.nid.t++,slug:t.slug,name_fa:t.nameFa,name_ja:t.nameJa,romaji:t.romaji,meaning:t.meaning,description:t.description,usage:t.usage||'',safety:t.safety||'',categories:t.categories.slice(),related:t.related.slice(),featured:!!t.featured,status:t.status||'published',image_url:'',updated_at:now()}));
  persist(s);return s}
 function load(){try{const s=JSON.parse(localStorage.getItem(K));if(s&&['articles','terms','tcats','acats'].every(k=>Array.isArray(s[k]))&&s.nid)return s}catch{}return seed()}
 function persist(s){try{localStorage.setItem(K,JSON.stringify(s||S));return true}catch{throw{status:507,errors:{_:'حافظه مرورگر پر است؛ تصویر کوچک‌تری انتخاب کنید.'}}}}
 const page=(l,p)=>{const ps=Math.max(1,Math.min(100,+p.page_size||10)),pg=Math.max(1,+p.page||1);return{count:l.length,results:l.slice((pg-1)*ps,pg*ps)}};
 const eff=a=>a.status==='scheduled'&&a.publish_at&&new Date(a.publish_at)<=new Date()?{...a,status:'published'}:a;
 const bad=(f,m)=>{throw{status:400,errors:{[f]:m}}};
 const need=(o,keys)=>keys.forEach(k=>{if(!String(o[k]||'').trim())bad(k,'این فیلد الزامی است.')});
 return{mode:'demo',
 async me(){if(sessionStorage.getItem('tpcms:demo-login')!=='1')return null;return{username:'demo',display_name:'کاربر نمایشی',permissions:['articles.manage','articles.delete','glossary.manage','glossary.delete','media.upload']}},
 async login(){sessionStorage.setItem('tpcms:demo-login','1');return this.me()},async logout(){sessionStorage.removeItem('tpcms:demo-login')},
 async listArticles(p={}){const n=nz(p.q||'');let l=S.articles.map(eff).filter(a=>(!p.status||a.status===p.status)&&(!p.category||a.category===p.category)&&(!n||nz(a.title+' '+a.excerpt+' '+a.category).includes(n)));l.sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));return page(l,p)},
 async getArticle(id){const a=S.articles.find(x=>x.id==id);if(!a)throw{status:404,errors:{_:'مقاله پیدا نشد.'}};return eff(a)},
 async saveArticle(d){need(d,['title','slug']);if(!SLUG_RE.test(d.slug))bad('slug','نشانی کوتاه فقط شامل حرف، عدد و خط‌تیره باشد.');if(S.articles.some(a=>a.slug===d.slug&&a.id!=d.id))bad('slug','این نشانی کوتاه قبلاً استفاده شده است.');
  const o={...d,body_html:sanitizeHtml(d.body_html),tags:(d.tags||[]).slice(0,10),updated_at:now()};
  if(d.id){const i=S.articles.findIndex(a=>a.id==d.id);if(i<0)throw{status:404,errors:{_:'مقاله پیدا نشد.'}};o.status=S.articles[i].status;o.published_at=S.articles[i].published_at;o.publish_at=S.articles[i].publish_at;S.articles[i]=o}
  else{o.id=S.nid.a++;o.status='draft';o.published_at=null;o.publish_at=null;S.articles.push(o)}
  if(o.category&&!S.acats.some(c=>c.name===o.category))S.acats.push({id:S.nid.ac++,name:o.category,slug:slugify(o.category)});persist();return o},
 async publish(id,publish_at){const a=await this.getArticle(id),i=S.articles.findIndex(x=>x.id==id),t=publish_at?new Date(publish_at):null;if(t&&isNaN(t))bad('publish_at','زمان نامعتبر است.');
  if(t&&t>new Date()){S.articles[i]={...S.articles[i],status:'scheduled',publish_at:t.toISOString()}}else{S.articles[i]={...S.articles[i],status:'published',publish_at:null,published_at:S.articles[i].published_at||now()}}persist();return S.articles[i]},
 async unpublish(id){const i=S.articles.findIndex(x=>x.id==id);if(i<0)throw{status:404,errors:{_:'مقاله پیدا نشد.'}};S.articles[i]={...S.articles[i],status:'draft',publish_at:null};persist();return S.articles[i]},
 async deleteArticle(id){S.articles=S.articles.filter(a=>a.id!=id);persist()},
 async articleCategories(){return S.acats.slice()},
 async uploadMedia(file){const err=mediaCheck(file);if(err)bad('file',err);
  const url=await new Promise((ok,no)=>{const r=new FileReader();r.onerror=()=>no({status:400,errors:{file:'خواندن فایل ممکن نشد.'}});r.onload=()=>{const im=new Image();im.onerror=()=>no({status:400,errors:{file:'فایل تصویر معتبر نیست.'}});im.onload=()=>{const s=Math.min(1,1280/im.width),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.8))};im.src=r.result};r.readAsDataURL(file)});return{id:'demo-'+Date.now(),url}},
 async listTerms(p={}){const n=nz(p.q||'');let l=S.terms.filter(t=>(!p.status||t.status===p.status)&&(!p.category||t.categories.includes(p.category))&&(!n||nz([t.name_fa,t.name_ja,t.romaji,t.meaning].join(' ')).includes(n)));l.sort((a,b)=>a.romaji.localeCompare(b.romaji));return page(l,p)},
 async getTerm(id){const t=S.terms.find(x=>x.id==id);if(!t)throw{status:404,errors:{_:'اصطلاح پیدا نشد.'}};return t},
 async saveTerm(d){need(d,['name_fa','romaji','meaning','slug']);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug))bad('slug','نشانی کوتاه اصطلاح فقط حروف کوچک لاتین، عدد و خط‌تیره باشد.');if(S.terms.some(t=>t.slug===d.slug&&t.id!=d.id))bad('slug','این نشانی کوتاه قبلاً استفاده شده است.');
  const o={...d,related:(d.related||[]).filter(r=>r!==d.slug),updated_at:now()};if(d.id){const i=S.terms.findIndex(t=>t.id==d.id);if(i<0)throw{status:404,errors:{_:'اصطلاح پیدا نشد.'}};S.terms[i]=o}else{o.id=S.nid.t++;S.terms.push(o)}persist();return o},
 async deleteTerm(id){S.terms=S.terms.filter(t=>t.id!=id);S.terms.forEach(t=>t.related=t.related.filter(r=>S.terms.some(x=>x.slug===r)));persist()},
 async listTermCats(){return S.tcats.slice().sort((a,b)=>a.order-b.order)},
 async saveTermCat(d){need(d,['name','slug']);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug))bad('slug','نشانی کوتاه فقط حروف کوچک لاتین، عدد و خط‌تیره باشد.');if(S.tcats.some(c=>c.slug===d.slug&&c.id!=d.id))bad('slug','این نشانی کوتاه قبلاً استفاده شده است.');
  const o={id:d.id,slug:d.slug,name:d.name,name_ja:d.name_ja||'',romaji:d.romaji||'',order:+d.order||0};if(d.id){const i=S.tcats.findIndex(c=>c.id==d.id);S.tcats[i]=o}else{o.id=S.nid.tc++;S.tcats.push(o)}persist();return o},
 async deleteTermCat(id){const c=S.tcats.find(x=>x.id==id);if(c&&S.terms.some(t=>t.categories.includes(c.slug)))bad('_','این دسته هنوز اصطلاح دارد و حذف نمی‌شود.');S.tcats=S.tcats.filter(x=>x.id!=id);persist()},
 reset(){localStorage.removeItem(K);S=load()}}})();

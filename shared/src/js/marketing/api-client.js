// کلاینت API واقعی (قرارداد: docs/API_CONTRACT.md). نشست با Cookie و CSRF؛ مجوزها همیشه در بک‌اند اعمال می‌شوند.
const Api=(()=>{const B=TP_CMS.apiBase;
 async function req(m,p,body,isForm){const h={Accept:'application/json'};if(m!=='GET')h['X-CSRFToken']=cookie('csrftoken');if(body&&!isForm)h['Content-Type']='application/json';
  let r;try{r=await fetch(B+p,{method:m,headers:h,credentials:'same-origin',body:body?(isForm?body:JSON.stringify(body)):undefined})}catch{throw{status:0,errors:{_:'ارتباط با سرور برقرار نشد.'}}}
  if(r.status===204)return null;let j=null;try{j=await r.json()}catch{}
  if(!r.ok){const e=j&&(j.errors||j.detail);throw{status:r.status,errors:typeof e==='object'&&e?e:{_:e||'خطای ناشناخته از سرور ('+r.status+')'}}}return j}
 const qs=p=>{const u=new URLSearchParams();for(const[k,v]of Object.entries(p||{}))if(v!==''&&v!=null)u.set(k,v);const s=u.toString();return s?'?'+s:''};
 return{mode:'api',
 async me(){try{return(await req('GET','/auth/me')).user}catch(e){if(e.status===401||e.status===403)return null;throw e}},
 async login(u,p){return(await req('POST','/auth/login',{username:u,password:p})).user},async logout(){await req('POST','/auth/logout')},
 listArticles:p=>req('GET','/cms/articles'+qs(p)),getArticle:id=>req('GET','/cms/articles/'+id),
 saveArticle:d=>d.id?req('PUT','/cms/articles/'+d.id,d):req('POST','/cms/articles',d),
 publish:(id,at)=>req('POST','/cms/articles/'+id+'/publish',at?{publish_at:at}:{}),unpublish:id=>req('POST','/cms/articles/'+id+'/unpublish',{}),deleteArticle:id=>req('DELETE','/cms/articles/'+id),
 async articleCategories(){return(await req('GET','/cms/article-categories')).results},
 uploadMedia(file){const f=new FormData();f.append('file',file);return req('POST','/cms/media',f,true)},
 listTerms:p=>req('GET','/cms/glossary/terms'+qs(p)),getTerm:id=>req('GET','/cms/glossary/terms/'+id),saveTerm:d=>d.id?req('PUT','/cms/glossary/terms/'+d.id,d):req('POST','/cms/glossary/terms',d),deleteTerm:id=>req('DELETE','/cms/glossary/terms/'+id),
 async listTermCats(){return(await req('GET','/cms/glossary/categories')).results},saveTermCat:d=>d.id?req('PUT','/cms/glossary/categories/'+d.id,d):req('POST','/cms/glossary/categories',d),deleteTermCat:id=>req('DELETE','/cms/glossary/categories/'+id)}})();
const DB=TP_CMS.mode==='api'?Api:Demo;

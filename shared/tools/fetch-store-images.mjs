// دریافت تصاویر محصولات کاتالوگ کارفرما (نیازمند اینترنت؛ در محیط ساخت این پروژه اینترنت نبود پس اجرا نشده است).
// اجرا (داخل پوشه shared):  node tools/fetch-store-images.mjs   سپس:  OUT=.. node build.js
// ⚠️ مجوز: تصاویر متعلق به فروشندگان/بازارگاه‌های منبع (ترب/دیجی‌کالا) هستند. پیش از انتشار از کارفرما بخواهید مجوز استفاده یا تصویر اختصاصی تهیه کند.
import fs from 'node:fs';import path from 'node:path';
const items=JSON.parse(fs.readFileSync('src/data/store-products.json','utf8')),dir='public/assets/images',force=process.argv.includes('--force');
const man=path.join(dir,'manifest.json'),m=JSON.parse(fs.readFileSync(man,'utf8'));let ok=0,skip=0,fail=[];
for(const it of items){const f=path.join(dir,it.slot);fs.mkdirSync(path.dirname(f),{recursive:true});
 m[it.slot]={license:'نامشخص — تصویر فروشنده در '+(it.source==='torob'?'ترب':'دیجی‌کالا')+'؛ پیش از انتشار مجوز لازم است',source:it.sourceUrl,photographer:'',alt:it.name};
 if(fs.existsSync(f)&&!force){skip++;continue}
 let done=false;for(let a=0;a<3&&!done;a++){try{const r=await fetch(it.imageUrl,{headers:{'User-Agent':'Mozilla/5.0'}});if(!r.ok)throw new Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length<500)throw new Error('فایل بسیار کوچک');fs.writeFileSync(f,b);done=true;ok++}catch(e){if(a===2)fail.push(it.sku+' '+e.message);else await new Promise(r=>setTimeout(r,800*(a+1)))}}
 await new Promise(r=>setTimeout(r,250))}
fs.writeFileSync(man,JSON.stringify(m,null,1));
console.log(`دریافت شد: ${ok} · رد شد (موجود): ${skip} · ناموفق: ${fail.length}`);if(fail.length)console.log(fail.join('\n'));process.exit(fail.length?1:0);

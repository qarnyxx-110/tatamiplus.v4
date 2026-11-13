import { Suite, serve, build, wait } from './helpers.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function runCheckout(_base,browser){
  const S=new Suite('Preview checkout: cart → account → address → review');
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'tatami-checkout-'));
  build(out);
  const srv=await serve(path.join(out,'preview'));
  const ctx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const pg=await ctx.newPage(),errors=[];
  pg.on('pageerror',e=>errors.push(String(e)));
  try{
    await pg.goto(srv.url+'/index.html');
    await wait(250);

    const picked=await pg.evaluate(()=>{const i=P.findIndex(p=>p.st>0&&(!p.sz||!p.sz.length)&&(!p.cl||!p.cl.length));return i<0?null:{id:i,name:P[i].n}});
    if(!picked)throw new Error('No in-stock product without variant options was found for the checkout test');
    await pg.evaluate(id=>{location.hash='#/product/'+id},picked.id);
    await pg.waitForSelector('#app .pd');
    const countBeforeFlight=await pg.locator('#cc').innerText();
    await pg.evaluate(()=>{
      const icon=document.querySelector('#hcart .tp-ico');
      window.__tpCartReceiveMotion=false;
      if(icon)new MutationObserver(()=>{
        if(icon.classList.contains('tp-cart-icon-receive'))window.__tpCartReceiveMotion=true;
      }).observe(icon,{attributes:true,attributeFilter:['class']});
    });
    const flightStartedAt=Date.now();
    await pg.locator('#pd-add').click();
    await pg.waitForSelector('.tp-cart-fly',{state:'attached',timeout:3000});
    S.ok('پس از افزودن موفق، نسخه موقت تصویر محصول برای حرکت به سبد ساخته می‌شود',
      await pg.locator('.tp-cart-fly').count()===1);
    await pg.waitForFunction(id=>location.hash==='#/product/'+id&&cart.length>0,picked.id);
    S.ok('شمارنده تا لحظه رسیدن تصویر، مقدار قبلی را حفظ می‌کند',
      (await pg.locator('#cc').innerText())===countBeforeFlight);
    S.ok('دکمه افزودن در طول حرکت برای جلوگیری از ثبت تکراری غیرفعال است',
      await pg.locator('#pd-add').isDisabled()&&await pg.locator('#pd-add').getAttribute('aria-busy')==='true');
    await pg.evaluate(()=>addP());
    S.ok('درخواست افزودن تکراری در زمان اجرای انیمیشن نادیده گرفته می‌شود',
      await pg.evaluate(()=>cart.length===1&&cart[0].q===1));
    await pg.waitForFunction(()=>document.querySelector('#ts')?.classList.contains('on')&&document.querySelector('#ts')?.textContent.includes('با موفقیت به سبد خرید اضافه شد.'));
    const flightElapsed=Date.now()-flightStartedAt;
    S.ok('حرکت آهسته‌تر از نسخه قبلی و در بازه طبیعی اجرا می‌شود',
      flightElapsed>=1000&&flightElapsed<5000, 'elapsed='+flightElapsed+'ms');
    S.ok('پس از افزودن، مشتری در صفحه همان محصول باقی می‌ماند',
      await pg.evaluate(id=>location.hash==='#/product/'+id,picked.id));
    S.ok('شمارنده سبد پس از رسیدن تصویر با مقدار صحیح نمایش داده می‌شود',
      (await pg.locator('#cc').innerText()).trim()==='۱');
    S.ok('آیکون سبد هنگام دریافت محصول واکنش ظریف نشان می‌دهد',
      await pg.evaluate(()=>window.__tpCartReceiveMotion===true));
    S.ok('پیام موفقیت پس از پایان حرکت محصول نمایش داده می‌شود',
      (await pg.locator('#ts').innerText()).includes('با موفقیت به سبد خرید اضافه شد.'));
    S.ok('دکمه پس از پایان تعامل دوباره فعال می‌شود',
      !(await pg.locator('#pd-add').isDisabled())&&await pg.locator('#pd-add').getAttribute('aria-busy')===null);
    await pg.waitForFunction(()=>!document.querySelector('.tp-cart-fly'),undefined,{timeout:3000});
    await pg.evaluate(()=>{location.hash='#/cart'});
    await pg.waitForFunction(()=>location.hash==='#/cart'&&document.querySelector('#app .cl2 a[href="#/checkout"]')?.textContent.trim()==='ادامه خرید');

    const continueButton=pg.locator('#app a[href="#/checkout"]');
    const continueCount=await continueButton.count();
    const continueText=continueCount===1?await continueButton.innerText():'';
    const storeLinkCount=await pg.locator('#app a[href="#/store"]').count();
    S.ok('در سبد فقط یک دکمه «ادامه خرید» وجود دارد و دکمه تکراری حذف شده است',
      continueCount===1 && continueText==='ادامه خرید' && storeLinkCount===0,
      `checkout CTA count=${continueCount}; text=${JSON.stringify(continueText)}; store links=${storeLinkCount}`);
    S.ok('دکمه «ادامه خرید» رنگ اصلی قبلی را حفظ می‌کند',
      await continueButton.getAttribute('class')==='btn');
    await continueButton.click();
    await pg.waitForSelector('.tp-checkout-auth');
    S.ok('مهمان برای ورود به مرحله نشانی به ورود/ثبت‌نام هدایت می‌شود',
      await pg.locator('.tp-checkout-auth a[href^="#/login?next="]').count()===1 &&
      await pg.locator('.tp-checkout-auth a[href^="#/register?next="]').count()===1);

    await pg.locator('.tp-checkout-auth a[href^="#/register?next="]').click();
    await pg.waitForSelector('#rg-f');
    const username='checkoutqa'+Date.now().toString(36);
    await pg.fill('#rg-u',username);
    await pg.fill('#rg-p1','TatamiPlus!Checkout2026');
    await pg.fill('#rg-p2','TatamiPlus!Checkout2026');
    await pg.locator('#rg-f button[type="submit"]').click();
    await pg.waitForFunction(()=>location.hash.split('?')[0]==='#/checkout',undefined,{timeout:7000});
    await pg.waitForSelector('#co-form');
    S.ok('پس از ثبت‌نام، کاربر به مرحله خرید بازمی‌گردد',
      (await pg.locator('#app').innerText()).includes('اطلاعات گیرنده و نشانی'));

    await pg.locator('#co-form button[type="submit"]').click();
    S.ok('فیلدهای ضروری نشانی اعتبارسنجی و کنار فیلد علامت‌گذاری می‌شوند',
      await pg.locator('#co-name[aria-invalid="true"]').count()===1 &&
      await pg.locator('#co-phone[aria-invalid="true"]').count()===1 &&
      await pg.locator('#co-postal[aria-invalid="true"]').count()===1);

    await pg.fill('#co-name','کاربر آزمایشی تاتامی');
    await pg.fill('#co-phone','۰۹۱۲۳۴۵۶۷۸۹');
    await pg.fill('#co-province','تهران');
    await pg.fill('#co-city','تهران');
    await pg.fill('#co-postal','۱۲۳۴۵۶۷۸۹۰');
    await pg.fill('#co-address','تهران، خیابان نمونه، کوچه آزمایش، پلاک ۱۲، واحد ۳');
    await pg.fill('#co-notes','تحویل در ساعات عصر');
    await pg.locator('#co-form button[type="submit"]').click();
    await pg.waitForSelector('.tp-checkout-blocked');
    S.ok('اطلاعات نشانی و گیرنده در مرحله بازبینی نمایش داده می‌شوند',
      (await pg.locator('#app').innerText()).includes('کاربر آزمایشی تاتامی') &&
      (await pg.locator('#app').innerText()).includes('تهران، خیابان نمونه'));
    S.ok('اقلام باقی‌مانده در سبد در بازبینی نمایش داده می‌شوند',
      (await pg.locator('#app').innerText()).includes(picked.name));
    S.ok('مرحله پرداخت تا اتصال واقعی بک‌اند غیرفعال است',
      await pg.locator('.tp-checkout-blocked button[disabled]').count()===1);
    S.ok('هیچ سفارش آزمایشی/کد رهگیری ذخیره نمی‌شود',
      await pg.evaluate(()=>localStorage.getItem('tp:orders'))===null);
    S.ok('سبد خرید بعد از بازبینی خالی یا حذف نمی‌شود',
      await pg.locator('#app .tp-checkout').count()===1 &&
      await pg.evaluate(()=>cart.length)>0);

    await pg.locator('button[onclick="checkoutBack()"]').first().click();
    S.ok('بازگشت برای ویرایش نشانی اطلاعات واردشده را نگه می‌دارد',
      await pg.inputValue('#co-name')==='کاربر آزمایشی تاتامی');

    for(const width of [320,360,390]){
      await pg.setViewportSize({width,height:850});
      await wait(80);
      const overflow=await pg.evaluate(()=>({
        page:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
        form:document.querySelector('#co-form').getBoundingClientRect().right>document.documentElement.clientWidth+1
      }));
      S.ok('فرم اطلاعات ارسال در عرض '+width+'px بدون سرریز افقی',!overflow.page&&!overflow.form,JSON.stringify(overflow));
    }

    await pg.evaluate(()=>doLogout());
    S.ok('خروج از حساب، اطلاعات شخصی Checkout را پاک می‌کند',
      await pg.evaluate(()=>ME===null&&['name','phone','province','city','postal','address','notes'].every(k=>CHECKOUT[k]==='')&&CHECKOUT.delivery==='standard'&&CHECKOUT.step===0));

    await pg.evaluate(()=>Object.assign(CHECKOUT,{name:'نشانی کاربر قبلی',phone:'09123456789',province:'تهران',city:'تهران',postal:'1234567890',address:'نشانی آزمایشی کاربر قبلی',notes:'یادداشت قبلی'}));
    await pg.evaluate(id=>{location.hash='#/product/'+id},picked.id);
    await pg.waitForSelector('#app .pd');
    await pg.locator('#pd-add').click();
    await pg.waitForFunction(()=>document.querySelector('#ts')?.classList.contains('on')&&document.querySelector('#ts')?.textContent.includes('با موفقیت به سبد خرید اضافه شد.'));
    await pg.evaluate(()=>{location.hash='#/cart'});
    await pg.waitForFunction(()=>location.hash==='#/cart'&&document.querySelector('#app a[href="#/checkout"]'));
    await pg.locator('#app a[href="#/checkout"]').click();
    await pg.waitForSelector('.tp-checkout-auth');
    S.ok('شروع خرید جدید، نشانی باقی‌مانده از نشست قبلی را پاک می‌کند',
      await pg.evaluate(()=>['name','phone','province','city','postal','address','notes'].every(k=>CHECKOUT[k]==='')&&CHECKOUT.delivery==='standard'&&CHECKOUT.step===0));

    await pg.evaluate(()=>Object.assign(CHECKOUT,{name:'نشانی حساب قبلی',phone:'09123456789',province:'البرز',city:'کرج',postal:'1234567890',address:'نشانی آزمایشی حساب قبلی',notes:'یادداشت حساب قبلی'}));
    await pg.locator('.tp-checkout-auth a[href^="#/register?next="]').click();
    await pg.waitForSelector('#rg-f');
    const username2='checkoutqa2'+Date.now().toString(36);
    await pg.fill('#rg-u',username2);
    await pg.fill('#rg-p1','TatamiPlus!Checkout2026');
    await pg.fill('#rg-p2','TatamiPlus!Checkout2026');
    await pg.locator('#rg-f button[type="submit"]').click();
    await pg.waitForSelector('#co-form');
    S.ok('ورود به حساب جدید، اطلاعات نشانی حساب قبلی را منتقل نمی‌کند',
      await pg.evaluate(()=>['name','phone','province','city','postal','address','notes'].every(k=>CHECKOUT[k]==='')&&CHECKOUT.delivery==='standard'&&CHECKOUT.step===0)&&
      await pg.inputValue('#co-name')==='');

    // Regression: انتخاب سایز/رنگ اجباری هنوز پیش از افزودن اعتبارسنجی می‌شود.
    const variantCtx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',reducedMotion:'no-preference'});
    const variantPg=await variantCtx.newPage();
    variantPg.on('pageerror',e=>errors.push(String(e)));
    await variantPg.goto(srv.url+'/index.html');
    await wait(180);
    const variant=await variantPg.evaluate(()=>{const p=P.find(x=>x.st>0&&(x.sz.length||x.cl.length));return p?{id:p.id,hasSize:p.sz.length>0,hasColor:p.cl.length>0}:null});
    if(variant){
      await variantPg.evaluate(id=>{location.hash='#/product/'+id},variant.id);
      await variantPg.waitForSelector('#pd-add');
      await variantPg.locator('#pd-add').click();
      S.ok('بدون انتخاب ویژگی اجباری، محصول به سبد اضافه نمی‌شود',
        await variantPg.evaluate(()=>cart.length===0)&&await variantPg.locator('#pd-sz-err,#pd-cl-err').count()>0);
      if(variant.hasSize)await variantPg.locator('#pd-sz .chip').first().click();
      if(variant.hasColor)await variantPg.locator('#pd-cl .chip').first().click();
      await variantPg.locator('#pd-add').click();
      await variantPg.waitForSelector('.tp-cart-fly',{state:'attached',timeout:3000});
      await variantPg.waitForFunction(()=>cart.length===1&&document.querySelector('#ts')?.classList.contains('on')&&document.querySelector('#ts')?.textContent.includes('با موفقیت به سبد خرید اضافه شد.'));
      const chosen=await variantPg.evaluate(()=>cart[0]);
      S.ok('پس از انتخاب ویژگی‌ها، همان سایز و رنگ وارد سبد می‌شوند',
        (!variant.hasSize||!!chosen.s)&&(!variant.hasColor||!!chosen.c),
        JSON.stringify({size:chosen.s,color:chosen.c}));
    }else{
      S.ok('محصول دارای تنوع برای تست انتخاب سایز/رنگ پیدا شد',false);
    }
    await variantCtx.close();

    // Regression: تنظیم کاهش حرکت، انیمیشن را حذف می‌کند اما عملیات سبد را سالم نگه می‌دارد.
    const reducedCtx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
    const reducedPg=await reducedCtx.newPage();
    reducedPg.on('pageerror',e=>errors.push(String(e)));
    await reducedPg.goto(srv.url+'/index.html');
    await wait(180);
    await reducedPg.evaluate(id=>{location.hash='#/product/'+id},picked.id);
    await reducedPg.waitForSelector('#pd-add');
    await reducedPg.locator('#pd-add').click();
    await reducedPg.waitForFunction(()=>document.querySelector('#ts')?.classList.contains('on')&&document.querySelector('#ts')?.textContent.includes('با موفقیت به سبد خرید اضافه شد.'));
    S.ok('در حالت کاهش حرکت، پرواز تصویر اجرا نمی‌شود اما افزودن محصول موفق است',
      await reducedPg.locator('.tp-cart-fly').count()===0&&
      (await reducedPg.locator('#cc').innerText()).trim()==='۱'&&
      await reducedPg.evaluate(()=>cart.length===1));
    await reducedCtx.close();

    S.ok('بدون خطای JavaScript در فلوی خرید',errors.length===0,errors.join(' | '));
  }catch(e){
    S.ok('اجرای کامل سناریوی خرید',false,e&&e.stack?e.stack:String(e));
  }finally{
    await ctx.close();
    await srv.close();
  }
  return S;
}

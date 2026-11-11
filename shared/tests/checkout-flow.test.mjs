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
    await pg.locator('#app .pd .pa button.btn').first().click();
    await pg.waitForFunction(()=>location.hash==='#/cart'&&cart.length>0&&document.querySelector('#app .cl2 a[href="#/checkout"]')?.textContent.trim()==='ادامه خرید');
    S.ok('افزودن محصول به سبد از صفحه محصول انجام می‌شود',
      await pg.evaluate(()=>cart.length)>0);

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
    await pg.locator('#app .pd .pa button.btn').first().click();
    await pg.waitForFunction(()=>location.hash==='#/cart'&&cart.length>0);
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

    S.ok('بدون خطای JavaScript در فلوی خرید',errors.length===0,errors.join(' | '));
  }catch(e){
    S.ok('اجرای کامل سناریوی خرید',false,e&&e.stack?e.stack:String(e));
  }finally{
    await ctx.close();
    await srv.close();
  }
  return S;
}

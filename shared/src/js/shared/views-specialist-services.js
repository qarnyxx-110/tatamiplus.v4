// صفحات مقدماتی خدمات تخصصی. ارائه‌دهندگان و درخواست نوبت تا آماده‌شدن API واقعی نمایش داده نمی‌شوند.
const SPECIALIST_SERVICE_CATEGORIES=[
 {route:'nutrition-coaches',title:'مربیان تغذیه',description:'معرفی مربیان و متخصصان تغذیه ورزشی برای ورزشکاران جودو.'},
 {route:'sports-clinics',title:'کلینیک‌های ورزشی',description:'معرفی کلینیک‌ها و خدمات تخصصی مرتبط با سلامت و آمادگی ورزشی.'},
 {route:'sports-psychologists',title:'روان‌شناسی ورزشی',description:'معرفی متخصصان روان‌شناسی ورزشی و پشتیبانی ذهنی ورزشکاران.'}
];
function specialistCategoryPage(route){
 const item=SPECIALIST_SERVICE_CATEGORIES.find(x=>x.route===route);
 if(!item)return nfp('خدمت تخصصی پیدا نشد','#/specialist-services','مشاهده خدمات تخصصی');
 PT={t:item.title,d:item.description};
 return '<div class="w tp-services"><nav class="tp-service-crumb" aria-label="مسیر صفحه"><a href="#/">خانه</a><span aria-hidden="true">/</span><a href="#/specialist-services">خدمات تخصصی</a><span aria-hidden="true">/</span><span aria-current="page">'+item.title+'</span></nav>'+
 '<h1>'+item.title+'</h1><p class="mu">'+item.description+'</p>'+
 '<div class="warn" role="note">فهرست واقعی این خدمت هنوز از سامانه مدیریت Django ارائه نشده است. هیچ نام، تصویر، مرکز، تخصص، شماره تماس یا ارائه‌دهنده نمونه‌ای ساخته نشده است.</div>'+
 '<section class="tp-service-empty" role="status"><h2>اطلاعات ارائه‌دهندگان هنوز در دسترس نیست</h2><p>پس از آماده‌شدن مدل‌ها و مسیرهای بک‌اند، فهرست فعال، جست‌وجو، فیلتر شهر و تخصص و صفحه جزئیات از داده‌های واقعی سامانه نمایش داده می‌شود.</p></section>'+
 '<a class="btn o" href="#/specialist-services">بازگشت به خدمات تخصصی</a></div>';
}
Object.assign(views,{
 'specialist-services':()=>{
  PT={t:'خدمات تخصصی',d:'خدمات تخصصی تغذیه، کلینیک‌های ورزشی و روان‌شناسی ورزشی.'};
  return '<div class="w tp-services"><h1>خدمات تخصصی</h1><p class="mu">سه حوزه تخصصی موردنیاز ورزشکاران جودو.</p><div class="grid">'+
  SPECIALIST_SERVICE_CATEGORIES.map(x=>'<a class="card b" href="#/'+x.route+'"><b class="gold">'+x.title+'</b><p class="mu">'+x.description+'</p><span class="btn s o">مشاهده بخش</span></a>').join('')+
  '</div><div class="warn" role="note">اطلاعات متخصصان و مراکز باید از سامانه مدیریت دریافت شود. اتصال بک‌اند این سه خدمت هنوز آماده نشده است؛ بنابراین هیچ پروفایل یا درخواست نوبت ساختگی نمایش داده نمی‌شود.</div></div>';
 },
 'nutrition-coaches':()=>specialistCategoryPage('nutrition-coaches'),
 'sports-clinics':()=>specialistCategoryPage('sports-clinics'),
 'sports-psychologists':()=>specialistCategoryPage('sports-psychologists')
});
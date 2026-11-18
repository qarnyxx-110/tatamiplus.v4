// Read-only market-reference catalogue for the Django storefront.
// It never writes inventory, prices, orders or cart contents.
(() => {
  'use strict';

  const root = document.querySelector('[data-reference-store]');
  if (!root) return;

  const form = root.closest('form.tp-store-filter');
  const emptyState = form && form.querySelector('[data-live-store-empty]');
  const search = root.querySelector('[data-reference-search]');
  const category = root.querySelector('[data-reference-category]');
  const grid = root.querySelector('[data-reference-grid]');
  const count = root.querySelector('[data-reference-count]');
  const pagination = root.querySelector('[data-reference-pagination]');
  const pageLabel = root.querySelector('[data-reference-page-label]');
  const pageSize = 12;

  const faNumber = value => Number(value || 0).toLocaleString('fa-IR');
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  function addReferenceCard(product) {
    const card = make('article', 'card pcd tp-product-card tp-reference-product-card');
    const figure = make('div', 'ph r43 tp-reference-media-placeholder');
    figure.append(make('span', '', 'تصویر پس از تأیید مجوز منتشر می‌شود'));

    const body = make('div', 'b');
    body.append(make('div', 'mu sm', product.category || 'تجهیزات جودو'));
    body.append(make('h3', '', product.name || 'محصول بدون نام'));
    body.append(make('span', 'tag m', 'قیمت مرجع بازار · غیرقابل خرید'));
    body.append(make('div', 'tp-price', faNumber(product.reference_price) + ' تومان'));
    if (product.group) body.append(make('p', 'mu sm', product.group));
    if (product.level) body.append(make('p', 'mu sm', 'سطح پیشنهادی ثبت‌شده: ' + product.level));

    const details = make('details', 'tp-reference-details');
    details.append(make('summary', '', 'مشاهده اطلاعات مرجع'));
    const description = make('div', 'tp-reference-details-body');
    if (product.sizes && product.sizes.length) {
      description.append(make('p', '', 'سایزهای درج‌شده: ' + product.sizes.join('، ')));
    }
    if (product.size_estimated) {
      description.append(make('p', 'tp-reference-warning-text', 'سایز این مورد در منبع اولیه تخمینی بوده و باید تأیید شود.'));
    }
    if (product.colors && product.colors.length) {
      description.append(make('p', '', 'رنگ‌های درج‌شده: ' + product.colors.join('، ')));
    }
    description.append(make('p', '', 'تاریخ مرجع قیمت: ' + (product.price_date || 'ثبت نشده')));
    description.append(make('p', 'tp-reference-warning-text', 'قیمت فروش و موجودی تاتامی پلاس برای این مورد ثبت نشده است.'));
    details.append(description);
    body.append(details);

    card.append(figure, body);
    return card;
  }

  function update() {
    const term = String(search.value || '').trim().toLocaleLowerCase('fa');
    const selectedCategory = category.value;
    const matches = products.filter((product) => {
      const searchable = [product.name, product.category, product.group, product.level].join(' ').toLocaleLowerCase('fa');
      return (!term || searchable.includes(term)) &&
        (!selectedCategory || product.category === selectedCategory);
    });
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    currentPage = Math.max(1, Math.min(currentPage, pages));
    const pageItems = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    grid.replaceChildren(...pageItems.map(addReferenceCard));
    count.textContent = faNumber(matches.length) + ' مورد مرجع';
    pagination.hidden = matches.length <= pageSize;
    pageLabel.textContent = 'صفحه ' + faNumber(currentPage) + ' از ' + faNumber(pages);
    pagination.querySelectorAll('[data-reference-page]').forEach((button) => {
      const delta = Number(button.dataset.referencePage);
      button.disabled = delta < 0 ? currentPage <= 1 : currentPage >= pages;
    });
  }

  let products = [];
  let currentPage = 1;

  async function start() {
    try {
      const response = await fetch(root.dataset.catalogUrl, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('catalog unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload.products) || !payload.products.length) throw new Error('catalog empty');
      products = payload.products;
      const initialQuery = root.dataset.initialQuery || '';
      search.value = initialQuery;
      [...new Set(products.map((item) => item.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa')).forEach((name) => {
        category.append(make('option', '', name));
        category.lastElementChild.value = name;
      });

      root.hidden = false;
      root.dataset.active = 'true';
      if (emptyState) emptyState.hidden = true;
      if (form) {
        form.querySelector(':scope > .sbar')?.setAttribute('hidden', '');
        form.querySelector(':scope > .cn')?.setAttribute('hidden', '');
        form.querySelector(':scope > .sl > .sf')?.setAttribute('hidden', '');
        form.querySelector('.tp-store-results > .tb')?.setAttribute('hidden', '');
      }
      search.addEventListener('input', () => { currentPage = 1; update(); });
      category.addEventListener('change', () => { currentPage = 1; update(); });
      pagination.querySelectorAll('[data-reference-page]').forEach((button) => {
        button.addEventListener('click', () => {
          currentPage += Number(button.dataset.referencePage);
          update();
          root.scrollIntoView({behavior: 'smooth', block: 'start'});
        });
      });
      update();
    } catch {
      count.textContent = 'کاتالوگ مرجع در حال حاضر در دسترس نیست.';
      root.hidden = false;
      root.dataset.active = 'error';
    }
  }

  start();
})();
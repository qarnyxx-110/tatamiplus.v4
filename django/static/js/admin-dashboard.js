(() => {
  'use strict';

  const input = document.querySelector('[data-admin-search]');
  const clearButton = document.querySelector('[data-admin-clear]');
  const modules = Array.from(document.querySelectorAll('[data-admin-module]'));
  const noResults = document.querySelector('[data-admin-no-results]');
  const resultCount = document.querySelector('[data-admin-result-count]');

  if (!input || modules.length === 0) return;

  const digitMap = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };

  const normalize = (value) => String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('fa-IR')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u0640\u200c]/g, '')
    .replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit])
    .replace(/\s+/g, ' ')
    .trim();

  const persianDigits = (value) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const totalModels = modules.reduce(
    (total, module) => total + module.querySelectorAll('[data-admin-model]').length,
    0
  );

  function filterModules() {
    const query = normalize(input.value);
    let visibleModules = 0;
    let visibleModels = 0;

    modules.forEach((module) => {
      const moduleMatches = !query || normalize(module.dataset.searchName).includes(query);
      const rows = Array.from(module.querySelectorAll('[data-admin-model]'));
      let matchingRows = 0;

      rows.forEach((row) => {
        const modelMatches = !query || normalize(row.dataset.searchName || row.textContent).includes(query);
        const visible = moduleMatches || modelMatches;
        row.hidden = !visible;
        if (visible) matchingRows += 1;
      });

      const visible = moduleMatches || matchingRows > 0;
      module.hidden = !visible;
      if (visible) {
        visibleModules += 1;
        visibleModels += matchingRows;
      }
    });

    if (noResults) noResults.hidden = visibleModules > 0;
    if (clearButton) clearButton.hidden = query.length === 0;

    if (resultCount) {
      const groups = persianDigits(visibleModules);
      const models = persianDigits(visibleModels);
      resultCount.textContent = query
        ? `${groups} گروه · ${models} مدل`
        : `${persianDigits(modules.length)} گروه · ${persianDigits(totalModels)} مدل`;
    }
  }

  input.addEventListener('input', filterModules);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      filterModules();
    }
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      input.value = '';
      filterModules();
      input.focus();
    });
  }

  filterModules();
})();

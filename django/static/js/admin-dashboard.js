(() => {
  'use strict';

  const input = document.querySelector('[data-admin-search]');
  const clearButton = document.querySelector('[data-admin-clear]');
  const modules = Array.from(document.querySelectorAll('[data-admin-module]'));
  const noResults = document.querySelector('[data-admin-no-results]');
  const resultCount = document.querySelector('[data-admin-result-count]');

  if (!input || !modules.length) return;

  const normalize = (value) => String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('fa-IR')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const toPersianDigits = (value) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const totalModels = modules.reduce((total, module) => total + module.querySelectorAll('[data-admin-model]').length, 0);

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
        const rowVisible = moduleMatches || modelMatches;
        row.hidden = !rowVisible;
        if (rowVisible) matchingRows += 1;
      });

      const moduleVisible = moduleMatches || matchingRows > 0 || rows.length === 0;
      module.hidden = !moduleVisible;
      if (moduleVisible) {
        visibleModules += 1;
        visibleModels += matchingRows;
      }
    });

    if (noResults) noResults.hidden = visibleModules !== 0;
    if (clearButton) clearButton.hidden = query.length === 0;

    if (resultCount) {
      const groups = toPersianDigits(visibleModules);
      const models = toPersianDigits(visibleModels);
      resultCount.textContent = query
        ? `${groups} گروه · ${models} بخش`
        : `${toPersianDigits(modules.length)} گروه · ${toPersianDigits(totalModels)} بخش`;
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

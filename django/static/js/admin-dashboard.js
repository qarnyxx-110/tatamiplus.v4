(() => {
  'use strict';

  const input = document.querySelector('[data-admin-search]');
  const clear = document.querySelector('[data-admin-clear]');
  const modules = Array.from(document.querySelectorAll('[data-admin-module]'));
  const noResults = document.querySelector('[data-admin-no-results]');
  const resultCount = document.querySelector('[data-admin-result-count]');
  if (!input || !modules.length) return;

  const normalize = (value) => String(value || '')
    .toLocaleLowerCase('fa')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  function filterModules() {
    const query = normalize(input.value);
    let visibleModules = 0;
    let visibleModels = 0;

    modules.forEach((module) => {
      const moduleName = normalize(module.dataset.searchName || '');
      const appMatches = !query || moduleName.includes(query);
      const rows = Array.from(module.querySelectorAll('[data-admin-model]'));
      let moduleHasMatch = rows.length === 0 && appMatches;

      rows.forEach((row) => {
        const modelMatches = appMatches || normalize(row.dataset.searchName || row.textContent).includes(query);
        row.hidden = !modelMatches;
        if (modelMatches) {
          visibleModels += 1;
          moduleHasMatch = true;
        }
      });

      module.hidden = !moduleHasMatch;
      if (moduleHasMatch) visibleModules += 1;
    });

    if (noResults) noResults.hidden = visibleModules > 0;
    if (clear) clear.hidden = !query;
    if (resultCount) {
      const moduleLabel = visibleModules.toLocaleString('fa-IR') + ' ماژول';
      const modelLabel = visibleModels.toLocaleString('fa-IR') + ' بخش';
      resultCount.textContent = query ? moduleLabel + ' · ' + modelLabel : modules.length.toLocaleString('fa-IR') + ' ماژول';
    }
  }

  input.addEventListener('input', filterModules);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      filterModules();
    }
  });
  if (clear) {
    clear.addEventListener('click', () => {
      input.value = '';
      filterModules();
      input.focus();
    });
  }

  filterModules();
})();

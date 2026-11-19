import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  new URL('../../django/static/js/admin-dashboard.js', import.meta.url),
  'utf8'
);

const handlers = {};
const input = {
  value: '',
  focused: false,
  addEventListener(type, callback) {
    handlers[`input:${type}`] = callback;
  },
  focus() {
    this.focused = true;
  }
};
const clearButton = {
  hidden: true,
  addEventListener(type, callback) {
    handlers[`clear:${type}`] = callback;
  }
};
const noResults = { hidden: true };
const resultCount = { textContent: '' };

function createRow(name) {
  return {
    dataset: { searchName: name },
    textContent: name,
    hidden: false
  };
}

function createModule(name, modelNames) {
  const rows = modelNames.map(createRow);
  return {
    dataset: { searchName: name },
    hidden: false,
    rows,
    querySelectorAll(selector) {
      assert.equal(selector, '[data-admin-model]');
      return rows;
    }
  };
}

const modules = [
  createModule('حساب‌های کاربری accounts', ['کاربران', 'درخواست‌های مربیگری']),
  createModule('فروشگاه store', ['محصولات', 'كالاها']),
  createModule('آرشیو خالی archive', []),
  createModule('گزارش‌های دوره reports', ['نسخه 2'])
];

const elements = new Map([
  ['[data-admin-search]', input],
  ['[data-admin-clear]', clearButton],
  ['[data-admin-no-results]', noResults],
  ['[data-admin-result-count]', resultCount]
]);

const document = {
  querySelector(selector) {
    return elements.get(selector) || null;
  },
  querySelectorAll(selector) {
    assert.equal(selector, '[data-admin-module]');
    return modules;
  }
};

vm.runInNewContext(source, { document });

assert.equal(resultCount.textContent, '۴ گروه · ۵ مدل', 'initial count uses Persian digits');
assert.equal(clearButton.hidden, true, 'clear button is hidden when there is no query');
assert.equal(modules[2].hidden, false, 'empty module stays visible before searching');

input.value = 'درخواست‌های';
handlers['input:input']();
assert.equal(modules[0].hidden, false, 'matching module remains visible');
assert.equal(modules[0].rows[0].hidden, true, 'non-matching model is hidden');
assert.equal(modules[0].rows[1].hidden, false, 'matching model remains visible');
assert.equal(modules[1].hidden, true, 'non-matching module is hidden');
assert.equal(modules[2].hidden, true, 'empty unrelated module is hidden');
assert.equal(resultCount.textContent, '۱ گروه · ۱ مدل', 'model search updates counts');

input.value = 'کالاها';
handlers['input:input']();
assert.equal(modules[1].hidden, false, 'Persian kaf matches Arabic kaf in stored model name');
assert.equal(modules[1].rows[1].hidden, false, 'normalized model row is visible');

input.value = '۲';
handlers['input:input']();
assert.equal(modules[3].hidden, false, 'Persian digit matches an ASCII digit in a model name');
assert.equal(modules[3].rows[0].hidden, false, 'digit-matched model remains visible');
assert.equal(resultCount.textContent, '۱ گروه · ۱ مدل', 'digit search updates visible counts');

input.value = 'عبارت ناموجود';
handlers['input:input']();
assert.equal(noResults.hidden, false, 'empty state remains visible when nothing matches');
assert.equal(clearButton.hidden, false, 'clear button appears while searching');

handlers['input:keydown']({ key: 'Escape' });
assert.equal(input.value, '', 'Escape clears the query');
assert.equal(noResults.hidden, true, 'empty state is hidden after reset');
assert.equal(clearButton.hidden, true, 'clear button is hidden after reset');

input.value = 'فروشگاه';
handlers['input:input']();
handlers['clear:click']();
assert.equal(input.value, '', 'clear action resets the query');
assert.equal(input.focused, true, 'clear action returns focus to the search input');
assert.equal(modules.every((module) => !module.hidden), true, 'all modules return after reset');

console.log('ADMIN_DASHBOARD_SEARCH_OK');

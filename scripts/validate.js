#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { resolveRequestPath } = require('./dev-server');

const projectRoot = path.resolve(__dirname, '..');
const errors = [];

function check(description, action) {
  try {
    action();
    console.log(`✓ ${description}`);
  } catch (error) {
    errors.push(`${description}: ${error.message}`);
    console.error(`✗ ${description}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function assertLocalFile(reference, baseDirectory = projectRoot) {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  if (!cleanReference || /^(?:[a-z]+:|#)/i.test(cleanReference)) return;
  const decodedReference = decodeURIComponent(cleanReference);
  const resolvedPath = path.resolve(baseDirectory, decodedReference.replace(/^[/\\]+/, ''));
  assert.ok(resolvedPath.startsWith(`${projectRoot}${path.sep}`), `Reference leaves the project: ${reference}`);
  assert.ok(fs.existsSync(resolvedPath), `Missing referenced file: ${reference}`);
}

const html = read('index.html');
const css = read('css/main.css');
const manifest = JSON.parse(read('database/manifest.json'));

check('JavaScript files parse successfully', () => {
  for (const relativePath of ['js/app.js', 'scripts/generate_manifest.js', 'scripts/dev-server.js', 'scripts/validate.js']) {
    new vm.Script(read(relativePath), { filename: relativePath });
  }
});

check('HTML IDs are unique and local assets exist', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML ID found');
  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) assertLocalFile(match[1]);
  assert.ok(!html.includes('example.com'), 'Placeholder metadata is still present');
});

check('CSS custom properties are defined', () => {
  const defined = new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(match => match[1]));
  const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]));
  const missing = [...used].filter(property => !defined.has(property));
  assert.deepEqual(missing, []);
});

check('Manifest records are valid and all referenced files exist', () => {
  assert.ok(Array.isArray(manifest.categories) && manifest.categories.length > 0, 'No categories found');
  const keys = new Set();
  for (const category of manifest.categories) {
    assert.ok(category.name && Array.isArray(category.subcategories), `Invalid category: ${category.name}`);
    for (const subcategory of category.subcategories) {
      assert.ok(subcategory.name && Array.isArray(subcategory.items), `Invalid subcategory: ${subcategory.name}`);
      if (subcategory.thumbnail) assertLocalFile(subcategory.thumbnail);
      for (const item of subcategory.items) {
        const key = JSON.stringify([category.name, subcategory.name, item.name]);
        assert.ok(!keys.has(key), `Duplicate item: ${key}`);
        keys.add(key);
        assert.ok(item.name, 'Item name is missing');
        if (item.avatar) assertLocalFile(item.avatar);
        if (item.image) assertLocalFile(item.image);
        assert.ok(!item.info || !item.info.includes('\r'), `Non-normalized line endings in ${item.name}`);
      }
    }
  }
});

check('Web app manifest uses deployable relative icon paths', () => {
  const webManifest = JSON.parse(read('icons/site.webmanifest'));
  for (const icon of webManifest.icons || []) assertLocalFile(icon.src, path.join(projectRoot, 'icons'));
  assert.equal(webManifest.scope, '../');
  assert.equal(webManifest.start_url, '../');
});

check('Development server resolves query strings and blocks traversal', () => {
  assert.equal(resolveRequestPath('/js/app.js?v=12'), path.join(projectRoot, 'js', 'app.js'));
  assert.equal(resolveRequestPath('/%2e%2e%2f%2e%2e%2fWindows/win.ini'), null);
  assert.throws(() => assertLocalFile('../../outside.txt'), /leaves the project/);
});

if (errors.length > 0) {
  console.error(`\n${errors.length} validation check(s) failed:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('\nAll validation checks passed.');
}

'use strict';

// torrent-parser.js 与 history-adapter.js 依赖全局 window 命名空间
globalThis.window = globalThis;
require('../public/torrent-parser.js');
require('../public/history-adapter.js');

const test = require('node:test');
const assert = require('node:assert');
const { History } = globalThis.window.T2M;

// 新行：含 trackers_json，直读
const NEW_ROW = {
  id: 'r1',
  name: 'dir',
  info_hash: 'ab',
  magnet: 'magnet:?xt=urn:btih:ab',
  file_count: 2,
  total_size: 30,
  files_json: '[{"path":"sub/a.mp4","size":10},{"path":"b.txt","size":20}]',
  trackers_json: '["http://t1/announce"]',
  created_at: '2026-01-01T00:00:00.000Z'
};

// 旧行：无 trackers_json，从 magnet 反向解析（兼容回退）
const OLD_ROW = {
  id: 'r2',
  name: 'x',
  info_hash: 'cd',
  magnet: 'magnet:?xt=urn:btih:cd&dn=x&tr=http%3A%2F%2Ft1%2Fannounce&tr=http%3A%2F%2Ft2%2Fannounce',
  file_count: 1,
  total_size: 5,
  files_json: '[{"path":"a.mp4","size":5}]',
  created_at: '2026-01-02T00:00:00.000Z'
};

test('rowToView：新行直读 trackers_json，产出完整 torrentView 与元信息', () => {
  const { id, createdAt, view } = History.rowToView(NEW_ROW);

  assert.strictEqual(id, 'r1');
  assert.strictEqual(createdAt, '2026-01-01T00:00:00.000Z');
  assert.strictEqual(view.name, 'dir');
  assert.strictEqual(view.infoHash, 'ab');
  assert.deepStrictEqual(view.trackers, ['http://t1/announce']);
  assert.deepStrictEqual(view.files, [
    { path: 'sub/a.mp4', size: 10 },
    { path: 'b.txt', size: 20 }
  ]);
  assert.strictEqual(view.totalSize, 30);
  assert.deepStrictEqual(view.extensions.sort(), ['.mp4', '.txt']);
  assert.strictEqual(view.hasVideo, true);
  assert.strictEqual(view.creationDate, null);
});

test('rowToView：旧行无 trackers_json 时回退 magnet 反解', () => {
  const { view } = History.rowToView(OLD_ROW);

  assert.deepStrictEqual(view.trackers, ['http://t1/announce', 'http://t2/announce']);
});

test('rowToView：files_json 为空或损坏时降级为空列表', () => {
  const row = Object.assign({}, NEW_ROW, { files_json: null, total_size: null });
  const { view } = History.rowToView(row);

  assert.deepStrictEqual(view.files, []);
  assert.strictEqual(view.totalSize, 0);
});

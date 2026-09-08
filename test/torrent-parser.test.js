'use strict';

// torrent-parser.js 依赖全局 window 命名空间，Node 环境下注入 shim
globalThis.window = globalThis;
require('../public/torrent-parser.js');

const test = require('node:test');
const assert = require('node:assert');
const { Magnet } = globalThis.window.T2M;

function bytes(str) {
  return new TextEncoder().encode(str);
}

// 多文件种子：info.files 列表（每项为 dict），含 announce 与 announce-list（含重复项）
const MULTI_INFO = 'd4:name3:dir5:filesld6:lengthi10e4:pathl3:sub5:a.mp4eed6:lengthi20e4:pathl5:b.txteeee';
const MULTI_TORRENT = 'd8:announce18:http://t1/announce13:announce-listll18:http://t1/announceel18:http://t2/announceee13:creation datei1700000000e4:info' + MULTI_INFO + 'e';

test('convertTorrent：多文件种子归一化出 files/totalSize/extensions/hasVideo', async () => {
  const view = await Magnet.convertTorrent(bytes(MULTI_TORRENT).buffer, 'multi.torrent');

  assert.deepStrictEqual(view.files, [
    { path: 'sub/a.mp4', size: 10 },
    { path: 'b.txt', size: 20 }
  ]);
  assert.strictEqual(view.totalSize, 30);
  assert.deepStrictEqual(view.extensions.sort(), ['.mp4', '.txt']);
  assert.strictEqual(view.hasVideo, true);
  // 已知真值：对 info 字典原始字节独立计算的 SHA-1
  assert.strictEqual(view.infoHash, '06eb474fb5a6919ec292b01426165e5279a782b3');
});

test('convertTorrent：tracker 去重合并 announce 与 announce-list，透传创建日期', async () => {
  const view = await Magnet.convertTorrent(bytes(MULTI_TORRENT).buffer, 'multi.torrent');

  assert.deepStrictEqual(view.trackers, ['http://t1/announce', 'http://t2/announce']);
  assert.strictEqual(view.creationDate, 1700000000);
});

// 单文件种子：info 内只有 name + length，无 files 列表
const SINGLE_TORRENT = 'd4:infod4:name8:file.txt6:lengthi42eee';

test('convertTorrent：单文件种子归一化为单元素 files', async () => {
  const view = await Magnet.convertTorrent(bytes(SINGLE_TORRENT).buffer, 'single.torrent');

  assert.strictEqual(view.name, 'file.txt');
  // 已知真值：对 info 字典原始字节独立计算的 SHA-1
  assert.strictEqual(view.infoHash, '99a9ce974537998b414238f508ea76cf1b355cac');
  assert.deepStrictEqual(view.files, [{ path: 'file.txt', size: 42 }]);
  assert.strictEqual(view.totalSize, 42);
  assert.deepStrictEqual(view.extensions, ['.txt']);
  assert.strictEqual(view.hasVideo, false);
  assert.deepStrictEqual(view.trackers, []);
  assert.strictEqual(view.creationDate, null);
});

// info 无 name 字段时回退到文件名
const NAMELESS_TORRENT = 'd4:infod6:lengthi1eee';

test('convertTorrent：info 无 name 时回退到文件名', async () => {
  const view = await Magnet.convertTorrent(bytes(NAMELESS_TORRENT).buffer, 'fallback.torrent');

  assert.strictEqual(view.name, 'fallback');
  assert.deepStrictEqual(view.files, []);
});

test('hexToBase32：RFC 4648 无填充', () => {
  // 独立真值：Python base64.b32encode 对同一 20 字节计算的结果
  assert.strictEqual(
    Magnet.hexToBase32('99a9ce974537998b414238f508ea76cf1b355cac'),
    'TGU45F2FG6MYWQKCHD2QR2TWZ4NTKXFM'
  );
});

test('buildMagnetLink：默认包含 dn 与 tr，选项可分别关闭', () => {
  const trackers = ['http://t1/announce'];

  assert.strictEqual(
    Magnet.buildMagnetLink('ab', 'n', trackers),
    'magnet:?xt=urn:btih:ab&dn=n&tr=' + encodeURIComponent('http://t1/announce')
  );
  assert.strictEqual(
    Magnet.buildMagnetLink('ab', 'n', trackers, { includeName: false }),
    'magnet:?xt=urn:btih:ab&tr=' + encodeURIComponent('http://t1/announce')
  );
  assert.strictEqual(
    Magnet.buildMagnetLink('ab', 'n', trackers, { includeTrackers: false }),
    'magnet:?xt=urn:btih:ab&dn=n'
  );
  // 空 tracker 列表不产生 tr 参数
  assert.strictEqual(
    Magnet.buildMagnetLink('ab', 'n', []),
    'magnet:?xt=urn:btih:ab&dn=n'
  );
});

test('injectPublicTrackers：与公共列表去重后追加', () => {
  const own = ['http://custom/announce', Magnet.PUBLIC_TRACKERS[0]];
  const merged = Magnet.injectPublicTrackers(own);

  assert.strictEqual(merged[0], 'http://custom/announce');
  // 已存在的公共 tracker 不重复出现
  assert.strictEqual(merged.filter(function (t) { return t === Magnet.PUBLIC_TRACKERS[0]; }).length, 1);
  assert.strictEqual(merged.length, own.length + Magnet.PUBLIC_TRACKERS.length - 1);
});

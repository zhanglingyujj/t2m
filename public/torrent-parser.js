/**
 * T2M - Bencode 解析器 & 磁力链接生成
 * 纯客户端实现，无外部依赖
 */
window.T2M = window.T2M || {};

/**
 * Bencode 解码器
 * 解析 .torrent 文件的 Bencode 编码内容
 *
 * Bencode 格式：
 *   - 字符串: <长度>:<内容>  例: 4:spam → "spam"
 *   - 整数:   i<数字>e      例: i3e → 3
 *   - 列表:   l<元素>e      例: l4:spam4:eggse → ["spam","eggs"]
 *   - 字典:   d<键值对>e    例: d3:cow3:moo4:spam4:eggse
 */
window.T2M.Bencode = (function () {
  /**
   * 将字节数组解码为 UTF-8 字符串
   */
  function bytesToString(bytes) {
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  /**
   * 将字符串编码为 UTF-8 字节数组
   */
  function stringToBytes(str) {
    return new TextEncoder().encode(str);
  }

  /**
   * 解析 Bencode 编码的数据
   * @param {Uint8Array} data - 原始字节数据
   * @param {number} offset - 起始偏移
   * @returns {{ value: any, nextOffset: number, rawBytes?: Uint8Array }}
   */
  function decode(data, offset) {
    const byte = data[offset];
    const char = String.fromCharCode(byte);

    if (char === 'i') {
      return decodeInt(data, offset);
    } else if (char === 'l') {
      return decodeList(data, offset);
    } else if (char === 'd') {
      return decodeDict(data, offset);
    } else if (char >= '0' && char <= '9') {
      return decodeString(data, offset);
    } else {
      throw new Error('无法识别的 Bencode 类型，偏移: ' + offset + '，字节: ' + byte);
    }
  }

  /**
   * 解码字符串: <长度>:<内容>
   * @returns {{ value: string, nextOffset: number, rawBytes: Uint8Array }}
   */
  function decodeString(data, offset) {
    let colonPos = offset;
    while (colonPos < data.length && data[colonPos] !== 0x3a) {
      colonPos++;
    }
    if (colonPos >= data.length) {
      throw new Error('Bencode 字符串格式错误：缺少冒号');
    }

    const lengthStr = bytesToString(data.slice(offset, colonPos));
    const length = parseInt(lengthStr, 10);
    if (isNaN(length)) {
      throw new Error('Bencode 字符串长度解析失败: ' + lengthStr);
    }

    const contentStart = colonPos + 1;
    const contentEnd = contentStart + length;
    if (contentEnd > data.length) {
      throw new Error('Bencode 字符串长度超出数据范围');
    }

    const rawBytes = data.slice(offset, contentEnd);
    const value = bytesToString(data.slice(contentStart, contentEnd));

    return { value, nextOffset: contentEnd, rawBytes };
  }

  /**
   * 解码整数: i<数字>e
   * @returns {{ value: number, nextOffset: number, rawBytes: Uint8Array }}
   */
  function decodeInt(data, offset) {
    const start = offset;
    let pos = offset + 1;
    while (pos < data.length && data[pos] !== 0x65) {
      pos++;
    }
    if (pos >= data.length) {
      throw new Error('Bencode 整数格式错误：缺少结束标记 e');
    }

    const numStr = bytesToString(data.slice(offset + 1, pos));
    const value = parseInt(numStr, 10);
    const rawBytes = data.slice(start, pos + 1);

    return { value, nextOffset: pos + 1, rawBytes };
  }

  /**
   * 解码列表: l<元素>e
   * @returns {{ value: Array, nextOffset: number, rawBytes: Uint8Array }}
   */
  function decodeList(data, offset) {
    const start = offset;
    let pos = offset + 1;
    const result = [];

    while (pos < data.length && data[pos] !== 0x65) {
      const decoded = decode(data, pos);
      result.push(decoded.value);
      pos = decoded.nextOffset;
    }

    if (pos >= data.length) {
      throw new Error('Bencode 列表格式错误：缺少结束标记 e');
    }

    const rawBytes = data.slice(start, pos + 1);
    return { value: result, nextOffset: pos + 1, rawBytes };
  }

  /**
   * 解码字典: d<键值对>e
   * @returns {{ value: Object, nextOffset: number, rawBytes: Uint8Array }}
   */
  function decodeDict(data, offset) {
    const start = offset;
    let pos = offset + 1;
    const result = {};

    while (pos < data.length && data[pos] !== 0x65) {
      const keyDecoded = decodeString(data, pos);
      const valDecoded = decode(data, keyDecoded.nextOffset);
      result[keyDecoded.value] = valDecoded.value;
      pos = valDecoded.nextOffset;
    }

    if (pos >= data.length) {
      throw new Error('Bencode 字典格式错误：缺少结束标记 e');
    }

    const rawBytes = data.slice(start, pos + 1);
    return { value: result, nextOffset: pos + 1, rawBytes };
  }

  /**
   * 解析种子文件，返回解码后的内容
   */
  function parse(data) {
    const decoded = decode(new Uint8Array(data), 0);
    return decoded.value;
  }

  return { parse, decode, bytesToString, stringToBytes };
})();
/**
 * T2M - 磁力链接生成模块
 * 追加到 T2M 命名空间
 */
(function () {
  const Bencode = window.T2M.Bencode;

  /**
   * 从种子原始字节中提取 info 字典的原始字节区间
   * 用于后续计算 SHA-1 info hash
   *
   * @param {Uint8Array} data - 种子文件的原始字节
   * @returns {Uint8Array} info 字典的原始 Bencode 字节
   */
  function extractInfoRawBytes(data) {
    if (data[0] !== 0x64) {
      throw new Error('不是有效的种子文件：顶层必须是字典');
    }

    let pos = 1;
    while (pos < data.length && data[pos] !== 0x65) {
      // 解析键
      const keyResult = Bencode.decode(data, pos);
      const key = keyResult.value;
      pos = keyResult.nextOffset;

      // 解析值
      const valResult = Bencode.decode(data, pos);

      if (key === 'info') {
        return valResult.rawBytes;
      }

      pos = valResult.nextOffset;
    }

    throw new Error('种子文件中未找到 info 字段');
  }

  /**
   * 将字节数组转为十六进制字符串
   * @param {ArrayBuffer} buffer
   * @returns {string} 小写十六进制字符串
   */
  function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 计算 info hash
   * @param {Uint8Array} infoBytes - info 字典的原始 Bencode 字节
   * @returns {Promise<string>} 40 位小写十六进制 info hash
   */
  async function computeInfoHash(infoBytes) {
    const hashBuffer = await crypto.subtle.digest('SHA-1', infoBytes);
    return bufferToHex(hashBuffer);
  }

  /**
   * 十六进制 info hash 转大写 base32（32 字符，RFC 4648，无填充）
   * @param {string} hex - 40 位十六进制 info hash
   * @returns {string}
   */
  function hexToBase32(hex) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let out = '';
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2), 16);
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        out += ALPHABET[(value >>> bits) & 31];
      }
    }
    if (bits > 0) {
      out += ALPHABET[(value << (5 - bits)) & 31];
    }
    return out;
  }

  /**
   * 生成磁力链接
   * @param {string} infoHash - 40 位十六进制 info hash
   * @param {string} name - 种子名称
   * @param {string[]} trackers - tracker 地址列表（可选）
   * @param {{includeName?: boolean, includeTrackers?: boolean}} [opts] - 输出选项，默认均包含
   * @returns {string} 磁力链接
   */
  function buildMagnetLink(infoHash, name, trackers, opts) {
    const includeName = !opts || opts.includeName !== false;
    const includeTrackers = !opts || opts.includeTrackers !== false;

    let magnet = 'magnet:?xt=urn:btih:' + infoHash;
    if (includeName && name) {
      magnet += '&dn=' + encodeURIComponent(name);
    }

    if (includeTrackers && trackers && trackers.length > 0) {
      for (const tr of trackers) {
        magnet += '&tr=' + encodeURIComponent(tr);
      }
    }

    return magnet;
  }

/**
   * 公共 tracker 列表（约 20 个）
   * 来源：ngosang/trackerslist trackers_best.txt，快照 2026-09
   * https://github.com/ngosang/trackerslist
   */
  const PUBLIC_TRACKERS = [
    'udp://zer0day.ch:1337/announce',
    'udp://tracker.therarbg.to:6969/announce',
    'udp://tracker.publictracker.xyz:6969/announce',
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.qu.ax:6969/announce',
    'udp://tracker.peerfect.org:6969/announce',
    'udp://tracker.opentrackr.com:6969/announce',
    'udp://tracker.ilibr.org:6969/announce',
    'udp://tracker.farted.net:6969/announce',
    'udp://tracker.dler.org:6969/announce',
    'udp://tracker.corpscorp.online:80/announce',
    'udp://tracker.bittor.pw:1337/announce',
    'udp://tracker.auctor.tv:6969/announce',
    'udp://tracker.0x7c0.com:6969/announce',
    'udp://t.overflow.biz:6969/announce',
    'udp://retracker01-msk-virt.corbina.net:80/announce',
    'udp://mail.segso.net:6969/announce'
  ];

  /**
   * 合并种子自带 tracker 与公共 tracker（去重，公共追加在后）
   * @param {string[]} trackers - 种子自带 tracker 列表
   * @returns {string[]}
   */
  function injectPublicTrackers(trackers) {
    const seen = new Set(trackers || []);
    const merged = (trackers || []).slice();
    for (const tr of PUBLIC_TRACKERS) {
      if (!seen.has(tr)) {
        seen.add(tr);
        merged.push(tr);
      }
    }
    return merged;
  }

  /**
   * 格式化种子创建日期
   * @param {number} timestamp - Unix 时间戳（秒），可为 null/undefined
   * @returns {string} 本地化日期，缺失时返回 '—'
   */
  function formatCreationDate(timestamp) {
    if (timestamp == null || isNaN(timestamp)) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  }

  /**
   * 视频文件扩展名白名单
   */
  const VIDEO_EXTENSIONS = new Set([
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts'
  ]);

  /**
   * 将 info 字典归一化为文件列表（单文件与多文件布局统一）
   */
  function normalizeFiles(info) {
    if (!info) return [];
    if (Array.isArray(info.files)) {
      return info.files.map(function (f) {
        return { path: f.path ? f.path.join('/') : '', size: f.length };
      });
    }
    if (info.name) return [{ path: info.name, size: info.length }];
    return [];
  }

  /**
   * 从归一化文件列表提取扩展名（含点号，小写去重）
   */
  function getExtensionsFromFiles(files) {
    const exts = new Set();
    for (const file of files) {
      const dot = file.path.lastIndexOf('.');
      if (dot >= 0 && dot < file.path.length - 1) {
        exts.add(file.path.substring(dot).toLowerCase());
      }
    }
    return Array.from(exts);
  }

  /**
   * torrentView 视图工厂：从部分字段补全派生字段
   * （fresh 解析与历史 adapter 共用的组装 seam）
   * @param {{name: string, infoHash: string, trackers?: string[], creationDate?: number|null, files?: {path: string, size: number}[]}} partial
   * @returns {{name: string, infoHash: string, trackers: string[], creationDate: number|null, files: {path: string, size: number}[], totalSize: number, extensions: string[], hasVideo: boolean}}
   */
  function buildView(partial) {
    const files = partial.files || [];
    const extensions = getExtensionsFromFiles(files);
    const totalSize = files.reduce(function (sum, f) { return sum + (f.size || 0); }, 0);

    return {
      name: partial.name,
      infoHash: partial.infoHash,
      trackers: partial.trackers || [],
      creationDate: partial.creationDate != null ? partial.creationDate : null,
      files,
      totalSize,
      extensions,
      hasVideo: extensions.some(function (e) { return VIDEO_EXTENSIONS.has(e); })
    };
  }

  /**
   * 按输出选项拼装磁力链接（纯函数，选项为显式参数）
   * @param {{name: string, infoHash: string, trackers: string[]}} view - torrentView
   * @param {{injectTrackers?: boolean, includeName?: boolean, includeTrackers?: boolean}} [options]
   * @returns {string} 磁力链接
   */
  function composeMagnet(view, options) {
    const opts = options || {};
    const trackers = opts.injectTrackers
      ? injectPublicTrackers(view.trackers)
      : view.trackers;
    return buildMagnetLink(view.infoHash, view.name, trackers, {
      includeName: opts.includeName,
      includeTrackers: opts.includeTrackers
    });
  }

  /**
   * 解析单个种子文件，返回归一化的种子视图 torrentView
   * （单文件/多文件布局差异在模块内消化，调用方不接触原始 info 字典）
   * @param {ArrayBuffer} fileData - 种子文件内容
   * @param {string} fileName - 文件名
   * @returns {Promise<{name: string, infoHash: string, trackers: string[], creationDate: number|null, files: {path: string, size: number}[], totalSize: number, extensions: string[], hasVideo: boolean}>}
   */
  async function convertTorrent(fileData, fileName) {
    const data = new Uint8Array(fileData);

    // 解析种子文件获取结构化数据
    const torrent = Bencode.parse(fileData);

    // 提取 info 字典原始字节
    const infoRawBytes = extractInfoRawBytes(data);

    // 计算 info hash
    const infoHash = await computeInfoHash(infoRawBytes);

    // 获取名称
    const name = (torrent.info && torrent.info.name)
      ? torrent.info.name
      : fileName.replace(/\.torrent$/i, '');

    // 收集 tracker 地址
    let trackers = [];
    if (torrent['announce']) {
      trackers.push(torrent['announce']);
    }
    if (Array.isArray(torrent['announce-list'])) {
      for (const tier of torrent['announce-list']) {
        if (Array.isArray(tier)) {
          for (const url of tier) {
            if (!trackers.includes(url)) {
              trackers.push(url);
            }
          }
        } else if (typeof tier === 'string') {
          if (!trackers.includes(tier)) {
            trackers.push(tier);
          }
        }
      }
    }

    // 创建日期（顶层字段，Unix 秒）
    const creationDate = typeof torrent['creation date'] === 'number'
      ? torrent['creation date']
      : null;

    // 归一化种子视图
    return buildView({
      name, infoHash, trackers, creationDate,
      files: normalizeFiles(torrent.info)
    });
  }

  window.T2M.Magnet = {
    convertTorrent, buildView, composeMagnet, buildMagnetLink, computeInfoHash, extractInfoRawBytes,
    PUBLIC_TRACKERS, injectPublicTrackers, formatCreationDate, VIDEO_EXTENSIONS,
    hexToBase32
  };
})();

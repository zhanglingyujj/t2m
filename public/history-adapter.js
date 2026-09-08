/**
 * T2M - 历史行适配器
 * D1 历史行 → 渲染层 torrentView：与 fresh 解析共用 Magnet.buildView 组装 seam
 */
window.T2M = window.T2M || {};

(function () {
  'use strict';

  const Magnet = window.T2M.Magnet;

  /**
   * 兼容旧行：从磁力链接反向解析 tracker 列表
   * （旧行无 trackers_json，tracker 只存在于拼好的 magnet 字符串中）
   */
  function trackersFromMagnet(magnet) {
    const trackers = [];
    const re = /[?&]tr=([^&]*)/g;
    let m;
    while ((m = re.exec(magnet))) {
      try {
        const tr = decodeURIComponent(m[1]);
        if (!trackers.includes(tr)) trackers.push(tr);
      } catch (e) {}
    }
    return trackers;
  }

  /**
   * D1 历史行 → torrentView + 元信息（id / createdAt）
   * @param {object} record - history 表行
   * @returns {{id: string, createdAt: string, view: object}}
   */
  function rowToView(record) {
    let trackers = [];
    if (record.trackers_json) {
      try { trackers = JSON.parse(record.trackers_json); } catch (e) {}
    } else {
      trackers = trackersFromMagnet(record.magnet || '');
    }

    let files = [];
    try { files = JSON.parse(record.files_json || '[]'); } catch (e) {}
    files = files.map(function (f) {
      return { path: f.path || '', size: f.size || f.length || 0 };
    });

    const view = Magnet.buildView({
      name: record.name,
      infoHash: record.info_hash,
      trackers,
      files,
      creationDate: null
    });

    return { id: String(record.id), createdAt: record.created_at, view };
  }

  window.T2M.History = { rowToView };
})();

/**
 * T2M - 主应用逻辑
 * 模块：Auth / History / DropZone / Results / Drawer / Tabs / App
 */
(function () {
  'use strict';

  // ===== DOM 元素 =====
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  const btnSelectFiles = document.getElementById('btnSelectFiles');
  const btnSelectFolder = document.getElementById('btnSelectFolder');
  const dropPreview = document.getElementById('dropPreview');
  const statusEl = document.getElementById('status');
  const emptyState = document.getElementById('emptyState');
  const parseProgress = document.getElementById('parseProgress');
  const parseProgressText = document.getElementById('parseProgressText');
  const resultList = document.getElementById('resultList');
  const btnCopyAll = document.getElementById('btnCopyAll');
  const chkVideoOnly = document.getElementById('chkVideoOnly');
  const filterSummary = document.getElementById('filterSummary');
  const filterHeaderText = document.getElementById('filterHeaderText');
  const filterVideoExts = document.getElementById('filterVideoExts');
  const filterNonVideoExts = document.getElementById('filterNonVideoExts');
  const filterRegexRow = document.getElementById('filterRegexRow');
  const filterRegex = document.getElementById('filterRegex');
  const btnCopyRegex = document.getElementById('btnCopyRegex');
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  const authUser = document.getElementById('authUser');
  const authUsername = document.getElementById('authUsername');
  const loginDropdown = document.getElementById('loginDropdown');
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const loginError = document.getElementById('loginError');
  const btnSubmitLogin = document.getElementById('btnSubmitLogin');
  const historyPanel = document.getElementById('historyPanel');
  const historySearch = document.getElementById('historySearch');
  const historyList = document.getElementById('historyList');
  const statTotal = document.getElementById('statTotal');
  const statVideo = document.getElementById('statVideo');
  const statNonVideo = document.getElementById('statNonVideo');
  const drawerMask = document.getElementById('drawerMask');
  const drawer = document.getElementById('drawer');
  const drawerName = document.getElementById('drawerName');
  const drawerSize = document.getElementById('drawerSize');
  const drawerFileCount = document.getElementById('drawerFileCount');
  const drawerFiles = document.getElementById('drawerFiles');
  const drawerHash = document.getElementById('drawerHash');
  const btnDrawerCopyHash = document.getElementById('btnDrawerCopyHash');
  const drawerMagnet = document.getElementById('drawerMagnet');
  const btnDrawerCopyMagnet = document.getElementById('btnDrawerCopyMagnet');
  const drawerClose = document.getElementById('drawerClose');

  // ===== 状态 =====
  let allTorrentResults = [];
  let errorResults = [];
  let historyData = [];
  let isAuthenticated = false;

  // ===== 工具函数 =====
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
  }

  function hideStatus() {
    statusEl.className = 'status hidden';
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
  }

  function isTorrentFile(file) {
    return file.name.toLowerCase().endsWith('.torrent');
  }

  function formatSize(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  function formatTime(isoStr) {
    const then = new Date(isoStr);
    const now = new Date();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + ' 分钟前';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' 小时前';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + ' 天前';
    return then.toLocaleDateString('zh-CN');
  }

  /**
   * 提取种子文件列表
   */
  function extractFileList(info) {
    if (!info) return [];
    if (info.files && Array.isArray(info.files)) {
      return info.files.map(function (f) {
        return {
          path: f.path ? f.path.join('/') : '',
          size: f.length
        };
      });
    }
    if (info.name) {
      return [{ path: info.name, size: info.length }];
    }
    return [];
  }

  /**
   * 计算文件列表总大小
   */
  function getTotalSize(fileList) {
    return fileList.reduce(function (sum, f) { return sum + (f.size || 0); }, 0);
  }

  // ===== 移动端页签 =====
  function isMobileLayout() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function switchTab(tab) {
    document.body.dataset.tab = tab;
  }

  document.querySelectorAll('.mobile-tabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.dataset.tab);
    });
  });

  // ===== Auth 模块 =====
  async function checkAuthStatus() {
    try {
      const resp = await fetch('/api/auth/status');
      const data = await resp.json();
      isAuthenticated = data.authenticated;
      updateAuthUI(data);
    } catch (e) {
      isAuthenticated = false;
      updateAuthUI({ authenticated: false });
    }
  }

  function updateAuthUI(data) {
    if (data.authenticated) {
      btnLogin.style.display = 'none';
      authUser.classList.add('active');
      authUsername.textContent = data.username || '';
      historyPanel.classList.add('active');
    } else {
      btnLogin.style.display = 'inline-flex';
      authUser.classList.remove('active');
      loginDropdown.classList.remove('active');
      historyPanel.classList.remove('active');
    }
  }

  async function handleLogin() {
    const username = loginUser.value.trim();
    const password = loginPass.value;
    if (!username || !password) {
      loginError.textContent = '请输入用户名和密码';
      loginError.classList.add('active');
      return;
    }
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });
      const data = await resp.json();
      if (resp.ok) {
        isAuthenticated = true;
        updateAuthUI({ authenticated: true, username: data.username });
        loginDropdown.classList.remove('active');
        loginError.classList.remove('active');
        loginUser.value = '';
        loginPass.value = '';
        loadHistory();
      } else {
        loginError.textContent = data.error || '登录失败';
        loginError.classList.add('active');
      }
    } catch (e) {
      loginError.textContent = '网络错误，请重试';
      loginError.classList.add('active');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    isAuthenticated = false;
    updateAuthUI({ authenticated: false });
    historyData = [];
  }

  btnLogin.addEventListener('click', function () {
    loginDropdown.classList.toggle('active');
    if (loginDropdown.classList.contains('active')) {
      loginUser.focus();
    }
  });

  btnSubmitLogin.addEventListener('click', handleLogin);
  btnLogout.addEventListener('click', handleLogout);

  loginPass.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleLogin();
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.auth-area')) {
      loginDropdown.classList.remove('active');
    }
  });

  // ===== History 模块 =====
  async function loadHistory(q) {
    if (!isAuthenticated) return;
    try {
      var url = '/api/history';
      if (q) url += '?q=' + encodeURIComponent(q);
      const resp = await fetch(url);
      if (resp.ok) {
        historyData = await resp.json();
        renderHistory(historyData);
      }
    } catch (e) {}
  }

  async function saveHistory(name, infoHash, magnet, fileList) {
    if (!isAuthenticated) return;
    try {
      const totalSize = getTotalSize(fileList);
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          infoHash: infoHash,
          magnet: magnet,
          fileCount: fileList.length,
          totalSize: totalSize,
          files: fileList
        })
      });
      loadHistory(historySearch.value || undefined);
    } catch (e) {}
  }

  async function deleteHistory(id, e) {
    e.stopPropagation();
    try {
      await fetch('/api/history/' + id, { method: 'DELETE' });
      loadHistory(historySearch.value || undefined);
    } catch (e) {}
  }

  function renderHistory(data) {
    if (data.length === 0) {
      historyList.innerHTML = '<li class="history-empty">暂无历史记录</li>';
    } else {
      historyList.innerHTML = data.map(function (item) {
        var fileCount = item.file_count;
        var totalSize = item.total_size;
        var meta = [];
        if (fileCount) meta.push(fileCount + ' 个文件');
        if (totalSize) meta.push(formatSize(totalSize));
        return '<li class="history-item" data-magnet="' + escapeHTML(item.magnet) + '" data-name="' + escapeHTML(item.name) + '">' +
          '<div class="history-item-info">' +
            '<div class="history-item-name">' + escapeHTML(item.name) + '</div>' +
            '<div class="history-item-meta">' +
              '<span class="history-item-hash">' + escapeHTML(item.info_hash.substring(0, 8)) + '</span>' +
              '<span>' + formatTime(item.created_at) + '</span>' +
              (meta.length > 0 ? '<span>' + meta.join(' · ') + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<button class="btn-delete-history" data-id="' + escapeHTML(item.id) + '">删除</button>' +
        '</li>';
      }).join('');
    }

    // 统计
    const Magnet = window.T2M.Magnet;
    var videoCount = 0;
    var nonVideoCount = 0;
    for (var i = 0; i < data.length; i++) {
      var files = [];
      try { files = JSON.parse(data[i].files_json || '[]'); } catch(e) {}
      var exts = [];
      for (var j = 0; j < files.length; j++) {
        var path = files[j].path || '';
        var dotIdx = path.lastIndexOf('.');
        if (dotIdx >= 0 && dotIdx < path.length - 1) {
          exts.push(path.substring(dotIdx).toLowerCase());
        }
      }
      var hasVideo = exts.some(function (e) { return Magnet.VIDEO_EXTENSIONS.has(e); });
      if (hasVideo) videoCount++; else nonVideoCount++;
    }
    statTotal.textContent = data.length;
    statVideo.textContent = videoCount;
    statNonVideo.textContent = nonVideoCount;
  }

  historySearch.addEventListener('input', function () {
    loadHistory(this.value || undefined);
  });

  historyList.addEventListener('click', function (e) {
    var deleteBtn = e.target.closest('.btn-delete-history');
    if (deleteBtn) {
      deleteHistory(deleteBtn.dataset.id, e);
      return;
    }
    var item = e.target.closest('.history-item');
    if (!item) return;
    var magnet = item.dataset.magnet;
    if (magnet) {
      copyToClipboard(magnet).then(function () {
        showStatus('已复制磁力链接: ' + item.dataset.name, '');
        setTimeout(hideStatus, 2000);
      });
    }
  });

  // ===== 拖拽增强 =====
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
    var files = e.dataTransfer.files;
    if (files && files.length > 0) {
      var names = [];
      for (var i = 0; i < Math.min(files.length, 5); i++) {
        names.push(files[i].name);
      }
      var text = names.join(', ');
      if (files.length > 5) text += ' ...等 ' + files.length + ' 个文件';
      dropPreview.textContent = text;
    }
  });

  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  // ===== 文件读取 =====
  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.readAsArrayBuffer(file);
    });
  }

  async function getFilesFromEntry(entry) {
    if (entry.isFile) {
      return new Promise(function (resolve) {
        entry.file(function (file) { resolve([file]); });
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise(function (resolve) {
        reader.readEntries(function (entries) { resolve(entries); });
      });
      const files = [];
      for (var i = 0; i < entries.length; i++) {
        const childFiles = await getFilesFromEntry(entries[i]);
        files.push.apply(files, childFiles);
      }
      return files;
    }
    return [];
  }

  // ===== 核心：处理文件列表 =====
  async function processFiles(files) {
    const torrentFiles = Array.from(files).filter(isTorrentFile);

    if (torrentFiles.length === 0) {
      showStatus('未找到 .torrent 文件，请重新选择', 'error');
      return;
    }

    allTorrentResults = [];
    errorResults = [];
    hideStatus();
    hideFilterSummary();
    resultList.innerHTML = '';
    emptyState.classList.add('hidden');
    btnCopyAll.style.display = 'none';
    parseProgress.classList.remove('hidden');

    let successCount = 0;

    for (var i = 0; i < torrentFiles.length; i++) {
      var file = torrentFiles[i];
      parseProgressText.textContent = '解析中 ' + (i + 1) + '/' + torrentFiles.length;
      try {
        const fileData = await readFileAsArrayBuffer(file);
        const result = await window.T2M.Magnet.convertTorrent(fileData, file.name);
        result.fileList = extractFileList(result.info);
        allTorrentResults.push(result);
        successCount++;
      } catch (err) {
        errorResults.push({ name: file.name, error: err.message });
      }
    }

    parseProgress.classList.add('hidden');
    closeDrawer();

    // 移动端：解析完成后切到结果页签
    if (isMobileLayout()) switchTab('results');

    renderFilteredResults();

    if (errorResults.length > 0) {
      const errorMsg = errorResults.map(function (e) { return e.name + ': ' + e.error; }).join('; ');
      showStatus('部分文件转换失败: ' + errorMsg, 'error');
    } else if (allTorrentResults.length > 0) {
      showStatus('成功转换 ' + allTorrentResults.length + ' 个种子文件', '');
      setTimeout(function () {
        if (statusEl.textContent.includes('成功转换')) hideStatus();
      }, 2000);

      // 保存历史
      for (var j = 0; j < allTorrentResults.length; j++) {
        var r = allTorrentResults[j];
        saveHistory(r.name, r.infoHash, r.magnet, r.fileList);
      }
    }
  }

  // ===== 过滤与渲染 =====
  function renderFilteredResults() {
    const showVideoOnly = chkVideoOnly.checked;
    const Magnet = window.T2M.Magnet;

    let filtered = allTorrentResults;
    let excluded = [];

    if (showVideoOnly) {
      excluded = allTorrentResults.filter(function (r) { return !Magnet.hasVideoFiles(r.info); });
      filtered = allTorrentResults.filter(function (r) { return Magnet.hasVideoFiles(r.info); });
    }

    resultList.innerHTML = '';

    if (filtered.length > 0) {
      for (let i = 0; i < filtered.length; i++) {
        resultList.appendChild(renderResultItem(filtered[i], i));
      }
      btnCopyAll.style.display = '';
      bindCopyButtons(filtered);
      bindRowClicks(filtered);
      emptyState.classList.add('hidden');
    } else {
      btnCopyAll.style.display = 'none';
      if (allTorrentResults.length > 0) {
        showStatus('已转换 ' + allTorrentResults.length + ' 个种子，但全部不含视频文件，已过滤', 'error');
      } else if (errorResults.length === 0) {
        emptyState.classList.remove('hidden');
      }
    }

    // 错误条目行内展示（追加在末尾，红色标注）
    for (let k = 0; k < errorResults.length; k++) {
      resultList.appendChild(renderErrorItem(errorResults[k]));
    }

    if (showVideoOnly) {
      renderFilterSummary(allTorrentResults, excluded);
    } else {
      hideFilterSummary();
    }
  }

  function renderResultItem(result, index) {
    const li = document.createElement('li');
    li.className = 'result-item';

    const fileList = result.fileList || [];
    const totalSize = getTotalSize(fileList);
    const metaParts = [];
    if (fileList.length > 0) metaParts.push(fileList.length + ' 个文件');
    if (totalSize > 0) metaParts.push(formatSize(totalSize));
    metaParts.push(result.infoHash.substring(0, 12) + '…');

    li.innerHTML =
      '<div class="result-row" data-index="' + index + '">' +
        '<div class="result-info">' +
          '<div class="result-name">' + escapeHTML(result.name) + '</div>' +
          '<div class="result-meta">' + metaParts.join(' · ') + '</div>' +
        '</div>' +
        '<div class="result-actions">' +
          '<button class="btn-copy" data-index="' + index + '">复制</button>' +
        '</div>' +
      '</div>';

    return li;
  }

  function renderErrorItem(err) {
    const li = document.createElement('li');
    li.className = 'result-item result-item-error';
    li.innerHTML =
      '<div class="result-row">' +
        '<div class="result-info">' +
          '<div class="result-name">' + escapeHTML(err.name) + '</div>' +
          '<div class="result-meta result-meta-error">' + escapeHTML(err.error) + '</div>' +
        '</div>' +
      '</div>';
    return li;
  }

  function bindRowClicks(results) {
    const rows = resultList.querySelectorAll('.result-row');
    rows.forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        const index = parseInt(this.dataset.index);
        if (results[index]) openDrawer(results[index]);
      });
    });
  }

  function bindCopyButtons(magnets) {
    const buttons = resultList.querySelectorAll('.btn-copy');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.stopPropagation();
        const index = parseInt(this.dataset.index);
        const magnet = magnets[index].magnet;
        try {
          await copyToClipboard(magnet);
          this.textContent = '已复制';
          this.classList.add('copied');
          setTimeout(function () {
            btn.textContent = '复制';
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          this.textContent = '失败';
          setTimeout(function () {
            btn.textContent = '复制';
          }, 2000);
        }
      });
    });
  }

  // ===== 详情抽屉 =====
  let drawerResult = null;

  function openDrawer(result) {
    drawerResult = result;
    const fileList = result.fileList || [];
    drawerName.textContent = result.name;
    drawerSize.textContent = formatSize(getTotalSize(fileList));
    drawerFileCount.textContent = fileList.length + ' 个';
    drawerFiles.innerHTML = fileList.length > 0
      ? fileList.map(function (f) {
          return '<li class="drawer-file-item">' +
            '<span class="drawer-file-path">' + escapeHTML(f.path) + '</span>' +
            '<span class="drawer-file-size">' + formatSize(f.size) + '</span>' +
          '</li>';
        }).join('')
      : '<li class="drawer-file-item"><span class="drawer-file-path">（无文件信息）</span></li>';
    drawerHash.textContent = result.infoHash;
    drawerMagnet.textContent = result.magnet;

    drawer.classList.remove('hidden');
    drawerMask.classList.remove('hidden');
    document.body.classList.add('drawer-open');
  }

  function closeDrawer() {
    drawer.classList.add('hidden');
    drawerMask.classList.add('hidden');
    document.body.classList.remove('drawer-open');
    drawerResult = null;
  }

  drawerClose.addEventListener('click', closeDrawer);
  drawerMask.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.classList.contains('hidden')) closeDrawer();
  });

  btnDrawerCopyMagnet.addEventListener('click', async function () {
    if (!drawerResult) return;
    try {
      await copyToClipboard(drawerResult.magnet);
      this.textContent = '已复制';
      setTimeout(function () { btnDrawerCopyMagnet.textContent = '复制磁力链接'; }, 2000);
    } catch (err) {
      this.textContent = '复制失败，请重试';
      setTimeout(function () { btnDrawerCopyMagnet.textContent = '复制磁力链接'; }, 2000);
    }
  });

  btnDrawerCopyHash.addEventListener('click', async function () {
    if (!drawerResult) return;
    try {
      await copyToClipboard(drawerResult.infoHash);
      this.textContent = '已复制';
      this.classList.add('copied');
      setTimeout(function () {
        btnDrawerCopyHash.textContent = '复制 Hash';
        btnDrawerCopyHash.classList.remove('copied');
      }, 2000);
    } catch (err) {
      this.textContent = '失败';
      setTimeout(function () { btnDrawerCopyHash.textContent = '复制 Hash'; }, 2000);
    }
  });

  // ===== 一键复制全部 =====
  async function copyAll() {
    const showVideoOnly = chkVideoOnly.checked;
    const Magnet = window.T2M.Magnet;
    const magnets = showVideoOnly
      ? allTorrentResults.filter(function (r) { return Magnet.hasVideoFiles(r.info); })
      : allTorrentResults;
    if (magnets.length === 0) return;
    const allMagnets = magnets.map(function (r) { return r.magnet; }).join('\n');
    try {
      await copyToClipboard(allMagnets);
      const originalHTML = btnCopyAll.innerHTML;
      btnCopyAll.innerHTML = '已复制 (' + magnets.length + ' 条)';
      setTimeout(function () {
        btnCopyAll.innerHTML = originalHTML;
      }, 2000);
    } catch (err) {
      btnCopyAll.textContent = '复制失败，请重试';
      setTimeout(function () {
        btnCopyAll.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 一键复制全部';
      }, 2000);
    }
  }

  // ===== 过滤摘要 =====
  function collectAllExtensions(results) {
    const Magnet = window.T2M.Magnet;
    const videoExts = new Set();
    const nonVideoExts = new Set();

    for (var i = 0; i < results.length; i++) {
      const exts = Magnet.getFileExtensions(results[i].info);
      for (var j = 0; j < exts.length; j++) {
        if (Magnet.VIDEO_EXTENSIONS.has(exts[j])) {
          videoExts.add(exts[j]);
        } else {
          nonVideoExts.add(exts[j]);
        }
      }
    }

    return {
      video: Array.from(videoExts).sort(),
      nonVideo: Array.from(nonVideoExts).sort()
    };
  }

  function renderFilterSummary(all, excluded) {
    const extData = collectAllExtensions(all);

    if (excluded.length > 0) {
      filterHeaderText.textContent = '已过滤 ' + excluded.length + ' 个非视频种子';
      filterHeaderText.className = '';
    } else {
      filterHeaderText.textContent = '所有种子均含视频';
      filterHeaderText.className = 'all-video';
    }

    filterVideoExts.innerHTML = extData.video.length > 0
      ? extData.video.map(function (e) { return '<code class="ext-tag ext-video" data-ext="' + e + '">' + e + '</code>'; }).join('')
      : '<span style="color:var(--color-text-muted)">(无)</span>';
    filterNonVideoExts.innerHTML = extData.nonVideo.length > 0
      ? extData.nonVideo.map(function (e) { return '<code class="ext-tag ext-nonvideo" data-ext="' + e + '">' + e + '</code>'; }).join('')
      : '<span style="color:var(--color-text-muted)">(无)</span>';

    if (extData.nonVideo.length > 0) {
      const escaped = extData.nonVideo.map(function (e) { return e.replace('.', '\\.'); });
      filterRegex.textContent = '\\.(' + escaped.map(function (e) { return e.substring(2); }).join('|') + ')$';
      filterRegexRow.classList.remove('hidden');
    } else {
      filterRegexRow.classList.add('hidden');
    }

    filterSummary.classList.remove('hidden');
  }

  function hideFilterSummary() {
    filterSummary.classList.add('hidden');
  }

  // ===== 事件绑定 =====

  // 文件选择
  btnSelectFiles.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
      processFiles(fileInput.files);
      fileInput.value = '';
    }
  });

  // 文件夹选择
  btnSelectFolder.addEventListener('click', function () { folderInput.click(); });
  folderInput.addEventListener('change', function () {
    if (folderInput.files.length > 0) {
      processFiles(folderInput.files);
      folderInput.value = '';
    }
  });

  // 点击 mini 拖拽区打开文件选择
  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  dropZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // 拖拽放下
  dropZone.addEventListener('drop', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    dropPreview.textContent = '';

    const items = e.dataTransfer.items;
    if (!items) return;

    const files = [];

    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
        if (entry) {
          const entryFiles = await getFilesFromEntry(entry);
          files.push.apply(files, entryFiles);
        } else {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
    }

    if (files.length > 0) processFiles(files);
  });

  // 一键复制全部
  btnCopyAll.addEventListener('click', copyAll);

  // 视频过滤复选框
  chkVideoOnly.addEventListener('change', function () {
    if (allTorrentResults.length > 0) renderFilteredResults();
  });

  // 过滤摘要事件
  filterSummary.addEventListener('click', async function (e) {
    const tag = e.target.closest('.ext-tag');
    if (!tag) return;
    try {
      await copyToClipboard(tag.dataset.ext);
      tag.classList.add('copied');
      setTimeout(function () { tag.classList.remove('copied'); }, 1500);
    } catch (e) {}
  });

  btnCopyRegex.addEventListener('click', async function () {
    const regex = filterRegex.textContent;
    if (!regex) return;
    try {
      await copyToClipboard(regex);
      btnCopyRegex.textContent = '已复制';
      btnCopyRegex.classList.add('copied');
      setTimeout(function () {
        btnCopyRegex.textContent = '复制';
        btnCopyRegex.classList.remove('copied');
      }, 2000);
    } catch (e) {
      btnCopyRegex.textContent = '失败';
      setTimeout(function () { btnCopyRegex.textContent = '复制'; }, 2000);
    }
  });

  // 全局粘贴
  document.addEventListener('paste', function (e) {
    const items = e.clipboardData.items;
    if (!items) return;
    const files = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  });

  // ===== 初始化 =====
  checkAuthStatus();

})();

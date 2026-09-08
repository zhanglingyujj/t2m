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
  const chkInjectTrackers = document.getElementById('chkInjectTrackers');
  const filterSummary = document.getElementById('filterSummary');
  const filterHeaderText = document.getElementById('filterHeaderText');
  const filterVideoExts = document.getElementById('filterVideoExts');
  const filterNonVideoExts = document.getElementById('filterNonVideoExts');
  const filterRegexRow = document.getElementById('filterRegexRow');
  const filterRegex = document.getElementById('filterRegex');
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
  const resultsView = document.getElementById('resultsView');
  const historySearch = document.getElementById('globalSearch');
  const resultCount = document.getElementById('resultCount');
  const historyCount = document.getElementById('historyCount');
  const navHistory = document.getElementById('navHistory');
  const statsResults = document.getElementById('statsResults');
  const statsHistory = document.getElementById('statsHistory');
  const statConverted = document.getElementById('statConverted');
  const statWithVideo = document.getElementById('statWithVideo');
  const statFiltered = document.getElementById('statFiltered');
  const statFailed = document.getElementById('statFailed');
  const historyList = document.getElementById('historyList');
  const statTotal = document.getElementById('statTotal');
  const statVideo = document.getElementById('statVideo');
  const statNonVideo = document.getElementById('statNonVideo');
  const drawerMask = document.getElementById('drawerMask');
  const drawer = document.getElementById('drawer');
  const drawerName = document.getElementById('drawerName');
  const drawerSize = document.getElementById('drawerSize');
  const drawerFileCount = document.getElementById('drawerFileCount');
  const drawerCreationDate = document.getElementById('drawerCreationDate');
  const drawerTrackerTitle = document.getElementById('drawerTrackerTitle');
  const drawerTrackers = document.getElementById('drawerTrackers');
  const drawerFiles = document.getElementById('drawerFiles');
  const drawerHash = document.getElementById('drawerHash');
  const btnDrawerCopyHash = document.getElementById('btnDrawerCopyHash');
  const drawerMagnet = document.getElementById('drawerMagnet');
  const btnDrawerCopyMagnet = document.getElementById('btnDrawerCopyMagnet');
  const btnDrawerOpenMagnet = document.getElementById('btnDrawerOpenMagnet');
  const btnDrawerShareMagnet = document.getElementById('btnDrawerShareMagnet');
  const drawerClose = document.getElementById('drawerClose');
  const chkIncludeDn = document.getElementById('chkIncludeDn');
  const chkIncludeTr = document.getElementById('chkIncludeTr');
  const hashFormatInputs = document.querySelectorAll('input[name="hashFormat"]');
  const paginationResults = document.getElementById('pagination');
  const paginationHistory = document.getElementById('paginationHistory');

  // ===== 状态 =====
  let allTorrentResults = [];
  let errorResults = [];
  let historyData = [];
  let isAuthenticated = false;

  // 分页状态
  let pageSize = 20;
  let pageNum = 1;

  // ===== 工具函数 =====
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
  }

  // Web Share 能力探测（不可用时分享按钮不渲染）
  function canShareText() {
    try {
      return typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ text: 'x' });
    } catch (e) {
      return false;
    }
  }
  const shareSupported = canShareText();

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
   * 当前 info hash 显示/复制格式
   */
  function currentHashFormat() {
    const checked = document.querySelector('input[name="hashFormat"]:checked');
    return checked ? checked.value : 'hex';
  }

  function formatHash(infoHash) {
    return currentHashFormat() === 'base32'
      ? window.T2M.Magnet.hexToBase32(infoHash)
      : infoHash;
  }

  /**
   * 按当前注入开关与输出选项拼接磁力链接
   * @param {{infoHash: string, name: string, trackers: string[]}} result
   * @returns {string}
   */
  function composeMagnet(result) {
    const trackers = chkInjectTrackers.checked
      ? window.T2M.Magnet.injectPublicTrackers(result.trackers)
      : result.trackers;
    return window.T2M.Magnet.buildMagnetLink(result.infoHash, result.name, trackers, {
      includeName: chkIncludeDn.checked,
      includeTrackers: chkIncludeTr.checked
    });
  }

  /**
   * 一键打开：触发 magnet: URI 交给系统客户端处理
   */
  function openMagnet(magnet) {
    window.location.href = magnet;
  }

  async function shareMagnet(name, magnet) {
    await navigator.share({ title: name, text: magnet });
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

  // ===== 右栏视图切换（结果 / 历史） =====
  let currentView = 'results';

  function switchView(view) {
    closeDrawer();
    currentView = view;
    const isHistory = view === 'history';
    historyPanel.classList.toggle('hidden', !isHistory);
    resultsView.classList.toggle('hidden', isHistory);
    statsResults.classList.toggle('hidden', isHistory);
    statsHistory.classList.toggle('hidden', !isHistory);
    filterSummary.classList.toggle('hidden', isHistory || !filterSummaryShown);
    historySearch.placeholder = isHistory ? '搜索历史记录…' : '搜索转换结果…';
    document.querySelectorAll('.nav-item[data-view]').forEach(function (item) {
      item.classList.toggle('active', item.dataset.view === view);
    });
    btnCopyAll.style.display = isHistory ? 'none' : (resultList.children.length > 0 ? '' : 'none');
  }

  document.querySelectorAll('.nav-item[data-view]').forEach(function (item) {
    item.addEventListener('click', function () { switchView(item.dataset.view); });
  });

  // ===== Auth 模块 =====
  async function checkAuthStatus() {
    try {
      const resp = await fetch('/api/auth/status');
      const data = await resp.json();
      isAuthenticated = data.authenticated;
      updateAuthUI(data);
      if (isAuthenticated) loadHistory();
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
      navHistory.style.display = '';
    } else {
      btnLogin.style.display = 'inline-flex';
      authUser.classList.remove('active');
      loginDropdown.classList.remove('active');
      navHistory.style.display = 'none';
      switchView('results');
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
        historyPageNum = 1;
        renderHistory(historyData);
      }
    } catch (e) {}
  }

  async function saveHistory(name, infoHash, magnet, files, trackers) {
    if (!isAuthenticated) return;
    try {
      const totalSize = getTotalSize(files);
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          infoHash: infoHash,
          magnet: magnet,
          fileCount: files.length,
          totalSize: totalSize,
          files: files,
          trackers: trackers || []
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

  let historyPageNum = 1;
  let historyPageSize = 20;

  const historyPager = setupPagination(paginationHistory, function (n) {
    historyPageNum = n;
    renderHistory(historyData);
    const listCard = paginationHistory.closest('.list-card');
    if (listCard) listCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, function (sz) {
    historyPageSize = sz;
    historyPageNum = 1;
    renderHistory(historyData);
  });

  function renderHistory(data) {
    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / historyPageSize));
    if (historyPageNum > totalPages) historyPageNum = totalPages;
    const start = (historyPageNum - 1) * historyPageSize;
    const pageData = data.slice(start, start + historyPageSize);

    if (pageData.length === 0) {
      historyList.innerHTML = '<li class="history-empty">暂无历史记录</li>';
    } else {
      historyList.innerHTML = pageData.map(function (item) {
        var fileCount = item.file_count;
        var totalSize = item.total_size;
        var meta = [];
        if (fileCount) meta.push(fileCount + ' 个文件');
        if (totalSize) meta.push(formatSize(totalSize));
        return '<li class="history-item" data-id="' + escapeHTML(String(item.id)) + '" data-magnet="' + escapeHTML(item.magnet) + '" data-name="' + escapeHTML(item.name) + '">' +
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
    const History = window.T2M.History;
    var videoCount = 0;
    var nonVideoCount = 0;
    for (var i = 0; i < data.length; i++) {
      if (History.rowToView(data[i]).view.hasVideo) videoCount++; else nonVideoCount++;
    }
    statTotal.textContent = data.length;
    historyCount.textContent = data.length > 0 ? data.length + ' 条' : '';
    statVideo.textContent = videoCount;
    statNonVideo.textContent = nonVideoCount;
    historyPager.update(historyPageNum, totalPages, total);
  }

  historySearch.addEventListener('input', function () {
    if (currentView === 'history') {
      loadHistory(this.value || undefined);
    } else {
      renderFilteredResults(true);
    }
  });

  // sidebar 分区折叠
  document.querySelectorAll('.side-section-head').forEach(function (head) {
    head.addEventListener('click', function () {
      const section = this.closest('.side-section');
      const collapsed = section.classList.toggle('collapsed');
      this.setAttribute('aria-expanded', String(!collapsed));
    });
  });

  historyList.addEventListener('click', function (e) {
    var deleteBtn = e.target.closest('.btn-delete-history');
    if (deleteBtn) {
      deleteHistory(deleteBtn.dataset.id, e);
      return;
    }
    var item = e.target.closest('.history-item');
    if (!item) return;
    var record = historyData.find(function (h) { return String(h.id) === item.dataset.id; });
    if (record) openDrawer(window.T2M.History.rowToView(record).view);
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
        result.magnet = composeMagnet(result);
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

    renderFilteredResults(true);

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
        saveHistory(r.name, r.infoHash, r.magnet, r.files, r.trackers);
      }
    }
  }

  // ===== 过滤与渲染 =====
  function renderFilteredResults(resetPage) {
    if (resetPage) pageNum = 1;
    const showVideoOnly = chkVideoOnly.checked;
    const query = (historySearch.value || '').trim().toLowerCase();

    let filtered = allTorrentResults;
    let excluded = [];

    if (showVideoOnly) {
      excluded = allTorrentResults.filter(function (r) { return !r.hasVideo; });
      filtered = allTorrentResults.filter(function (r) { return r.hasVideo; });
    }

    const videoCount = filtered.length;
    if (query) {
      filtered = filtered.filter(function (r) {
        return r.name.toLowerCase().includes(query)
          || (r.infoHash || '').toLowerCase().includes(query);
      });
    }

    // 统计面板
    statConverted.textContent = allTorrentResults.length;
    statWithVideo.textContent = videoCount;
    statFiltered.textContent = excluded.length;
    statFailed.textContent = errorResults.length;

    // 分页：成功项在前、错误项在后统一计入总数
    const total = filtered.length + errorResults.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (pageNum > totalPages) pageNum = totalPages;
    const start = (pageNum - 1) * pageSize;
    const page = filtered.slice(start, start + pageSize);

    resultList.innerHTML = '';

    if (filtered.length > 0) {
      for (let i = start; i < start + page.length; i++) {
        resultList.appendChild(renderResultItem(filtered[i], i));
      }
      btnCopyAll.style.display = '';
      bindCopyButtons(filtered);
      bindOpenButtons(filtered);
      bindShareButtons(filtered);
      bindRowClicks(filtered);
      emptyState.classList.add('hidden');
    } else {
      btnCopyAll.style.display = 'none';
      if (query && allTorrentResults.length > 0) {
        emptyState.firstElementChild.textContent = '没有匹配「' + escapeHTML(historySearch.value.trim()) + '」的结果。';
        emptyState.classList.remove('hidden');
      } else if (allTorrentResults.length > 0) {
        showStatus('已转换 ' + allTorrentResults.length + ' 个种子，但全部不含视频文件，已过滤', 'error');
      } else if (errorResults.length === 0) {
        emptyState.firstElementChild.textContent = '还没有结果。';
        emptyState.classList.remove('hidden');
      }
    }

    // 错误条目行内展示（追加在末尾，红色标注，仅最后一页）
    if (pageNum === totalPages) {
      for (let k = 0; k < errorResults.length; k++) {
        resultList.appendChild(renderErrorItem(errorResults[k]));
      }
    }

    resultCount.textContent = total > 0 ? total + ' 条' : '';
    resultsPager.update(pageNum, totalPages, total);

    if (showVideoOnly) {
      renderFilterSummary(allTorrentResults, excluded);
    } else {
      hideFilterSummary();
    }
  }

  // ===== 分页 =====
  function setupPagination(bar, onGoto, onSizeChange) {
    const first = bar.querySelector('.pg-first');
    const prev = bar.querySelector('.pg-prev');
    const next = bar.querySelector('.pg-next');
    const last = bar.querySelector('.pg-last');
    const info = bar.querySelector('.pagination-info');
    const size = bar.querySelector('.pg-size');
    const state = { page: 1, totalPages: 1 };

    function update(page, totalPages, total) {
      state.page = page;
      state.totalPages = totalPages;
      if (total === 0) {
        bar.classList.add('hidden');
        return;
      }
      bar.classList.remove('hidden');
      first.disabled = prev.disabled = page <= 1;
      next.disabled = last.disabled = page >= totalPages;
      info.textContent = '第 ' + page + ' / ' + totalPages + ' 页 · 共 ' + total + ' 条';
    }

    first.addEventListener('click', function () { onGoto(1); });
    prev.addEventListener('click', function () { if (state.page > 1) onGoto(state.page - 1); });
    next.addEventListener('click', function () { if (state.page < state.totalPages) onGoto(state.page + 1); });
    last.addEventListener('click', function () { onGoto(state.totalPages); });
    size.addEventListener('change', function () {
      onSizeChange(parseInt(this.value, 10) || 20);
    });
    return { update: update };
  }

  const resultsPager = setupPagination(paginationResults, function (n) {
    pageNum = n;
    renderFilteredResults(false);
    const listCard = paginationResults.closest('.list-card');
    if (listCard) listCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, function (sz) {
    pageSize = sz;
    pageNum = 1;
    renderFilteredResults(false);
  });

  function renderResultItem(result, index) {
    const li = document.createElement('li');
    li.className = 'result-item';

    const files = result.files || [];
    const totalSize = result.totalSize || 0;
    const metaParts = [];
    if (files.length > 0) metaParts.push(files.length + ' 个文件');
    if (totalSize > 0) metaParts.push(formatSize(totalSize));
    metaParts.push(formatHash(result.infoHash).substring(0, 12) + '…');

    li.innerHTML =
      '<div class="result-row" data-index="' + index + '">' +
        '<div class="result-info">' +
          '<div class="result-name">' + escapeHTML(result.name) + '</div>' +
          '<div class="result-meta">' + metaParts.join(' · ') + '</div>' +
        '</div>' +
        '<div class="result-actions">' +
          '<button class="btn-action btn-copy" data-index="' + index + '">复制</button>' +
          '<div class="more-menu">' +
            '<button class="btn-action btn-more" aria-label="更多操作" title="更多操作">' +
              '<svg viewBox="0 0 24 24" fill="currentColor" class="more-dots"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>' +
            '</button>' +
            '<div class="more-dropdown">' +
              '<button class="more-item btn-open" data-index="' + index + '">打开</button>' +
              (shareSupported ? '<button class="more-item btn-share" data-index="' + index + '">分享</button>' : '') +
            '</div>' +
          '</div>' +
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

  function closeAllMoreMenus() {
    document.querySelectorAll('.more-menu.open').forEach(function (m) {
      m.classList.remove('open');
    });
  }

  // 行内「更多」下拉菜单
  resultList.addEventListener('click', function (e) {
    const moreBtn = e.target.closest('.btn-more');
    if (!moreBtn) return;
    e.stopPropagation();
    const menu = moreBtn.closest('.more-menu');
    document.querySelectorAll('.more-menu.open').forEach(function (m) {
      if (m !== menu) m.classList.remove('open');
    });
    menu.classList.toggle('open');
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.more-menu')) return;
    closeAllMoreMenus();
  });

  function bindCopyButtons(magnets) {
    const buttons = resultList.querySelectorAll('.btn-copy');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.stopPropagation();
        const index = parseInt(this.dataset.index);
        const magnet = composeMagnet(magnets[index]);
        closeAllMoreMenus();
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

  function bindOpenButtons(results) {
    const buttons = resultList.querySelectorAll('.btn-open');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const index = parseInt(this.dataset.index);
        if (results[index]) openMagnet(composeMagnet(results[index]));
        closeAllMoreMenus();
      });
    });
  }

  function bindShareButtons(results) {
    const buttons = resultList.querySelectorAll('.btn-share');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.stopPropagation();
        const index = parseInt(this.dataset.index);
        const result = results[index];
        if (!result) return;
        closeAllMoreMenus();
        try {
          await shareMagnet(result.name, composeMagnet(result));
        } catch (err) {}
      });
    });
  }

  // ===== 详情抽屉 =====
  let drawerResult = null;

  function openDrawer(result) {
    drawerResult = result;
    const files = result.files || [];
    drawerName.textContent = result.name;
    drawerName.title = result.name;
    drawerSize.textContent = formatSize(result.totalSize);
    drawerFileCount.textContent = files.length + ' 个';
    drawerCreationDate.textContent = window.T2M.Magnet.formatCreationDate(result.creationDate);

    const trackers = chkInjectTrackers.checked
      ? window.T2M.Magnet.injectPublicTrackers(result.trackers)
      : result.trackers;
    drawerTrackerTitle.textContent = chkInjectTrackers.checked
      ? 'Tracker（' + (result.trackers || []).length + ' + 注入 ' + (trackers.length - (result.trackers || []).length) + '）'
      : 'Tracker（' + (result.trackers || []).length + '）';
    drawerTrackers.innerHTML = trackers.length > 0
      ? trackers.map(function (tr) {
          const injected = !(result.trackers || []).includes(tr);
          return '<span class="tracker-tag' + (injected ? ' tracker-injected' : '') + '">' + escapeHTML(tr) + '</span>';
        }).join('')
      : '<span class="tracker-empty">（无）</span>';

    drawerFiles.innerHTML = files.length > 0
      ? files.map(function (f) {
          return '<li class="drawer-file-item">' +
            '<span class="drawer-file-path">' + escapeHTML(f.path) + '</span>' +
            '<span class="drawer-file-size">' + formatSize(f.size) + '</span>' +
          '</li>';
        }).join('')
      : '<li class="drawer-file-item"><span class="drawer-file-path">（无文件信息）</span></li>';
    drawerHash.textContent = formatHash(result.infoHash);
    drawerMagnet.textContent = composeMagnet(result);

    drawer.classList.remove('hidden');
    drawer.classList.remove('closing');
    if (drawerCloseTimer) {
      clearTimeout(drawerCloseTimer);
      drawerCloseTimer = null;
    }
    drawerMask.classList.remove('hidden');
    document.body.classList.add('drawer-open');
  }

  let drawerCloseTimer = null;

  function closeDrawer() {
    if (drawer.classList.contains('hidden') || drawer.classList.contains('closing')) return;
    drawer.classList.add('closing');
    drawerMask.classList.add('hidden');
    document.body.classList.remove('drawer-open');
    drawerResult = null;
    drawerCloseTimer = setTimeout(function () {
      drawerCloseTimer = null;
      drawer.classList.add('hidden');
      drawer.classList.remove('closing');
    }, 180);
  }

  drawerClose.addEventListener('click', closeDrawer);
  drawerMask.addEventListener('click', closeDrawer);

  // 点击抽屉以外区域收回（不锁定其他区域）
  document.addEventListener('click', function (e) {
    if (drawer.classList.contains('hidden')) return;
    if (e.target.closest('#drawer')) return;
    if (e.target.closest('.result-row') || e.target.closest('.history-item')) return;
    closeDrawer();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.classList.contains('hidden')) closeDrawer();
  });

  btnDrawerCopyMagnet.addEventListener('click', async function () {
    if (!drawerResult) return;
    try {
      await copyToClipboard(composeMagnet(drawerResult));
      this.textContent = '已复制';
      setTimeout(function () { btnDrawerCopyMagnet.textContent = '复制磁力链接'; }, 2000);
    } catch (err) {
      this.textContent = '复制失败，请重试';
      setTimeout(function () { btnDrawerCopyMagnet.textContent = '复制磁力链接'; }, 2000);
    }
  });

  btnDrawerOpenMagnet.addEventListener('click', function () {
    if (drawerResult) openMagnet(composeMagnet(drawerResult));
  });

  btnDrawerShareMagnet.addEventListener('click', async function () {
    if (!drawerResult) return;
    try {
      await shareMagnet(drawerResult.name, composeMagnet(drawerResult));
    } catch (err) {}
  });

  btnDrawerCopyHash.addEventListener('click', async function () {
    if (!drawerResult) return;
    try {
      await copyToClipboard(formatHash(drawerResult.infoHash));
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
    const magnets = showVideoOnly
      ? allTorrentResults.filter(function (r) { return r.hasVideo; })
      : allTorrentResults;
    if (magnets.length === 0) return;
    const allMagnets = magnets.map(function (r) { return composeMagnet(r); }).join('\n');
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
  let filterSummaryShown = false;

  function collectAllExtensions(results) {
    const Magnet = window.T2M.Magnet;
    const videoExts = new Set();
    const nonVideoExts = new Set();

    for (var i = 0; i < results.length; i++) {
      const exts = results[i].extensions || [];
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

    filterSummaryShown = true;
    filterSummary.classList.remove('hidden');
  }

  function hideFilterSummary() {
    filterSummaryShown = false;
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
    if (allTorrentResults.length > 0) renderFilteredResults(true);
  });

  // tracker 注入 / 输出格式选项：即时重新拼接磁力链接，同步结果、抽屉与历史复制
  function onOutputOptionChange() {
    for (var i = 0; i < allTorrentResults.length; i++) {
      allTorrentResults[i].magnet = composeMagnet(allTorrentResults[i]);
    }
    if (allTorrentResults.length > 0) renderFilteredResults(false);
    if (drawerResult) openDrawer(drawerResult);
  }

  chkInjectTrackers.addEventListener('change', onOutputOptionChange);
  chkIncludeDn.addEventListener('change', onOutputOptionChange);
  chkIncludeTr.addEventListener('change', onOutputOptionChange);
  hashFormatInputs.forEach(function (input) {
    input.addEventListener('change', onOutputOptionChange);
  });

  // 过滤摘要事件（后缀标签与正则均为点击即复制）
  filterSummary.addEventListener('click', async function (e) {
    const tag = e.target.closest('.ext-tag');
    const regexCode = e.target.closest('#filterRegex');
    const target = tag || regexCode;
    if (!target) return;
    try {
      await copyToClipboard(target.textContent);
      target.classList.add('copied');
      setTimeout(function () { target.classList.remove('copied'); }, 1500);
    } catch (e) {}
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
  if (!shareSupported) btnDrawerShareMagnet.style.display = 'none';
  checkAuthStatus();

})();

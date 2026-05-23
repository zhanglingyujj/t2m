/**
 * T2M - 主应用逻辑
 * 处理拖拽、文件选择、批量转换、复制等功能
 */
(function () {
  'use strict';

  // ===== DOM 元素 =====
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  const btnSelectFiles = document.getElementById('btnSelectFiles');
  const btnSelectFolder = document.getElementById('btnSelectFolder');
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');
  const resultList = document.getElementById('resultList');
  const btnCopyAll = document.getElementById('btnCopyAll');

  // ===== 状态 =====
  let magnetResults = [];

  // ===== 工具函数 =====
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
  }

  function hideStatus() {
    statusEl.className = 'status hidden';
  }

  function showResults() {
    resultsEl.classList.remove('hidden');
  }

  function hideResults() {
    resultsEl.classList.add('hidden');
  }

  /**
   * 判断文件是否为 .torrent 文件
   */
  function isTorrentFile(file) {
    return file.name.toLowerCase().endsWith('.torrent');
  }

  /**
   * 递归读取文件夹中的所有文件
   * @param {DataTransferItem} entry
   * @returns {Promise<File[]>}
   */
  async function getFilesFromEntry(entry) {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => resolve([file]));
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve) => {
        reader.readEntries((entries) => resolve(entries));
      });
      const files = [];
      for (const childEntry of entries) {
        const childFiles = await getFilesFromEntry(childEntry);
        files.push(...childFiles);
      }
      return files;
    }
    return [];
  }

  /**
   * 渲染单条结果
   */
  function renderResultItem(result, index) {
    const li = document.createElement('li');
    li.className = 'result-item';

    li.innerHTML = 
      '<div class="result-info">' +
        '<div class="result-name">' + escapeHTML(result.name) + '</div>' +
        '<div class="result-magnet">' + escapeHTML(result.magnet) + '</div>' +
      '</div>' +
      '<button class="btn-copy" data-index="' + index + '">复制</button>';

    return li;
  }

  /**
   * HTML 转义
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 复制文本到剪贴板
   */
  async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
  }

  // ===== 核心：处理文件列表 =====
  async function processFiles(files) {
    const torrentFiles = Array.from(files).filter(isTorrentFile);

    if (torrentFiles.length === 0) {
      showStatus('未找到 .torrent 文件，请重新选择', 'error');
      return;
    }

    // 重置状态
    magnetResults = [];
    hideResults();
    resultList.innerHTML = '';
    showStatus('正在处理 ' + torrentFiles.length + ' 个种子文件...', 'loading');
    dropZone.classList.add('processing');

    let successCount = 0;
    const errors = [];

    for (const file of torrentFiles) {
      try {
        const fileData = await readFileAsArrayBuffer(file);
        const result = await window.T2M.Magnet.convertTorrent(fileData, file.name);
        magnetResults.push(result);
        successCount++;
      } catch (err) {
        errors.push({ name: file.name, error: err.message });
      }
    }

    dropZone.classList.remove('processing');

    // 渲染结果
    if (magnetResults.length > 0) {
      for (let i = 0; i < magnetResults.length; i++) {
        resultList.appendChild(renderResultItem(magnetResults[i], i));
      }
      showResults();
      showStatus(
        '成功转换 ' + successCount + ' / ' + torrentFiles.length + ' 个种子文件',
        'loading'
      );

      // 绑定复制按钮
      bindCopyButtons();
    } else {
      hideResults();
    }

    if (errors.length > 0) {
      const errorMsg = errors.map(e => e.name + ': ' + e.error).join('; ');
      showStatus('部分文件转换失败: ' + errorMsg, 'error');
    } else if (magnetResults.length > 0) {
      // 1.5 秒后隐藏成功状态
      setTimeout(() => {
        if (statusEl.textContent.includes('成功转换')) {
          hideStatus();
        }
      }, 2000);
    }
  }

  /**
   * 读取文件为 ArrayBuffer
   */
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ===== 复制功能 =====
  function bindCopyButtons() {
    const buttons = resultList.querySelectorAll('.btn-copy');
    buttons.forEach(btn => {
      btn.addEventListener('click', async function () {
        const index = parseInt(this.dataset.index);
        const magnet = magnetResults[index].magnet;
        try {
          await copyToClipboard(magnet);
          this.textContent = '已复制 ✓';
          this.classList.add('copied');
          setTimeout(() => {
            this.textContent = '复制';
            this.classList.remove('copied');
          }, 2000);
        } catch {
          this.textContent = '复制失败';
          setTimeout(() => {
            this.textContent = '复制';
          }, 2000);
        }
      });
    });
  }

  /**
   * 一键复制全部
   */
  async function copyAll() {
    if (magnetResults.length === 0) return;
    const allMagnets = magnetResults.map(r => r.magnet).join('\n');
    try {
      await copyToClipboard(allMagnets);
      const originalText = btnCopyAll.innerHTML;
      btnCopyAll.innerHTML = '已复制 ✓ (' + magnetResults.length + ' 条)';
      setTimeout(() => {
        btnCopyAll.innerHTML = originalText;
      }, 2000);
    } catch {
      btnCopyAll.textContent = '复制失败，请重试';
      setTimeout(() => {
        btnCopyAll.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 一键复制全部';
      }, 2000);
    }
  }

  // ===== 事件绑定 =====

  // 点击按钮选择文件
  btnSelectFiles.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      processFiles(fileInput.files);
      fileInput.value = '';
    }
  });

  // 点击按钮选择文件夹
  btnSelectFolder.addEventListener('click', () => {
    folderInput.click();
  });

  folderInput.addEventListener('change', () => {
    if (folderInput.files.length > 0) {
      processFiles(folderInput.files);
      folderInput.value = '';
    }
  });

  // 点击拖拽区域也可以打开文件选择
  dropZone.addEventListener('click', (e) => {
    // 如果点击的是按钮或按钮内部元素，不触发文件选择
    if (e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    fileInput.click();
  });

  // 拖拽事件
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const items = e.dataTransfer.items;
    if (!items) return;

    const files = [];

    for (const item of items) {
      if (item.kind === 'file') {
        // 尝试获取 entry（支持文件夹）
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          const entryFiles = await getFilesFromEntry(entry);
          files.push(...entryFiles);
        } else {
          // 降级：不支持 webkitGetAsEntry 时直接获取文件
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    if (files.length > 0) {
      processFiles(files);
    }
  });

  // 一键复制全部
  btnCopyAll.addEventListener('click', copyAll);

  // 全局粘贴事件：支持 Ctrl+V 粘贴种子文件
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    if (!items) return;

    const files = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  });

})();

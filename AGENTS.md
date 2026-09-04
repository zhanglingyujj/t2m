# T2M — 种子转磁力链接

纯客户端 Web 应用，将 `.torrent` 种子文件转换为磁力链接。支持拖拽单个/多个种子文件或整个文件夹，输出换行分割的磁力链接列表，一键复制。

## 架构决策

### 为什么选客户端解析？

- **零服务端成本**：解析在浏览器中完成，Cloudflare Workers 仅托管静态资源，不消耗 CPU
- **隐私安全**：种子文件不会上传到服务器，全程在用户本地处理
- **离线可用**：静态资源可被 Service Worker 缓存，理论上支持离线使用
- **无文件大小限制**：不受 Worker 请求体大小限制

### Bencode 格式

种子文件使用 Bencode 编码，包含四种类型：

| 类型 | 格式 | 示例 |
|------|------|------|
| 字符串 | `<长度>:<内容>` | `4:spam` → `"spam"` |
| 整数 | `i<数字>e` | `i3e` → `3` |
| 列表 | `l<元素>e` | `l4:spam4:eggse` → `["spam","eggs"]` |
| 字典 | `d<键值对>e` | `d3:cow3:moo4:spam4:eggse` |

### 磁力链接格式

```
magnet:?xt=urn:btih:<40位十六进制info_hash>&dn=<URL编码的名称>&tr=<tracker地址>
```

info hash 是种子文件中 `info` 字典原始字节的 SHA-1 哈希值。关键步骤：

1. 解析 Bencode 找到 `info` 键对应的原始字节区间
2. 对该区间字节计算 SHA-1 → 得到 20 字节二进制哈希
3. 转为 40 位十六进制小写字符串
4. 拼接磁力链接

## 项目结构

```
T2M/
├── AGENTS.md              # 本文件
├── README.md              # 项目说明
├── wrangler.toml           # Cloudflare Workers 配置
├── package.json            # 仅用于 wrangler CLI
├── src/
│   └── index.js            # Worker 入口：托管静态资源
└── public/
    ├── index.html          # 主页面
    ├── style.css           # 样式
    ├── app.js              # UI 逻辑
    └── torrent-parser.js   # Bencode 解析 + 磁力链接生成
```

## 文件职责

| 文件 | 职责 |
|------|------|
| `public/torrent-parser.js` | Bencode 解码器，提取 info dict 原始字节，计算 SHA-1，构造磁力链接 |
| `public/app.js` | 拖拽/文件选择处理，批量解析，结果渲染，复制功能 |
| `public/index.html` | 页面结构与语义标签 |
| `public/style.css` | 响应式布局，拖拽区域高亮，结果列表样式 |
| `src/index.js` | Cloudflare Worker 入口，使用 `[assets]` 绑定托管静态文件 |

## 本地开发

```bash
# 安装依赖（仅 wrangler）
npm install

# 启动本地开发服务器
npx wrangler dev
```

## 部署

```bash
npx wrangler deploy
```

## 编码规范

- 纯 HTML/CSS/JS，无框架、无构建步骤、无第三方依赖
- JS 使用 ES6+ 语法（`const`/`let`、箭头函数、`async/await`）
- 函数命名使用小驼峰，文件名使用短横线分隔
- CSS 使用 CSS 变量管理颜色主题
- 所有注释和文档使用中文
- 全局变量挂载在 `window.T2M` 命名空间下以避免污染

## 兼容性

- 依赖 Web Crypto API（`crypto.subtle.digest`），所有现代浏览器均支持
- 依赖 `webkitdirectory` 属性实现文件夹选择（Chrome/Edge 原生支持，Firefox 不支持）
- 拖拽文件夹依赖 `DataTransferItem.webkitGetAsEntry()`（Chrome/Edge）

## Agent skills

### Issue tracker

Issues 跟踪在本仓库的 GitHub Issues（zhanglingyujj/t2m），通过 `gh` CLI 操作。See `docs/agents/issue-tracker.md`.

### Triage labels

使用五个默认 triage 标签（`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`），与 skill 内名称一致。See `docs/agents/triage-labels.md`.

### Domain docs

单上下文布局：根级 `CONTEXT.md` + `docs/adr/`。See `docs/agents/domain.md`.

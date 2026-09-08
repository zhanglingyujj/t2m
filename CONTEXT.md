# T2M 领域词汇

## torrentView（种子视图）

`T2M.Magnet.buildView` 组装、`convertTorrent`（fresh 解析）与 `T2M.History.rowToView`（历史行适配）共用的归一化种子视图：

```
{ name, infoHash, trackers, creationDate, files, totalSize, extensions, hasVideo }
```

- `files`：`{ path, size }` 列表，单文件与多文件布局在 Magnet 模块内部归一化（多文件 path 为相对根目录的路径，不含 `info.name` 前缀）
- `extensions`：含点号的小写扩展名数组（去重）
- 调用方（`app.js` 及后续的历史 adapter）不接触原始 `info` 字典；布局解析知识只在 Magnet 模块内存在一份
- 磁力链接不由 torrentView 携带，统一由 `Magnet.composeMagnet(view, options)`（纯函数，选项为显式参数）生成；app.js 侧 `readOutputOptions()` 是读 DOM 的薄 adapter

## History adapter（历史行适配器）

`public/history-adapter.js` 的 `T2M.History.rowToView(record)`：D1 history 行 → torrentView + 元信息（`id`/`createdAt`）。tracker 优先直读 `trackers_json` 列（新行）；旧行无该列时回退从 magnet 字符串反解。两个 adapter（fresh 解析 / 历史行）共用 `buildView` seam 的事实就是 torrentView 的合法性来源。

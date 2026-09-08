# T2M 领域词汇

## torrentView（种子视图）

`T2M.Magnet.convertTorrent` 返回的归一化种子视图：

```
{ name, infoHash, trackers, creationDate, files, totalSize, extensions, hasVideo }
```

- `files`：`{ path, size }` 列表，单文件与多文件布局在 Magnet 模块内部归一化（多文件 path 为相对根目录的路径，不含 `info.name` 前缀）
- `extensions`：含点号的小写扩展名数组（去重）
- 调用方（`app.js` 及后续的历史 adapter）不接触原始 `info` 字典；布局解析知识只在 Magnet 模块内存在一份
- 磁力链接不由 torrentView 携带，统一由 `composeMagnet`（app.js）按输出选项生成

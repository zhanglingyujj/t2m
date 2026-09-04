# 调研：同类种子/磁力工具的功能全景

> 对应 issue #2。来源均为一线站点/官方文档，检索于 2026-09。

## 竞品概览

| 工具 | 形态 | 关键能力 |
|------|------|----------|
| [anonymiz.com/torrent2magnet](https://anonymiz.com/torrent2magnet) | 浏览器端解析（与 t2m 同类） | 批量转换、公共 tracker 注入（23 个）、文件详情展示、每条结果单独复制/打开 |
| [RapidToolSet torrent-to-magnet](https://rapidtoolset.com/en/tool/torrent-to-magnet-converter) | 浏览器端解析 | 一键"在客户端打开"（直接触发 magnet URI）、显示 name/info hash；**不支持批量** |
| [magnet2torrent.com](https://magnet2torrent.com/) / [btmaster.net](https://www.btmaster.net/en) | 服务端转换 | 磁力→种子（依赖公共缓存或在线客户端取元数据，**必须有服务端**） |
| [torrenteditor.com](https://torrenteditor.com/) | 浏览器端编辑 | 编辑 tracker、创建日期、comment、publisher 等，可回存 .torrent |
| [Torrent File Editor（桌面）](https://torrent-file-editor.github.io/) | 桌面应用 | 从零创建种子、增删文件、改文件顺序、编辑全部元数据 |
| [anonymiz.com/torrent-editor](https://anonymiz.com/torrent-editor) | 浏览器端 | 同 torrenteditor，编辑 tracker/metadata + 校验内容 |

## 功能点提取与评估（纯客户端可行性）

| 功能 | 说明 | 价值 | 成本 | 纯客户端可行 |
|------|------|------|------|--------------|
| 种子详情展示 | name、总大小、文件列表、文件数、创建日期、comment、tracker 列表 | 高（评审/确认内容是否正确） | 低（bencode 已解析） | ✅ |
| 公共 tracker 注入 | 勾选后向磁力链接附加 20+ 公共 tracker | 高（提速、老种救活） | 低（内置列表） | ✅ |
| tracker 编辑 | 增删改 tracker 后重新生成磁力链接 | 中 | 中 | ✅ |
| 每条结果单独复制 / 全部复制 | 现有仅有全部复制 | 中 | 低 | ✅ |
| 一键在客户端打开 | `<a href="magnet:...">` 触发系统关联 | 中 | 极低 | ✅ |
| 输出格式选项 | 含/不含 dn、tr；info hash base32/hex 切换显示 | 低-中 | 低 | ✅ |
| 磁力链接 QR 码 | 供手机扫码接收 | 中（配合移动端） | 低（无依赖需手写或允许 qrcode 库——与无依赖原则冲突，需权衡） | ⚠️ |
| 磁力→种子（反向） | 需从 DHT/公共缓存取元数据 | 高 | 高 | ❌ 需服务端，架构锁死，范围外 |
| 种子健康（做种数） | 查询 tracker 的 scrape | 中 | 中 | ❌ 浏览器 CORS 限制，基本不可行 |
| 创建 .torrent | 从本地文件生成种子 | 中-高 | 中-高（bencode 编码 + 分片 SHA-1，纯客户端可行但工作量大） | ✅ 但成本高 |
| base32/hex info hash 显示与复制 | 辅助校验 | 低 | 极低 | ✅ |

## 结论

- 纯客户端可落地的高价值功能：**种子详情展示、公共 tracker 注入、每条单独复制、一键打开、输出格式选项**
- 磁力→种子与种子健康因需要服务端或受 CORS 限制，**建议列为范围外**
- 创建 .torrent 可行但成本明显高出一档，可列为 P2 可选项
- QR 码与"零第三方依赖"原则冲突，需用户定夺

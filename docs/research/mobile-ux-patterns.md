# 调研：同类工具移动端交互模式

> 对应 issue #3。来源为 UX 资料与 MDN 官方文档，检索于 2026-09。

## 文件导入：拖拽在触屏上不可用

HTML Drag and Drop API 在移动浏览器上不被支持，Chrome/Safari/Firefox 手机版均忽略拖拽交互（来源：ivyforms.com、saasui.design 上传模式综述）。通用结论：

- dropzone 必须内嵌**显眼的"点击选择文件"按钮**作为唯一可靠入口，拖拽只是桌面增强
- dropzone 需支持键盘操作（Enter/Space 触发 `input.click()`），兼顾无障碍
- 选中后**立即校验**（文件类型/数量），而不是等"提交"再报错

iOS Safari 的文件选择器支持"文件"App / iCloud 浏览 `.torrent` 文件，`<input type="file" accept=".torrent">` 即可用；多选在移动端场景较少，文件夹选择（webkitdirectory）在移动端不可用，可隐藏该入口。

## 结果输出：复制与分享

- **Web Share API**（`navigator.share()`，MDN）：调用系统原生分享面板，可分享文本/URL，移动端目标包括剪贴板、信息、邮件等；配合 `navigator.canShare()` 探测。移动端磁力链接"分享给其他 App/设备"的最自然通道。
- **Clipboard API**（MDN）：`navigator.clipboard.writeText` 在现代移动浏览器可用，但部分 Android WebView 需降级为 `document.execCommand('copy')` + 选中区。
- 推荐渐进增强：优先 Web Share（移动端显式"分享"按钮），剪贴板复制作为基础能力始终保留。

## 对 t2m 的设计输入

1. 移动端首屏 = 一个大按钮"选择 .torrent 文件"（触屏目标 ≥48px）
2. 结果卡片每条配「复制」「分享」（canShare 时显示）「在客户端打开」
3. 错误/校验即时反馈，触屏下避免 hover 依赖（tooltips 改为点击展开）
4. 批量结果在移动端改为折叠列表或仅显示条数 + 展开按钮，避免长列表滚动手势冲突

# T2M — 种子转磁力链接

> 纯客户端工具，将 `.torrent` 种子文件转换为磁力链接，支持批量处理。

## 功能

- 🎯 拖拽或选择单个/多个种子文件，一键转换为磁力链接
- 📁 支持选择整个文件夹，自动识别其中的 `.torrent` 文件
- 📋 每条链接独立复制 + 一键复制全部
- 🔒 完全在浏览器本地处理，文件不上传服务器
- ⚡ 部署在 Cloudflare Workers，全球边缘加速

## 使用方式

1. 打开页面
2. 拖拽 `.torrent` 文件到虚线区域，或点击选择文件/文件夹
3. 自动生成磁力链接列表
4. 点击复制按钮复制单条或全部链接
<img width="767" height="507" alt="image" src="https://github.com/user-attachments/assets/54a257de-3aa0-4b83-a6e7-dc9116b7a507" />


## 技术栈

- 前端：纯 HTML/CSS/JS，零依赖
- 解析：浏览器端 Bencode 解码 + Web Crypto API 计算 SHA-1
- 部署：Cloudflare Workers 静态站点

## 开发

```bash
npm install
npx wrangler dev
```

## 部署

```bash
npx wrangler deploy
```

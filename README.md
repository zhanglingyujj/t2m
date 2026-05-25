# T2M — 种子转磁力链接

> 纯客户端工具，将 `.torrent` 种子文件转换为磁力链接，支持批量处理、历史记录。

## 功能

- 拖拽或选择单个/多个种子文件，一键转换为磁力链接
- 支持选择整个文件夹，自动识别其中的 `.torrent` 文件
- 点击结果项展开查看种子内文件列表和大小
- 每条链接独立复制 + 一键复制全部 + 复制 info hash
- 登录后自动保存转换历史（D1 持久化），支持搜索和删除
- 视频过滤：仅显示包含视频文件的磁力链接
- 完全在浏览器本地解析，文件不上传服务器
- 部署在 Cloudflare Workers，全球边缘加速

## 技术栈

- 前端：纯 HTML/CSS/JS，零依赖
- 解析：浏览器端 Bencode 解码 + Web Crypto API 计算 SHA-1
- 认证：JWT（HS256） + httpOnly cookie
- 存储：Cloudflare D1（历史记录）
- 部署：Cloudflare Workers 静态站点 + API

## 开发

```bash
npm install
npx wrangler dev
```

## 部署

### 1. 创建 D1 数据库

```bash
npx wrangler d1 create t2m-db
```

将输出的 `database_id` 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "t2m-db"
database_id = "<粘贴 database_id>"
```

### 2. 初始化远程 D1 表结构

```bash
npx wrangler d1 execute t2m-db --file=schema.sql --remote
```

### 3. 设置环境变量

```bash
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put JWT_SECRET
```

> JWT_SECRET 可使用 `openssl rand -base64 32` 生成，或任意随机字符串。

### 4. 部署

```bash
npx wrangler deploy
```

## 本地 D1 初始化

本地开发使用 Miniflare 模拟 D1，首次运行前需初始化本地库：

```bash
npx wrangler d1 execute t2m-db --file=schema.sql
```
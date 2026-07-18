# 唯吾内容工作台 · Phase 1

这是独立部署的私有内容工作台。它不读取、不写入唯吾官网或现有陪跑数据看板的数据。

## 本地运行

```bash
cp .env.example .env.local
npm ci
npm run dev
```

`.env.local` 只允许以下浏览器公开变量：

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

不要把 `sb_secret_`、service-role key、数据库密码或任何平台 Cookie 放入 Vite 变量、Git 历史或 Cloudflare Pages。`VITE_` 前缀会被发送到浏览器。

## 验证

```bash
npm run test -- --run
npm run typecheck
npm run build
npm run test:e2e
```

E2E 使用一个**仓库外**的预览专用 owner 会话。手动完成预览环境魔法链接登录后，将 Playwright `storageState` 存放在仓库外，并执行：

```bash
E2E_BASE_URL=https://<preview-url> E2E_STORAGE_STATE=/absolute/path/preview-owner.json npm run test:e2e
```

不提供该临时会话时 E2E 会安全跳过，避免真实账号、邮箱或登录状态进入仓库。发布前至少检查：桌面和手机登录后看到同一条内容；B端/C端切换不混入数据；脚本和拍摄任务仍对应正确的 `content_id`；非 owner 写入在 RLS 下被拒绝。

## Supabase 上线前检查

1. 建立独立 Supabase 项目，并按顺序执行 `supabase/migrations/` 中的迁移。
2. 确认每张公开表启用了 RLS，owner 才有 insert/update/delete，readonly 只有 select。
3. 确认 `content-assets` bucket 仍是私有 bucket，签名链接只在需要时生成；不开放 bucket 的 public URL。
4. 在 Auth Redirect URLs 中加入本地地址、Cloudflare Pages Preview URL 和 Production URL。
5. 用 owner 和 readonly 两个预览账号分别验证权限；再下载一次 JSON 完整备份并预览校验。

## Cloudflare Pages

独立创建一个 Pages 项目，根目录为 `apps/weiwu-content-os`：

| 配置 | 值 |
| --- | --- |
| Node | `20.19` 或更新版本 |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| 环境变量 | `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` |

`public/_headers` 会随构建产物部署，包含 CSP、点击劫持防护、MIME 嗅探防护和最小化 Permissions Policy。变更 CSP 时必须保留 Supabase 的 HTTPS/WSS connect 规则，并在 Preview 验证登录和同步。

## 回滚与恢复

- 前端回滚：在 Cloudflare Pages 中将上一份已验证的部署重新设为 Production；不要通过删除文件或修改数据库实现回滚。
- 数据库迁移：先导出 JSON 备份，然后只追加一条新的**前向迁移**修正问题；不要删除表或回退已在生产运行的迁移。
- 内容误归档：在「我的工作台 → 可恢复归档」恢复；该动作会清空 `deleted_at` 并写入 `activity_logs` 审计记录。
- JSON 备份：第一版提供本地下载和格式预览，不会自动覆盖云端数据。恢复导入要等后续实现带有 dry-run、重复检测、批次审计的导入流程。

## 性能边界

首屏不加载视频、WebGL、自动化浏览器或重型动画依赖。界面只保留 CSS 的短过渡，并尊重 `prefers-reduced-motion`；所有列表均按当前内容线查询，避免无关数据在手机端同时渲染。

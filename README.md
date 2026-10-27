# 扬州猫猫图鉴

线上测试地址（GitHub Pages）：

<https://ltkl66.github.io/yangzhou-cat-atlas/>

一个面向扬州街猫的地图图鉴：用地图展示猫猫点位，支持拍照打卡、记录探望与线下投喂，并由管理员审核访客投稿。

当前版本是**已接入 Supabase 的本地静态版本**。前端仍可直接部署到静态托管，数据、照片和管理员登录由 Supabase 提供。

## 本地启动

在项目目录执行：

```bash
cd "/Users/tl/Documents/ChatGPT/剪辑/扬州猫猫图鉴"
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开 <http://127.0.0.1:4173/>。

不要直接双击 `index.html`，用本地 HTTP 服务打开可以避免浏览器对本地文件的限制。

## 首次配置 Supabase

配置信息已经写在前端文件 `assets/js/app.js` 顶部：

```js
const SUPABASE_URL = "https://ghkfdmdnuyjksbeavwrz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";
```

这里只能放 Supabase 的公开 `publishable` key。**绝对不能把 `secret` key、`service_role` key 或数据库密码放进前端文件。**

### 1. 执行数据库初始化脚本

在 Supabase Dashboard 打开：

```text
SQL Editor → New query
```

把 `supabase/schema.sql` 的完整内容粘贴进去并执行。脚本会创建：

- `profiles`：管理员资料与角色
- `cats`：猫猫档案、坐标、照片和审核状态
- `cat_interactions`：投喂与探望流水
- `cat_directory`：带投喂/探望统计的目录视图
- `cat-photos`：公开读取的猫猫照片存储桶
- RLS 权限策略
- 4 个示例点位

脚本可以重复执行，不会覆盖已有的猫猫和互动记录。

### 2. 创建管理员账号

在 Supabase Dashboard 打开：

```text
Authentication → Users → Add user
```

创建一个邮箱和密码账号。然后回到 SQL Editor 执行下面这段，把邮箱替换成刚创建的账号：

```sql
insert into public.profiles (id, display_name, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)),
  'admin'
from auth.users
where email = 'YOUR_EMAIL@example.com'
on conflict (id) do update set role = 'admin';
```

建议同时关闭公开注册：

```text
Authentication → Sign In / Providers → Email
关闭 Allow new users to sign up
```

网站右上角的「管理员」按钮用于登录。普通访客不需要登录。

## 当前数据流

```text
管理员登录 → 拍照打卡 → 照片上传 Storage → 点位直接发布
普通访客 → 拍照打卡 → 照片上传 Storage → 点位进入待审核 → 管理员审核后发布
任何访客 → 投喂/探望记录 → 写入 cat_interactions → 目录统计自动更新
```

管理员点开右上角「审核台」可以查看待审核投稿。审核通过后，点位会立即出现在地图和列表中。

## 文件结构

```text
index.html                       页面结构
assets/css/styles.css            图鉴、地图和审核界面样式
assets/js/app.js                 地图、定位、拍照、Supabase 数据与审核逻辑
assets/vendor/leaflet/           Leaflet 本地依赖
assets/vendor/supabase/          Supabase JS 本地依赖
assets/img/                      示例猫插画与 favicon
supabase/schema.sql              数据库、RLS、Storage 和示例数据初始化
```

## 高德地图说明

原型目前使用 Leaflet 加载高德栅格瓦片，优点是无需申请 Key 就能快速预览。该瓦片入口并非高德面向正式项目的官方 JS API 接入方式，**正式上线前应改用高德官方 JS API 和高德开放平台 Key**，并按高德的使用条款完成备案与配额配置。

当前 GPS 坐标已经转换为 GCJ02，地图选点也直接使用 GCJ02。

## 投喂链接

外部投喂/付款链接在 `assets/js/app.js` 顶部配置：

```js
const FEED_LINK = "";
```

填入公开可访问的付款或物资支持链接后，投喂弹窗的按钮会改为打开该链接；留空时只记录线下投喂。

## 上线方式

这是纯静态站点，可以直接部署到 Cloudflare Pages、Netlify、Vercel、腾讯云 EdgeOne Pages 或 CloudBase。

- 朋友测试阶段可以使用平台默认测试域名，不需要备案。
- 正式面向中国大陆公开运营，建议使用大陆服务器和自定义域名，并办理 ICP 备案；上线后通常还需要公安备案。
- Cloudflare Pages、Netlify、Vercel 的默认域名无需备案，但大陆访问稳定性因网络环境而异。

部署时直接上传整个 `扬州猫猫图鉴` 目录即可，不需要构建命令。

## 测试阶段限制

- 照片限制为 5 MB，前端会先压缩到最长边 1280px。
- 目前访客上传没有验证码和频率限制，公开发布前需要补充限流、内容审核和异常图片检查。
- 猫猫照片存放在公开读取的 `cat-photos` 桶中；审核未通过的照片也拥有公开 URL，但不会出现在网站目录里。
- 当前地图仍是预览瓦片，正式上线前需要申请高德官方 Key。

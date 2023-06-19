## 快速开始

### 安装主题

1. 在 Hexo 目录下执行
   git clone https://github.com/fi3ework/hexo-theme-archer.git themes/archer --depth=1

2. 修改 Hexo 目录下的 \_config.yml 的 theme 字段为 archer
3. 添加 sidebar 启用支持：
   在 Hexo 目录下的 \_config.yml 中添加以下字段（不是 archer 下的 \_config.yml）

```
jsonContent:
  meta: true
  pages: false
  posts:
    title: true
    date: true
    path: true
    text: false
    raw: false
    content: false
    slug: false
    updated: false
    comments: false
    link: false
    permalink: true
    excerpt: false
    categories: true
    tags: true

```

### 创建一个博客

```bash
$ hexo new "My New Post"
```

More info: [Writing](https://hexo.io/docs/writing.html)

### 启动服务器

```bash
$ hexo server
或者
$ npm run server
```

More info: [Server](https://hexo.io/docs/server.html)

### 生成要部署的静态文件

```bash
$ hexo generate
或者
npm run build
```

More info: [Generating](https://hexo.io/docs/generating.html)

### 部署到 github 站点

直接部署到 github page

```
$ hexo clean && hexo generate --deploy
```

或者

```
$ npm run deploy

```

```

More info: [Deployment](https://hexo.io/docs/one-command-deployment.html)
```

### 部署到个人站点

```
$ npm run build:mysite 打包手动放到服务器位置 /home/blog
```

`推荐` 部署方式
或者提交代码到 master 会触发 git-hook 自动构建 jenkisn 构建 完美！

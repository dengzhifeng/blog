
## 快速开始
### 安装主题
1. 在Hexo目录下执行
git clone https://github.com/fi3ework/hexo-theme-archer.git themes/archer --depth=1

2. 修改Hexo目录下的 _config.yml 的 theme 字段为 archer
3. 添加sidebar启用支持：
在Hexo目录下的 _config.yml 中添加以下字段（不是archer下的 _config.yml）
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

``` bash
$ hexo new "My New Post"
```

More info: [Writing](https://hexo.io/docs/writing.html)

### 启动服务器

``` bash
$ hexo server
或者
$ npm run server
```

More info: [Server](https://hexo.io/docs/server.html)

### 生成要部署的静态文件

``` bash
$ hexo generate
或者
npm run build
```

More info: [Generating](https://hexo.io/docs/generating.html)




### 部署到站点
直接部署到github page
```
$ hexo clean && hexo generate --deploy  
```
或者 
```
$ npm run deploy
```

More info: [Deployment](https://hexo.io/docs/one-command-deployment.html)
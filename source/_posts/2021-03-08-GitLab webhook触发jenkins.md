---
title: GitLab webhook触发jenkins
date: 2021-03-08 14:19:40
tags:
  - jenkins
  - gitlab
categories: Git
---

## 一. 应用场景

push 代码到公司的 gitlab,利用 gitlab 的钩子触发 jenkins 编译.

## 二. 设置步骤

### 2.1 设置 jeknins 中的项目

![在这里插入图片描述](https://img-blog.csdnimg.cn/2021032617241066.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70)
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210326172540939.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70)
这一步因人而异：

- 由于我的项目是根据参数的分支构建的， GitLab webhook 触发 jenkins 是不传入参数的，所以我默认设置个构建分支名字 origin/dev_branch
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/20210326172754223.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70)

### 2.2 设置 gitlab 中的项目

如下图,填写 url 和 secret token 即可, 这样 push 代码到特定分支后,jenkins 就会自动更新了.
url 和 token 就是图一、二 那里获取
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210326172858344.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70)

### 3、测试

合并代码到 dev_branch 后 push 代码就会触发 jenkins 了。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210326173057514.png)

只触发 dev_branch,其他不触发，也可以自己设置触发所有分支，各自情况而定。

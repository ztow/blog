---
layout: post
category: 博客
date: 2026-08-23 10:00:00 +0800
title: "博客升级：Jekyll 4.3.4 与 GitHub Actions 构建"
subtitle: "从 GitHub Pages 内置构建迁到 Actions，顺便把版本锁在 4.3.4"
author: "ztow"
header-img: "img/2026-jekyll/jekyll-header.jpg"
catalog: true
tags:
  - Jekyll
  - GitHub Pages
  - 博客
---

前几天有人问我，博客到底是用什么写的。我说 Jekyll。这个回答不能算错，但最近把构建方式从 GitHub Pages 内置的 legacy 换成了 Actions，再顺着版本一路看下去，发现“用 Jekyll”这句话可以拆成好几个版本。

### 先说说版本

我之前一直以为本地用什么版本，线上就是什么版本。查完才发现不是。

| 环境 | Jekyll 版本 |
| --- | --- |
| 本地构建 | 4.3.4 |
| GitHub Pages 内置构建 | 3.10.0 |
| Jekyll 官网最新 | 4.4.1 |

GitHub Pages 的旧式构建并不读取项目里的 `Gemfile`，它用的是自己打包好的 `github-pages` 依赖。所以哪怕本地安装了 4.3.4，推到 GitHub 之后，线上实际上还是用 3.10.0 在跑。

这个差异平时不会露出来，因为站点本身不复杂，页面也都能正常生成。但只要用到新版才有的语法，或者插件行为变了，就会出现“本地好的，线上不对”的情况。

### 我是怎么迁的

这次没有把 `_site` 直接推到仓库里，而是加了一个 GitHub Actions 工作流，让平台自己构建并部署。

大致是五步：

1. 把 `Gemfile` 和 `Gemfile.lock` 纳入版本控制，锁住依赖。
2. 在 `.github/workflows/pages.yml` 里加一个构建任务，触发条件是 `master` 分支有 push。
3. 工作流里安装 Ruby，执行 `bundle exec jekyll build`。
4. 把生成的 `_site` 作为 Pages artifact 上传，再由部署任务发布。
5. 在 GitHub Pages 设置里把发布源从 `Deploy from a branch` 改成 `GitHub Actions`。

完成后，线上构建就从 GitHub 的旧依赖变成了我仓库里的依赖。以后写文章、推代码，只需要正常 `git push origin master`，Actions 会自动完成构建和发布。

### 为什么不升到 4.4.1

官网现在的最新版是 4.4.1。我看了它的发布说明，确实是个修 bug 的版本，但这次没有升。

不是因为新版本不好，是因为没有非升不可的理由。

`Gemfile` 里写的是：

```ruby
gem "jekyll", "~> 4.3.4"
```

这个写法会让依赖保持在 4.3.x，不会自动跳到 4.4.x。对一个已经能正常生成、正常发布、文章和归档都没有报错的个人网站来说，稳定比追新重要。

升级 4.4.1 本身不算难，但要把本地构建、Actions 构建、文章页、归档页、RSS 和 sitemap 全部验证一遍。如果哪天真的需要新版功能，我会先改依赖、本地跑一遍，确认没问题再推；不会为了“官网更新了，我也要跟上”而急着换。

### 以后怎么处理

现在的规则很简单：内容改了，push，等 Actions 完成，站点就更新。版本升级另说。

如果以后真要上 4.4.1，我会先把 `Gemfile` 改成 `~> 4.4.1`，本地构建通过，再推一个版本出来。等真遇到必须升级的场景再说，不急。

题图：Jekyll 官方标识，来自 [mmy83.online](https://mmy83.online/images/2023/02/2023-02-20/%E4%BD%BF%E7%94%A8Jekyll%E6%90%AD%E5%BB%BA%E5%8D%9A%E5%AE%A2%E7%B3%BB%E7%BB%9F/%E4%BD%BF%E7%94%A8Jekyll%E6%90%AD%E5%BB%BA%E5%8D%9A%E5%AE%A2%E7%B3%BB%E7%BB%9F-00.jpg)。

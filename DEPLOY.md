# GitHub Pages 部署

这个项目使用 Next.js。文章源码放在 `public/blogs`，静态站点构建到 `docs`。`.github/workflows/deploy-pages.yml` 会在每次推送 `main` 后自动构建并发布 GitHub Pages。

## 第一次部署

1. 在 GitHub 新建仓库，推荐命名为 `Chen1shark.github.io`。
2. 在本地执行：

```powershell
pnpm install
.\build-pages.cmd
```

3. 提交并推送到 GitHub：

```powershell
git init
git branch -M main
git add .
git commit -m "初始化技术博客"
git remote add origin https://github.com/Chen1shark/Chen1shark.github.io.git
git push -u origin main
```

4. 打开 GitHub 仓库的 `Settings -> Pages`：

- Source 选择 `GitHub Actions`
- 保存

推送 `main` 后可以在仓库的 `Actions` 页面查看 `Deploy blog to GitHub Pages`。发布完成后，访问地址通常是：

```text
https://chen1shark.github.io/
```

## 以后更新文章

文章必须放在：

```text
public/blogs/<slug>/index.md
public/blogs/<slug>/config.json
```

并在 `public/blogs/index.json` 中加入相同的 `<slug>`。提交并推送 `main` 后，GitHub Actions 会自动构建和发布：

```powershell
git add .
git commit -m "更新博客"
git push
```

如果需要在本地检查静态构建，可以执行：

```powershell
.\build-pages.cmd
```

`public` 是源码和静态资源输入目录，不要直接把新文章只放进 `docs`；`docs` 会在构建时重新生成。

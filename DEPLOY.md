# GitHub Pages 手动部署

这个项目使用 Next.js，不建议把构建结果输出到 `public`。`public` 是源码里的静态资源输入目录；这里把静态站点生成到 `docs`，再让 GitHub Pages 从 `main` 分支的 `/docs` 目录发布。

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

- Source 选择 `Deploy from a branch`
- Branch 选择 `main`
- Folder 选择 `/docs`
- 保存

发布完成后，访问地址通常是：

```text
https://chen1shark.github.io/
```

## 以后更新文章

每次改完文章或页面后，执行：

```powershell
.\build-pages.cmd
git add .
git commit -m "更新博客"
git push
```

注意：只改了文章但没有重新执行 `.\build-pages.cmd`，`docs` 里的静态网页不会更新。

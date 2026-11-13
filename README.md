# 会话待办

DSH 的跨工作区会话待办与待查看浮窗。支持 Windows x64、DSH Desktop 0.2.0-rc.2。

- 彩色分组标签、未完成数量、左右滚动和拖动排序。
- 会话拖入其他分组后，保留当前分组视图。
- 双击分组标签改名；双击待办标题改名并同步 DSH 原会话标题。
- 会话菜单选择分组加入待办，浮窗条目支持右键菜单、个人备注、完成与恢复。
- 待查看汇总运行中、等待处理及有新结果的会话。
- 点击会话定位 DSH，支持恢复最小化窗口；浮窗可置顶、折叠。

删除分组会同时移除该组的待办，包括已完成项；DSH 原会话仍然保留。默认分组不能删除。

## 安装

从 [v0.4.5 发布页](https://github.com/Alentaoker/dsh-session-todo/releases/tag/v0.4.5) 下载 Windows 安装包和 `SHA256SUMS.txt`，核对 SHA-256 后，解压到长期保留的目录。通过 DSH 插件管理器安装解压后的 `dsh-session-todo-desktop2` 文件夹并启用。

安装包自带桌面程序，无需编译或安装额外依赖。安装或升级后，先让正在运行的任务结束，再完整退出并重新打开 DSH。左下角「会话待办」打开浮窗。

需要 AI 代为安装时，将 [AI 安装指南](AI_INSTALL.md) 交给它。

## 数据与升级

安装身份为 `dsh-session-todo-desktop2`。升级时停用旧身份 `dsh-session-todo`、`dsh-session-todo-desktop`，避免出现重复入口。

待办、分组、备注和已读状态保存在当前 DSH 配置的 `storages/dsh-session-todo/state.json`。升级保留该目录。卸载插件不会要求删除 DSH 会话。

桌面程序会自动写入 `%LOCALAPPDATA%\DSH Session Todo\native\<SHA256>\`，启动前核对文件内容。缓存由插件管理，无需手动启动程序或修改系统安全设置。

## 从源码构建

在 Windows x64 上使用 Node.js 20 或更新版本和系统 .NET Framework 4 的 C# 编译器：

```powershell
node scripts/build.mjs
```

独立插件目录生成在 `dist/dsh-session-todo-desktop2`，压缩包与校验文件生成在 `releases/`。打包使用明确文件清单。

[MIT License](LICENSE)

# 会话待办：AI 安装指南

将本文件交给有权操作本机和 DSH 的 AI。目标是安装或升级 **会话待办 0.4.5**，保留已有配置与待办数据。

## 下载

只使用以下固定版本资源：

- [Windows x64 安装包](https://github.com/Alentaoker/dsh-session-todo/releases/download/v0.4.5/dsh-session-todo-0.4.5-windows-x64.zip)
- [SHA256SUMS.txt](https://github.com/Alentaoker/dsh-session-todo/releases/download/v0.4.5/SHA256SUMS.txt)
- [发布页](https://github.com/Alentaoker/dsh-session-todo/releases/tag/v0.4.5)

下载后计算压缩包 SHA-256，与同版本校验文件中对应文件名的一行逐字比较。不一致则停止安装。

## 确认安装位置

1. 确认系统为 Windows x64。已支持的桌面版本是 DSH Desktop 0.2.0-rc.2；其他版本需先确认兼容性。
2. 找到用户实际运行的 DSH 配置。优先使用 DSH 内置 `plugin_manager` 操作当前配置；外部 AI 应根据正在运行的 DSH、启动器参数和配置文件确认位置。不要默认使用用户目录下的 `.dsh`。
3. 将安装包解压到用户可写、长期保留的插件目录。不要把临时目录或一次性下载目录作为最终安装位置，也不要移动已经建立本地链接的目录。
4. 解压后应有一个 `dsh-session-todo-desktop2` 文件夹。读取其中 `package.json`，确认 `name` 为 `dsh-session-todo-desktop2`、`version` 为 `0.4.5`，且存在 `cordis.patch.yml`、`host.js`、`client-v2.js` 和 `helper/dsh-session-todo-helper-v4.exe`。

## 安装或升级

1. 在本机备份当前配置中实际存在的 `package.json`、`cordis.yml`、`cordis.patch.yml`、`pnpm-lock.yaml`，以及 `storages/dsh-session-todo/`。备份留在本机，保留其他插件和用户设置。
2. 调用 `plugin_manager` 的 `list_bundles`，按返回的 `nextOffset` 读取完整列表。若旧身份 `dsh-session-todo` 或 `dsh-session-todo-desktop` 仍启用，使用 `set_bundle`、`enabled: false` 停用对应旧 bundle。不要停用其他插件。
3. 使用实际解压目录的绝对路径安装；下面的占位符必须先替换。路径中的反斜杠按 JSON 规则转义，或使用 `/`。

```json
{
  "action": "install_bundle",
  "target": "link:<解压后 dsh-session-todo-desktop2 文件夹的绝对路径>",
  "enabled": true
}
```

4. 按工具返回结果处理安装状态与其实际权限请求。如果安装身份已存在，按当前插件管理器支持的方式更新到新目录并启用；不要删除待办存储，也不要创建重复身份。遇到版本不兼容提示，停止并说明原因，不自动添加兼容性豁免。
5. 安装包包含预编译桌面程序，不需要运行构建脚本、安装脚本或额外安装运行依赖。
6. 等待用户当前任务结束，完整退出并重新打开 DSH，使后台与页面代码一起更新。仅关闭浮窗不足以完成升级。若当前不便重启，保留安装结果并明确告知尚待重启。

如果 AI 无法调用 DSH 内置工具，可通过 DSH 插件管理界面的本地 bundle 安装入口选择同一文件夹；不要凭猜测修改配置结构。

## 完成

只读核对插件管理器中的安装目录、版本和启用状态，向用户报告实际结果、数据保留情况及是否仍需重启。重启后的左下角「会话待办」用于打开浮窗。

插件会自行在 `%LOCALAPPDATA%\DSH Session Todo\native\<SHA256>\` 准备并校验桌面程序。无需手动启动 `.exe`、使用管理员身份或修改系统安全设置。

升级始终保留当前 DSH 配置下的 `storages/dsh-session-todo/state.json`。

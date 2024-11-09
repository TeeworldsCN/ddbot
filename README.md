# TeeworldsCN 机器人 - 豆豆

目前正在建设中

## 环境

- Deno 2.0

## 开发

- 安装 Deno
- 创建 .env 文件

```
LOCAL=true
PORT=8077
```

- 执行 `deno run --unstable --allow-all main.ts`
- 通过 `POST http://localhost:8077/local` 来发送消息

> `/local` 接口为本地测试机器人功能预留的接口，方便在没有 QQ 或 微信机器人权限的情况下测试自动响应指令。

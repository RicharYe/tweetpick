# TweetPick

TweetPick 用于统计 X（原 Twitter）帖子参与者，并根据指定条件随机抽取中奖者。

## 功能

- 支持转推、回复、引用和喜欢者作为参与来源
- 支持参与来源的并集或交集筛选
- 支持关键词、粉丝数及双方关注关系筛选
- 显示收集进度、来源统计和筛选统计
- 复制中奖名单文本或保存结果图片

## 系统要求

- 官方支持 Windows 10/11（x64）
- Windows 发布包为便携式 `.exe`
- macOS 提供 `.zip`（解压后运行 `.app`）；Linux 暂不支持

## 快速开始

1. 下载并运行 `TweetPick.exe`。
2. 在 X 登录状态下获取 `auth_token` 和 `ct0` Cookie。
3. 输入 Cookie、目标推文链接和抽奖条件。
4. 开始抽奖，然后复制名单或保存结果图片。

`auth_token` 和 `ct0` 属于敏感信息，请勿分享。抽奖在本地执行；收集参与者时，应用会向 X 接口发送请求。

## 从源代码构建

要求：Node.js `>=22.13 <23`、npm，以及 Windows 10/11 x64 或 macOS。

参与者收集所需的 X 接口配置必须通过 `.env` 或构建环境提供：

- `TWITTER_BEARER`
- `TWITTER_RETWEETERS_OP_ID`
- `TWITTER_FAVORITERS_OP_ID`
- `TWITTER_SEARCH_TIMELINE_OP_ID`
- `TWITTER_TWEET_DETAIL_OP_ID`

可选配置：`TWITTER_RETWEETERS_FEATURES_JSON`、`TWITTER_TWEET_DETAIL_FIELD_TOGGLES_JSON`。

```bash
npm ci
npm run build
npm run dist:win
```

macOS 打包命令为 `npm run dist:mac`。`npm run verify` 会执行 lint、类型检查及测试覆盖率验证。

Windows 便携版生成于 `release/` 目录。打包时需要有效的上述 X 接口配置；不要将包含凭据的配置文件分发到公开仓库。

## 许可证

Apache-2.0，详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。

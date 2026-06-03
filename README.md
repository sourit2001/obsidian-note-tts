# Note TTS

Obsidian 插件 MVP：把当前笔记或选中文本通过用户自己的 TTS API 转成音频，保存为 vault 内的音频文件，并弹出播放器播放。

## 功能

- 命令面板：`Convert current note to speech` 和 `Convert selected text to speech`
- 左侧栏按钮：直接转换当前整篇笔记
- 笔记右键菜单：支持转换整篇笔记或选中文本
- 文件菜单：支持直接转换 Markdown 文件全文，方便移动端长按文件使用
- 命令面板：`Preview cleaned text for speech` 可预览送去 TTS 前的清洗结果
- 设置页：可配置 frontmatter、标签、链接、裸 URL、图片/嵌入、HTML 注释和自定义跳过行规则
- 支持 MiniMax HTTP T2A
- 支持 Replicate 官方 MiniMax Speech 2.8 Turbo preset
- 支持 Replicate version/template 高级模式
- 支持自定义 HTTP Provider
- 生成文件默认保存到 `TTS Audio/`
- 生成后弹出播放器，并可打开音频文件或复制路径

## 安装到 Obsidian 测试

把下面文件复制到你的 vault 插件目录：

```text
<你的 vault>/.obsidian/plugins/note-tts/
  manifest.json
  main.js
  styles.css
```

然后在 Obsidian 设置中关闭安全模式，启用 `Note TTS`。

## MiniMax 配置

在插件设置里选择 `MiniMax`，填写：

- `API Key`
- `Model`：默认 `speech-2.8-turbo`
- `Voice ID`：默认 `Chinese_Mandarin_Gentleman`，也可以换成系统声音或克隆声音 ID
- `Language boost`：自动识别用 `auto`，中文可设为 `Chinese`

插件会请求 `https://api.minimax.io/v1/t2a_v2`，并要求 MiniMax 返回 MP3 的 hex 音频数据。

## Replicate 配置

在插件设置里选择 `Replicate`，填写：

- `API Token`
- `Model`：默认 `minimax/speech-2.8-turbo`
- `Voice`：选择 MiniMax Speech 2.8 Turbo 的系统音色；选 `Custom` 时使用下一项
- `Custom voice ID`：当 `Voice` 选择 `Custom` 时使用，用于 MiniMax voice cloning 返回的 voice_id
- `Language preference`：默认 `Auto`
- `Emotion`：默认 `Auto`

默认模型会调用 Replicate 官方模型接口：

```text
https://api.replicate.com/v1/models/minimax/speech-2.8-turbo/predictions
```

如果要使用其他 Replicate 模型，把 `Model` 改成其他 `owner/name` 后，填写：

- `Model version`：Replicate 模型版本 hash
- `Input JSON template`：例如：

```json
{
  "text": "{{text}}"
}
```

不同 Replicate TTS 模型的输入字段可能不同，可以把模板改成模型需要的字段，例如 `prompt`、`voice`、`language` 等。插件会轮询 prediction，找到输出里的第一个音频 URL 并下载保存。

## Custom HTTP

自定义 Provider 可以返回：

- 直接的音频二进制响应
- JSON 中的音频 URL
- JSON 中的 hex 音频
- JSON 中的 base64 音频

用 `Audio URL path`、`Audio hex path`、`Audio base64 path` 指定 JSON 路径，例如 `data.audio_url`。

# Note TTS

English | [中文](#中文)

Note TTS is an Obsidian plugin that turns the current note or selected text into an MP3 audio file through your own TTS API provider. The generated audio is saved inside your vault and opened in a built-in playback modal.

## Features

- Command palette actions for `Convert current note to speech` and `Convert selected text to speech`
- Ribbon button for converting the current note
- Editor context menu actions for converting the whole note or the current selection
- File menu action for converting a Markdown file, useful on mobile when long-pressing a file
- `Preview cleaned text for speech` command to inspect the text before it is sent to TTS
- Markdown cleanup options for frontmatter, tags, links, raw URLs, images/embeds, HTML comments, and custom skipped-line rules
- MiniMax HTTP T2A support
- Official Replicate MiniMax Speech 2.8 Turbo preset
- Advanced Replicate version/template mode for other TTS models
- Custom HTTP provider support
- Generated files are saved to `TTS Audio/` by default
- Playback modal after generation, with actions to open the audio file or copy its path

## Install For Obsidian Testing

Copy these files into your vault plugin folder:

```text
<your vault>/.obsidian/plugins/note-tts/
  manifest.json
  main.js
  styles.css
```

Then enable `Note TTS` in Obsidian's community plugins settings.

## MiniMax Setup

Choose `MiniMax` in the plugin settings and fill in:

- `API Key`
- `Model`: defaults to `speech-2.8-turbo`
- `Voice ID`: defaults to `Chinese_Mandarin_Gentleman`; you can also use another system voice or a cloned voice ID
- `Language boost`: use `auto` for automatic detection, or `Chinese` for Chinese text

The plugin calls `https://api.minimax.io/v1/t2a_v2` and expects MiniMax to return MP3 audio data as hex.

## Replicate Setup

Choose `Replicate` in the plugin settings and fill in:

- `API Token`
- `Model`: defaults to `minimax/speech-2.8-turbo`
- `Voice`: choose a MiniMax Speech 2.8 Turbo system voice; choose `Custom` to use the next field
- `Custom voice ID`: used when `Voice` is set to `Custom`, usually for a MiniMax voice-cloning `voice_id`
- `Language preference`: defaults to `Auto`
- `Emotion`: defaults to `Auto`

The default model calls Replicate's official model endpoint:

```text
https://api.replicate.com/v1/models/minimax/speech-2.8-turbo/predictions
```

To use another Replicate model, change `Model` to another `owner/name`, then fill in:

- `Model version`: the Replicate model version hash
- `Input JSON template`: for example:

```json
{
  "text": "{{text}}"
}
```

Different Replicate TTS models may require different input fields. You can edit the template to match the model, such as `prompt`, `voice`, or `language`. The plugin polls the prediction, finds the first audio URL in the output, downloads it, and saves it to your vault.

## Custom HTTP Provider

A custom provider can return:

- A direct binary audio response
- An audio URL in JSON
- Hex audio data in JSON
- Base64 audio data in JSON

Use `Audio URL path`, `Audio hex path`, or `Audio base64 path` to specify the JSON path, for example `data.audio_url`.

## 中文

Note TTS 是一个 Obsidian 插件，可以把当前笔记或选中文本通过你自己的 TTS API 转成 MP3 音频。生成的音频会保存到 vault 内，并自动弹出播放器。

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

然后在 Obsidian 的第三方插件设置中启用 `Note TTS`。

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

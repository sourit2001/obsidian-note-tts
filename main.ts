import {
  addIcon,
  App,
  Editor,
  Menu,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  requestUrl,
  Setting,
  TFile,
} from "obsidian";

type ProviderId = "minimax" | "replicate" | "custom";

const REPLICATE_MINIMAX_MODEL = "minimax/speech-2.8-turbo";
const REPLICATE_CUSTOM_VOICE = "custom";
const NOTE_TTS_NOTE_ICON = "note-tts-note";
const NOTE_TTS_SELECTION_ICON = "note-tts-selection";
const NOTE_TTS_PREVIEW_ICON = "note-tts-preview";

const NOTE_TTS_NOTE_ICON_SVG = `
<rect x="18" y="12" width="42" height="76" rx="8" fill="none" stroke="currentColor" stroke-width="9"/>
<path d="M31 33h17M31 50h17M31 67h12" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
<path d="M70 32c9 12 9 24 0 36M84 22c16 20 16 56 0 76" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
`;

const NOTE_TTS_SELECTION_ICON_SVG = `
<path d="M14 20h36M14 37h28M14 54h28M14 71h24" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
<path d="M55 24v52M45 24h20M45 76h20" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
<path d="M73 34c8 10 8 22 0 32M87 24c14 18 14 46 0 64" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
`;

const NOTE_TTS_PREVIEW_ICON_SVG = `
<rect x="14" y="12" width="42" height="76" rx="8" fill="none" stroke="currentColor" stroke-width="9"/>
<path d="M27 34h16M27 51h12" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
<path d="M48 66c8-12 17-18 28-18s20 6 28 18c-8 12-17 18-28 18s-20-6-28-18z" fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round"/>
<circle cx="76" cy="66" r="7" fill="currentColor"/>
`;

const REPLICATE_MINIMAX_VOICES = [
  "Wise_Woman",
  "Friendly_Person",
  "Inspirational_girl",
  "Deep_Voice_Man",
  "Calm_Woman",
  "Casual_Guy",
  "Lively_Girl",
  "Patient_Man",
  "Young_Knight",
  "Determined_Man",
  "Lovely_Girl",
  "Decent_Boy",
  "Imposing_Manner",
  "Elegant_Man",
  "Abbess",
  "Sweet_Girl_2",
  "Exuberant_Girl",
];

interface NoteTtsSettings {
  provider: ProviderId;
  outputFolder: string;
  maxCharacters: number;
  stripMarkdown: boolean;
  removeFrontmatter: boolean;
  removeTags: boolean;
  removeLinks: boolean;
  removeUrls: boolean;
  removeEmbeds: boolean;
  removeHtmlComments: boolean;
  skipLinePatterns: string;
  minimaxApiKey: string;
  minimaxModel: string;
  minimaxVoiceId: string;
  minimaxLanguageBoost: string;
  minimaxEndpoint: string;
  minimaxSpeed: number;
  minimaxVolume: number;
  minimaxPitch: number;
  replicateApiToken: string;
  replicateModel: string;
  replicateVersion: string;
  replicateInputTemplate: string;
  replicateVoiceId: string;
  replicateCustomVoiceId: string;
  replicateLanguageBoost: string;
  replicateEmotion: string;
  replicateSpeed: number;
  replicateVolume: number;
  replicatePitch: number;
  customEndpoint: string;
  customMethod: string;
  customHeaders: string;
  customBodyTemplate: string;
  customAudioUrlPath: string;
  customAudioHexPath: string;
  customAudioBase64Path: string;
}

const DEFAULT_SETTINGS: NoteTtsSettings = {
  provider: "minimax",
  outputFolder: "TTS Audio",
  maxCharacters: 10000,
  stripMarkdown: true,
  removeFrontmatter: true,
  removeTags: true,
  removeLinks: true,
  removeUrls: true,
  removeEmbeds: true,
  removeHtmlComments: true,
  skipLinePatterns: [
    "^\\*\\*来源链接：\\*\\*$",
    "^来源链接：?$",
    "^\\[?推文\\d*\\]?$",
    "^\\[?[^\\]]+推文\\d*\\]?$",
    "^(?:[^,，、\\n]*推文\\d+\\s*[,，、]?\\s*)+$",
    "^---$",
  ].join("\n"),
  minimaxApiKey: "",
  minimaxModel: "speech-2.8-turbo",
  minimaxVoiceId: "Chinese_Mandarin_Gentleman",
  minimaxLanguageBoost: "auto",
  minimaxEndpoint: "https://api.minimax.io/v1/t2a_v2",
  minimaxSpeed: 1,
  minimaxVolume: 1,
  minimaxPitch: 0,
  replicateApiToken: "",
  replicateModel: REPLICATE_MINIMAX_MODEL,
  replicateVersion: "",
  replicateInputTemplate: "{\n  \"text\": \"{{text}}\"\n}",
  replicateVoiceId: "Wise_Woman",
  replicateCustomVoiceId: "",
  replicateLanguageBoost: "None",
  replicateEmotion: "auto",
  replicateSpeed: 1,
  replicateVolume: 1,
  replicatePitch: 0,
  customEndpoint: "",
  customMethod: "POST",
  customHeaders: "{\n  \"Content-Type\": \"application/json\"\n}",
  customBodyTemplate: "{\n  \"text\": \"{{text}}\"\n}",
  customAudioUrlPath: "audio_url",
  customAudioHexPath: "",
  customAudioBase64Path: "",
};

interface AudioResult {
  data: ArrayBuffer;
  extension: string;
  mimeType: string;
}

export default class NoteTtsPlugin extends Plugin {
  settings: NoteTtsSettings;

  async onload() {
    await this.loadSettings();
    this.registerIcons();

    this.addRibbonIcon(NOTE_TTS_NOTE_ICON, "Convert current note to speech", async () => {
      await this.synthesizeActiveView("note");
    });

    this.addCommand({
      id: "synthesize-current-note",
      name: "Convert current note to speech",
      icon: NOTE_TTS_NOTE_ICON,
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.synthesize(view, "note", editor);
      },
    });

    this.addCommand({
      id: "synthesize-selection",
      name: "Convert selected text to speech",
      icon: NOTE_TTS_SELECTION_ICON,
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.synthesize(view, "selection", editor);
      },
    });

    this.addCommand({
      id: "preview-cleaned-text",
      name: "Preview cleaned text for speech",
      icon: NOTE_TTS_PREVIEW_ICON,
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const sourceText = await this.getTextForMode(view, editor.getSelection() ? "selection" : "note", editor);
        new CleanedTextPreviewModal(this.app, this.prepareText(sourceText)).open();
      },
    });

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
        menu.addItem((item) => {
          item
            .setTitle("Convert current note to speech")
            .setIcon(NOTE_TTS_NOTE_ICON)
            .onClick(async () => {
              await this.synthesize(view, "note", editor);
            });
        });
        menu.addItem((item) => {
          item
            .setTitle("Convert selected text to speech")
            .setIcon(NOTE_TTS_SELECTION_ICON)
            .onClick(async () => {
              await this.synthesize(view, "selection", editor);
            });
        });
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        if (!(file instanceof TFile) || file.extension !== "md") {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle("Convert note to speech")
            .setIcon(NOTE_TTS_NOTE_ICON)
            .onClick(async () => {
              await this.synthesizeFile(file);
            });
        });
      })
    );

    this.addSettingTab(new NoteTtsSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private registerIcons() {
    addIcon(NOTE_TTS_NOTE_ICON, NOTE_TTS_NOTE_ICON_SVG);
    addIcon(NOTE_TTS_SELECTION_ICON, NOTE_TTS_SELECTION_ICON_SVG);
    addIcon(NOTE_TTS_PREVIEW_ICON, NOTE_TTS_PREVIEW_ICON_SVG);
  }

  private async synthesizeActiveView(mode: "note" | "selection") {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice("请先打开一篇 Markdown 笔记。");
      return;
    }
    await this.synthesize(view, mode, view.editor);
  }

  private async synthesizeFile(file: TFile) {
    const status = new TtsStatusModal(this.app);
    status.open();
    status.setStatus("正在读取笔记...");

    const text = this.prepareText(await this.app.vault.read(file));
    if (!text.trim()) {
      status.close();
      new Notice("没有可转换的笔记内容。");
      return;
    }

    if (text.length > this.settings.maxCharacters) {
      status.close();
      new Notice(`文本超过 ${this.settings.maxCharacters} 字符，请先选中较短片段。`);
      return;
    }

    try {
      status.setStatus("正在请求语音模型...");
      const audio = await this.generateAudio(text, status);
      status.setStatus("正在保存音频文件...");
      const saved = await this.saveAudioFile(file, audio);
      status.setStatus("语音已生成。");
      status.close();
      new Notice("语音已生成。");
      new AudioResultModal(this.app, saved).open();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      status.setError(message);
      new Notice(`生成失败：${message}`);
    }
  }

  private async synthesize(view: MarkdownView, mode: "note" | "selection", editor?: Editor) {
    const status = new TtsStatusModal(this.app);
    status.open();
    status.setStatus(mode === "selection" ? "正在读取选中文本..." : "正在读取当前笔记...");

    const sourceText = await this.getTextForMode(view, mode, editor);
    const text = this.prepareText(sourceText);
    if (!text.trim()) {
      status.close();
      new Notice(mode === "selection" ? "请先选择要转换的文本。" : "没有可转换的笔记内容。");
      return;
    }

    if (text.length > this.settings.maxCharacters) {
      status.close();
      new Notice(`文本超过 ${this.settings.maxCharacters} 字符，请先选中较短片段。`);
      return;
    }

    const activeFile = view.file;
    if (!activeFile) {
      status.close();
      new Notice("没有找到当前笔记文件。");
      return;
    }

    try {
      status.setStatus("正在请求语音模型...");
      const audio = await this.generateAudio(text, status);
      status.setStatus("正在保存音频文件...");
      const saved = await this.saveAudioFile(activeFile, audio);
      status.setStatus("语音已生成。");
      status.close();
      new Notice("语音已生成。");
      new AudioResultModal(this.app, saved).open();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      status.setError(message);
      new Notice(`生成失败：${message}`);
    }
  }

  private async getTextForMode(view: MarkdownView, mode: "note" | "selection", editor?: Editor) {
    if (mode === "selection") {
      return editor?.getSelection() || "";
    }

    if (editor) {
      return editor.getValue();
    }

    if (view.file) {
      return this.app.vault.read(view.file);
    }

    return "";
  }

  private prepareText(text: string) {
    let normalized = text.replace(/\r\n/g, "\n").trim();
    if (this.settings.removeFrontmatter) {
      normalized = normalized.replace(/^---\n[\s\S]*?\n---\n?/, "");
    }
    if (this.settings.removeHtmlComments) {
      normalized = normalized.replace(/<!--[\s\S]*?-->/g, "");
    }
    if (this.settings.removeEmbeds) {
      normalized = normalized
        .replace(/!\[[^\]]*]\([^)]*\)/g, "")
        .replace(/!\[\[[^\]]+]]/g, "");
    }
    if (this.settings.removeLinks) {
      normalized = normalized
        .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
        .replace(/\[\[([^|\]]+)\|([^\]]+)]]/g, "$2")
        .replace(/\[\[([^\]]+)]]/g, "$1");
    }
    if (this.settings.removeUrls) {
      normalized = normalized.replace(/https?:\/\/\S+/g, "");
    }
    if (this.settings.removeTags) {
      normalized = normalized
        .replace(/(^|\s)#[\p{L}\p{N}_/-]+/gu, "$1")
        .replace(/^\s*tags:\s*\[[^\]]*]\s*$/gim, "")
        .replace(/^\s*tags:\s*.*$/gim, "");
    }

    normalized = this.removeSkippedLines(normalized);

    if (!this.settings.stripMarkdown) {
      return normalized;
    }

    return normalized
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private removeSkippedLines(text: string) {
    const patterns = this.settings.skipLinePatterns
      .split("\n")
      .map((pattern) => pattern.trim())
      .filter(Boolean)
      .map((pattern) => {
        try {
          return new RegExp(pattern, "iu");
        } catch (error) {
          console.warn(`Invalid Note TTS skip pattern: ${pattern}`, error);
          return null;
        }
      })
      .filter((pattern): pattern is RegExp => Boolean(pattern));

    if (!patterns.length) {
      return text;
    }

    return text
      .split("\n")
      .filter((line) => !patterns.some((pattern) => pattern.test(line.trim())))
      .join("\n");
  }

  private async generateAudio(text: string, status?: TtsStatusModal): Promise<AudioResult> {
    if (this.settings.provider === "minimax") {
      return this.generateWithMiniMax(text);
    }
    if (this.settings.provider === "replicate") {
      return this.generateWithReplicate(text, status);
    }
    return this.generateWithCustomProvider(text);
  }

  private async generateWithMiniMax(text: string): Promise<AudioResult> {
    if (!this.settings.minimaxApiKey) {
      throw new Error("请先在设置里填写 MiniMax API Key。");
    }

    const response = await requestUrl({
      url: this.settings.minimaxEndpoint,
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.settings.minimaxApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.settings.minimaxModel,
        text,
        stream: false,
        output_format: "hex",
        language_boost: this.settings.minimaxLanguageBoost || "auto",
        voice_setting: {
          voice_id: this.settings.minimaxVoiceId,
          speed: this.settings.minimaxSpeed,
          vol: this.settings.minimaxVolume,
          pitch: this.settings.minimaxPitch,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
          channel: 1,
        },
      }),
    });

    const payload = response.json;
    if (payload?.base_resp?.status_code !== 0) {
      throw new Error(payload?.base_resp?.status_msg || "MiniMax 返回了错误。");
    }

    const audioHex = payload?.data?.audio;
    if (!audioHex) {
      throw new Error("MiniMax 响应中没有音频数据。");
    }

    return {
      data: hexToArrayBuffer(audioHex),
      extension: "mp3",
      mimeType: "audio/mpeg",
    };
  }

  private async generateWithReplicate(text: string, status?: TtsStatusModal): Promise<AudioResult> {
    if (!this.settings.replicateApiToken) {
      throw new Error("请先在设置里填写 Replicate API Token。");
    }

    const model = this.settings.replicateModel || REPLICATE_MINIMAX_MODEL;
    const input = this.createReplicateInput(text, model);
    const url = this.createReplicatePredictionUrl(model);
    const body = model === REPLICATE_MINIMAX_MODEL
      ? { input }
      : { version: this.settings.replicateVersion, input };

    if (model !== REPLICATE_MINIMAX_MODEL && !this.settings.replicateVersion) {
      throw new Error("请先在设置里填写 Replicate 模型 version。");
    }

    status?.setStatus("正在提交 Replicate 任务...");
    let prediction = await this.requestReplicateJson({
      url,
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.settings.replicateApiToken}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify(body),
    });

    prediction = await this.pollReplicatePrediction(prediction, status);
    const outputUrl = findFirstUrl(prediction?.output);
    if (!outputUrl) {
      throw new Error("Replicate 输出里没有找到音频 URL。");
    }

    status?.setStatus("正在下载音频...");
    return this.downloadAudio(outputUrl);
  }

  private createReplicateInput(text: string, model: string) {
    if (model === REPLICATE_MINIMAX_MODEL) {
      const languageBoost = this.settings.replicateLanguageBoost === "auto"
        ? "None"
        : this.settings.replicateLanguageBoost || "None";
      const voiceId = this.getReplicateMiniMaxVoiceId();

      return {
        text,
        pitch: Number.isFinite(this.settings.replicatePitch) ? this.settings.replicatePitch : 0,
        speed: clampNumber(this.settings.replicateSpeed, 0.5, 2, 1),
        volume: clampNumber(this.settings.replicateVolume, 0, 10, 1),
        bitrate: 128000,
        channel: "mono",
        emotion: this.settings.replicateEmotion || "auto",
        voice_id: voiceId,
        sample_rate: 32000,
        audio_format: "mp3",
        language_boost: languageBoost,
        subtitle_enable: false,
        english_normalization: false,
      };
    }

    return renderJsonTemplate(this.settings.replicateInputTemplate, text);
  }

  private getReplicateMiniMaxVoiceId() {
    if (this.settings.replicateVoiceId === REPLICATE_CUSTOM_VOICE) {
      const customVoiceId = this.settings.replicateCustomVoiceId.trim();
      if (!customVoiceId) {
        throw new Error("请选择一个内置音色，或填写 Custom voice ID。");
      }
      return customVoiceId;
    }

    return REPLICATE_MINIMAX_VOICES.includes(this.settings.replicateVoiceId)
      ? this.settings.replicateVoiceId
      : "Wise_Woman";
  }

  private createReplicatePredictionUrl(model: string) {
    if (model === REPLICATE_MINIMAX_MODEL) {
      return "https://api.replicate.com/v1/models/minimax/speech-2.8-turbo/predictions";
    }

    return "https://api.replicate.com/v1/predictions";
  }

  private async pollReplicatePrediction(prediction: any, status?: TtsStatusModal) {
    const getUrl = prediction?.urls?.get;
    if (!getUrl) {
      return prediction;
    }

    for (let attempt = 0; attempt < 60; attempt++) {
      status?.setStatus(`Replicate 正在生成语音... ${prediction.status || "starting"}`);
      if (prediction.status === "succeeded" || prediction.status === "successful") {
        return prediction;
      }
      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new Error(prediction.error || `Replicate prediction ${prediction.status}。`);
      }

      await sleep(1500);
      prediction = await this.requestReplicateJson({
        url: getUrl,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.settings.replicateApiToken}`,
        },
      });
    }

    throw new Error("Replicate 生成超时，请稍后重试。");
  }

  private async requestReplicateJson(options: Parameters<typeof requestUrl>[0]) {
    try {
      return (await requestUrl(options)).json;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const body = (error as { response?: { json?: unknown; text?: string } })?.response;
      const detail = body?.json ? JSON.stringify(body.json) : body?.text;
      throw new Error(detail ? `Replicate 请求失败：${detail}` : `Replicate 请求失败：${message}`);
    }
  }

  private async generateWithCustomProvider(text: string): Promise<AudioResult> {
    if (!this.settings.customEndpoint) {
      throw new Error("请先填写自定义 Provider Endpoint。");
    }

    const headers = renderJsonTemplate(this.settings.customHeaders || "{}", text);
    const body = this.settings.customBodyTemplate
      ? JSON.stringify(renderJsonTemplate(this.settings.customBodyTemplate, text))
      : undefined;

    const response = await requestUrl({
      url: this.settings.customEndpoint,
      method: this.settings.customMethod || "POST",
      headers,
      body,
    });

    if (response.arrayBuffer?.byteLength && !looksLikeJson(response.headers?.["content-type"])) {
      return {
        data: response.arrayBuffer,
        extension: "mp3",
        mimeType: response.headers?.["content-type"] || "audio/mpeg",
      };
    }

    const payload = response.json;
    const audioUrl = getByPath(payload, this.settings.customAudioUrlPath);
    if (typeof audioUrl === "string" && audioUrl) {
      return this.downloadAudio(audioUrl);
    }

    const audioHex = getByPath(payload, this.settings.customAudioHexPath);
    if (typeof audioHex === "string" && audioHex) {
      return {
        data: hexToArrayBuffer(audioHex),
        extension: "mp3",
        mimeType: "audio/mpeg",
      };
    }

    const audioBase64 = getByPath(payload, this.settings.customAudioBase64Path);
    if (typeof audioBase64 === "string" && audioBase64) {
      return {
        data: base64ToArrayBuffer(audioBase64),
        extension: "mp3",
        mimeType: "audio/mpeg",
      };
    }

    throw new Error("自定义 Provider 响应中没有找到音频数据。");
  }

  private async downloadAudio(url: string): Promise<AudioResult> {
    if (url.startsWith("data:")) {
      const [meta, encoded] = url.split(",", 2);
      const mimeType = meta.match(/^data:([^;]+)/)?.[1] || "audio/mpeg";
      return {
        data: base64ToArrayBuffer(encoded),
        extension: extensionFromMime(mimeType),
        mimeType,
      };
    }

    const response = await requestUrl({ url, method: "GET" });
    const mimeType = response.headers?.["content-type"] || "audio/mpeg";
    return {
      data: response.arrayBuffer,
      extension: extensionFromMime(mimeType),
      mimeType,
    };
  }

  private async saveAudioFile(sourceFile: TFile, audio: AudioResult) {
    const folder = normalizeFolder(this.settings.outputFolder);
    await ensureFolder(this.app, folder);

    const basename = sourceFile.basename.replace(/[\\/:*?"<>|#^[\]]/g, "-").slice(0, 80);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${folder}/${basename}-${timestamp}.${audio.extension || "mp3"}`;
    return this.app.vault.createBinary(path, audio.data);
  }
}

class TtsStatusModal extends Modal {
  private statusEl: HTMLElement;
  private detailEl: HTMLElement;

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("note-tts-status-modal");
    contentEl.createEl("h2", { text: "正在生成语音" });
    contentEl.createDiv({ cls: "note-tts-spinner" });
    this.statusEl = contentEl.createEl("div", {
      text: "正在准备...",
      cls: "note-tts-status-text",
    });
    this.detailEl = contentEl.createEl("div", {
      text: "请保持 Obsidian 打开，生成完成后会自动弹出播放器。",
      cls: "note-tts-status-detail",
    });
  }

  setStatus(message: string) {
    if (this.statusEl) {
      this.statusEl.setText(message);
    }
  }

  setError(message: string) {
    this.contentEl.removeClass("is-loading");
    this.contentEl.addClass("has-error");
    if (this.statusEl) {
      this.statusEl.setText("生成失败");
    }
    if (this.detailEl) {
      this.detailEl.setText(message);
    }
  }
}

class CleanedTextPreviewModal extends Modal {
  private text: string;

  constructor(app: App, text: string) {
    super(app);
    this.text = text;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("note-tts-preview-modal");
    contentEl.createEl("h2", { text: "朗读文本预览" });
    contentEl.createEl("textarea", {
      text: this.text,
      cls: "note-tts-preview-text",
      attr: {
        readonly: "true",
      },
    });
  }
}

class AudioResultModal extends Modal {
  private file: TFile;
  private dragCleanup: (() => void) | null = null;

  constructor(app: App, file: TFile) {
    super(app);
    this.file = file;
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass("note-tts-draggable-modal");
    contentEl.addClass("note-tts-modal");
    const title = contentEl.createEl("h2", { text: "语音已生成", cls: "note-tts-drag-handle" });
    this.enableDrag(title);
    contentEl.createEl("div", { text: this.file.path, cls: "note-tts-path" });

    const audio = contentEl.createEl("audio", {
      attr: {
        controls: "true",
        src: this.app.vault.getResourcePath(this.file),
      },
    });
    audio.focus();

    const actions = contentEl.createDiv({ cls: "note-tts-actions" });
    new Setting(actions)
      .addButton((button) =>
        button
          .setButtonText("打开音频文件")
          .onClick(() => this.app.workspace.openLinkText(this.file.path, "", true))
      )
      .addButton((button) =>
        button
          .setButtonText("复制路径")
          .onClick(async () => {
            await navigator.clipboard.writeText(this.file.path);
            new Notice("已复制音频路径。");
          })
      );
  }

  onClose() {
    this.dragCleanup?.();
    this.dragCleanup = null;
    this.contentEl.empty();
  }

  private enableDrag(handle: HTMLElement) {
    const modal = this.modalEl;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const rect = modal.getBoundingClientRect();
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      modal.style.position = "fixed";
      modal.style.left = `${rect.left}px`;
      modal.style.top = `${rect.top}px`;
      modal.style.margin = "0";
      handle.addClass("is-dragging");
      handle.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      const nextLeft = clamp(startLeft + event.clientX - startX, 8, window.innerWidth - modal.offsetWidth - 8);
      const nextTop = clamp(startTop + event.clientY - startY, 8, window.innerHeight - modal.offsetHeight - 8);
      modal.style.left = `${nextLeft}px`;
      modal.style.top = `${nextTop}px`;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      handle.removeClass("is-dragging");
      handle.releasePointerCapture(event.pointerId);
    };

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);

    this.dragCleanup = () => {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
    };
  }
}

class NoteTtsSettingTab extends PluginSettingTab {
  plugin: NoteTtsPlugin;

  constructor(app: App, plugin: NoteTtsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Note TTS" });

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("选择用哪个 API 生成语音。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("minimax", "MiniMax")
          .addOption("replicate", "Replicate")
          .addOption("custom", "Custom HTTP")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value: ProviderId) => {
            this.plugin.settings.provider = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName("输出文件夹")
      .setDesc("生成的 MP3 会保存到 vault 中的这个文件夹。")
      .addText((text) =>
        text
          .setPlaceholder("TTS Audio")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value || DEFAULT_SETTINGS.outputFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("最大字符数")
      .setDesc("避免把特别长的笔记误发给同步 API。")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.maxCharacters))
          .onChange(async (value) => {
            this.plugin.settings.maxCharacters = Number(value) || DEFAULT_SETTINGS.maxCharacters;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("转换前清理 Markdown")
      .setDesc("移除代码块、链接语法和常见 Markdown 标记。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.stripMarkdown)
          .onChange(async (value) => {
            this.plugin.settings.stripMarkdown = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Text cleanup" });
    this.toggleSetting(containerEl, "移除 YAML/frontmatter", "跳过笔记顶部的 date、type、tags 等元数据。", "removeFrontmatter");
    this.toggleSetting(containerEl, "移除标签", "跳过 #tag 和 tags: 字段。", "removeTags");
    this.toggleSetting(containerEl, "移除链接地址", "保留链接文字，但不朗读 URL。", "removeLinks");
    this.toggleSetting(containerEl, "移除裸 URL", "跳过直接写在正文里的 https:// 链接。", "removeUrls");
    this.toggleSetting(containerEl, "移除图片和嵌入", "跳过 Markdown 图片与 Obsidian 嵌入。", "removeEmbeds");
    this.toggleSetting(containerEl, "移除 HTML 注释", "跳过 <!-- comment --> 内容。", "removeHtmlComments");
    this.textAreaSetting(
      containerEl,
      "跳过整行的规则",
      "每行一个正则表达式。匹配到的整行不会送去生成语音。",
      "skipLinePatterns"
    );

    if (this.plugin.settings.provider === "minimax") {
      this.displayMiniMaxSettings(containerEl);
    } else if (this.plugin.settings.provider === "replicate") {
      this.displayReplicateSettings(containerEl);
    } else {
      this.displayCustomSettings(containerEl);
    }
  }

  private displayMiniMaxSettings(containerEl: HTMLElement) {
    containerEl.createEl("h3", { text: "MiniMax" });
    this.textSetting(containerEl, "API Key", "Bearer token。", "minimaxApiKey", true);
    this.textSetting(containerEl, "Endpoint", "默认使用 HTTP T2A。", "minimaxEndpoint");
    this.textSetting(containerEl, "Model", "例如 speech-2.8-turbo 或 speech-2.8-hd。", "minimaxModel");
    this.textSetting(containerEl, "Voice ID", "系统 voice_id 或你自己的克隆 voice_id。", "minimaxVoiceId");
    this.textSetting(containerEl, "Language boost", "中文可用 Chinese，自动识别用 auto。", "minimaxLanguageBoost");
    this.numberSetting(containerEl, "Speed", "语速。", "minimaxSpeed");
    this.numberSetting(containerEl, "Volume", "音量。", "minimaxVolume");
    this.numberSetting(containerEl, "Pitch", "音高。", "minimaxPitch");
  }

  private displayReplicateSettings(containerEl: HTMLElement) {
    containerEl.createEl("h3", { text: "Replicate" });
    this.textSetting(containerEl, "API Token", "Replicate API token。", "replicateApiToken", true);
    this.textSetting(
      containerEl,
      "Model",
      "默认使用 Replicate 官方 MiniMax Speech 2.8 Turbo；其他模型可填 owner/name。",
      "replicateModel"
    );

    if ((this.plugin.settings.replicateModel || REPLICATE_MINIMAX_MODEL) === REPLICATE_MINIMAX_MODEL) {
      const selectedVoice = this.plugin.settings.replicateVoiceId === REPLICATE_CUSTOM_VOICE
        ? REPLICATE_CUSTOM_VOICE
        : REPLICATE_MINIMAX_VOICES.includes(this.plugin.settings.replicateVoiceId)
        ? this.plugin.settings.replicateVoiceId
        : "Wise_Woman";

      new Setting(containerEl)
        .setName("Voice")
        .setDesc("选择 Custom 时，会使用下一项填写的自定义 voice_id。")
        .addDropdown((dropdown) => {
          dropdown.addOption(REPLICATE_CUSTOM_VOICE, "Custom");
          for (const voice of REPLICATE_MINIMAX_VOICES) {
            dropdown.addOption(voice, voice);
          }
          dropdown
            .setValue(selectedVoice)
            .onChange(async (value) => {
              this.plugin.settings.replicateVoiceId = value;
              await this.plugin.saveSettings();
            });
        });

      this.textSetting(
        containerEl,
        "Custom voice ID",
        "当 Voice 选择 Custom 时使用，用于 MiniMax voice cloning 返回的 voice_id。",
        "replicateCustomVoiceId"
      );

      new Setting(containerEl)
        .setName("Language preference")
        .setDesc("默认 Auto，让 MiniMax 自动判断语言。")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("None", "Auto")
            .addOption("Chinese", "Chinese")
            .addOption("Cantonese", "Cantonese")
            .addOption("English", "English")
            .addOption("Japanese", "Japanese")
            .addOption("Korean", "Korean")
            .addOption("Spanish", "Spanish")
            .addOption("French", "French")
            .addOption("German", "German")
            .addOption("Portuguese", "Portuguese")
            .setValue(this.plugin.settings.replicateLanguageBoost === "auto" ? "None" : this.plugin.settings.replicateLanguageBoost || "None")
            .onChange(async (value) => {
              this.plugin.settings.replicateLanguageBoost = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Emotion")
        .setDesc("默认 Auto，让 MiniMax 自动选择表达情绪。")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("auto", "Auto")
            .addOption("neutral", "Neutral")
            .addOption("happy", "Happy")
            .addOption("sad", "Sad")
            .addOption("angry", "Angry")
            .addOption("fearful", "Fearful")
            .addOption("disgusted", "Disgusted")
            .addOption("surprised", "Surprised")
            .addOption("calm", "Calm")
            .addOption("fluent", "Fluent")
            .setValue(this.plugin.settings.replicateEmotion || "auto")
            .onChange(async (value) => {
              this.plugin.settings.replicateEmotion = value;
              await this.plugin.saveSettings();
            })
        );

      this.numberSetting(containerEl, "Speed", "语速，Replicate MiniMax 支持 0.5 到 2。", "replicateSpeed");
      this.numberSetting(containerEl, "Volume", "音量，Replicate MiniMax 支持 0 到 10。", "replicateVolume");
      this.numberSetting(containerEl, "Pitch", "音高，Replicate MiniMax 支持 -12 到 12。", "replicatePitch");
      return;
    }

    containerEl.createEl("h4", { text: "Advanced Replicate model" });
    this.textSetting(containerEl, "Model version", "非官方模型需要填写 version hash。", "replicateVersion");
    this.textAreaSetting(containerEl, "Input JSON template", "使用 {{text}} 插入笔记文本。", "replicateInputTemplate");
  }

  private displayCustomSettings(containerEl: HTMLElement) {
    containerEl.createEl("h3", { text: "Custom HTTP" });
    this.textSetting(containerEl, "Endpoint", "返回二进制音频或 JSON 都可以。", "customEndpoint");
    this.textSetting(containerEl, "Method", "通常是 POST。", "customMethod");
    this.textAreaSetting(containerEl, "Headers JSON template", "使用 {{text}} 插入文本；一般不需要。", "customHeaders");
    this.textAreaSetting(containerEl, "Body JSON template", "使用 {{text}} 插入笔记文本。", "customBodyTemplate");
    this.textSetting(containerEl, "Audio URL path", "例如 data.audio_url。", "customAudioUrlPath");
    this.textSetting(containerEl, "Audio hex path", "例如 data.audio。", "customAudioHexPath");
    this.textSetting(containerEl, "Audio base64 path", "例如 data.audio_base64。", "customAudioBase64Path");
  }

  private textSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    key: keyof NoteTtsSettings,
    secret = false
  ) {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addText((text) => {
        if (secret) {
          text.inputEl.type = "password";
        }
        text.setValue(String(this.plugin.settings[key] ?? "")).onChange(async (value) => {
          (this.plugin.settings[key] as string) = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private numberSetting(containerEl: HTMLElement, name: string, desc: string, key: keyof NoteTtsSettings) {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addText((text) =>
        text.setValue(String(this.plugin.settings[key] ?? "")).onChange(async (value) => {
          (this.plugin.settings[key] as number) = Number(value);
          await this.plugin.saveSettings();
        })
      );
  }

  private toggleSetting(containerEl: HTMLElement, name: string, desc: string, key: keyof NoteTtsSettings) {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addToggle((toggle) =>
        toggle.setValue(Boolean(this.plugin.settings[key])).onChange(async (value) => {
          (this.plugin.settings[key] as boolean) = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private textAreaSetting(containerEl: HTMLElement, name: string, desc: string, key: keyof NoteTtsSettings) {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addTextArea((text) =>
        text
          .setValue(String(this.plugin.settings[key] ?? ""))
          .onChange(async (value) => {
            (this.plugin.settings[key] as string) = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

function renderJsonTemplate(template: string, text: string) {
  const rendered = template.replace(/{{text}}/g, escapeJsonStringContent(text));
  try {
    return JSON.parse(rendered);
  } catch (error) {
    throw new Error(`JSON 模板无法解析：${error instanceof Error ? error.message : String(error)}`);
  }
}

function escapeJsonStringContent(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function hexToArrayBuffer(hex: string) {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

function base64ToArrayBuffer(base64: string) {
  const clean = base64.includes(",") ? base64.split(",", 2)[1] : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function findFirstUrl(value: unknown): string | null {
  if (typeof value === "string") {
    return value.startsWith("http") || value.startsWith("data:") ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstUrl(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = findFirstUrl(item);
      if (found) return found;
    }
  }
  return null;
}

function getByPath(value: any, path: string) {
  if (!path) return undefined;
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function looksLikeJson(contentType: string | undefined) {
  return Boolean(contentType?.toLowerCase().includes("json"));
}

function extensionFromMime(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("flac")) return "flac";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  return "mp3";
}

function normalizeFolder(folder: string) {
  return (folder || DEFAULT_SETTINGS.outputFolder).replace(/^\/+|\/+$/g, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
}

async function ensureFolder(app: App, folder: string) {
  const parts = folder.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

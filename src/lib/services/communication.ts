// 語音通訊服務，待檢查
import { Api, api } from "$lib/apis";
import { ENV, isDev } from "$lib/config";

export interface ConversationMessage {
    audio: string;
    emotion: string;
}

export class ConversationService extends EventTarget {
    private static audioContext?: AudioContext;
    private static communications: Map<string, WebSocket> = new Map();

    public readyState: "loading" | "ready" | "error" = "loading";
    private socket?: WebSocket;
    private token?: string;
    private currentAudio?: AudioBufferSourceNode;
    private isResponding = false;

    public autoPlay: boolean = true;

    constructor(token: string | Promise<string>) {
        super();
        this.initializeConnection(token);
    }

    private async initializeConnection(token: string | Promise<string>) {
        try {
            const resolvedToken = await Promise.resolve(token);
            this.token = resolvedToken;

            // 重用現有連線或建立新連線
            if (ConversationService.communications.has(resolvedToken)) {
                this.socket = ConversationService.communications.get(resolvedToken);
            } else {
                this.socket = new WebSocket(`${ENV.API.WS_BASE_URL}/response/${resolvedToken}`);
                ConversationService.communications.set(resolvedToken, this.socket);
            }

            if (this.socket?.readyState === WebSocket.OPEN) {
                this.setupSocketHandlers();
            } else {
                this.socket?.addEventListener("open", () => this.setupSocketHandlers());
            }
        } catch (error) {
            this.readyState = "error";
            if (isDev) {
                console.error("[ERR] ConversationService 初始化失敗:", error);
            }

            this.dispatchEvent(new CustomEvent("error", { detail: error }));
        }
    }

    private setupSocketHandlers() {
        if (!this.socket) return;

        this.readyState = "ready";
        this.dispatchEvent(new CustomEvent("ready"));

        this.socket.addEventListener("message", async (event) => {
            const data = JSON.parse(event.data) as ConversationMessage;

            if (isDev) {
                console.log("[DBG] 收到訊息:", data);
            }

            this.dispatchEvent(new CustomEvent("message", { detail: data }));

            this.dispatchEvent(new CustomEvent("received", { detail: data.emotion }));

            if (!this.autoPlay) return;
            const playTask = await this.playAudio(data.audio);

            if (!playTask) return;
            await playTask.promise;

            this.dispatchEvent(new CustomEvent("played", { detail: data.emotion }));
        });

        this.socket.addEventListener("close", () => {
            if (isDev) {
                console.log("[DBG] WebSocket 連線關閉");
            }
            this.readyState = "error";
        });

        this.socket.addEventListener("error", (error) => {
            if (isDev) {
                console.error("[ERR] ConversationService WebSocket 錯誤:", error);
            }
            this.readyState = "error";
        });
    }

    private async playAudio(base64Audio: string) {
        try {
            // 解碼 base64 音訊資料
            const audioData = atob(base64Audio);
            const bytes = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                bytes[i] = audioData.charCodeAt(i);
            }

            // 解碼音訊
            const audioContext = this.getAudioContext();
            const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

            // 停止先前的音訊
            this.currentAudio?.stop();

            // 播放新音訊
            this.currentAudio = audioContext.createBufferSource();
            this.currentAudio.buffer = audioBuffer;
            this.currentAudio.connect(audioContext.destination);

            const promise = new Promise<void>((resolve) => {
                this.currentAudio!.onended = () => {
                    this.currentAudio = undefined;
                    resolve();
                };
                this.currentAudio!.start(0);
            });

            return {
                promise
            };

        } catch (error) {
            if (isDev) {
                console.error("[ERR] ConversationService 音訊播放失敗:", error);
            }
        } finally {
            this.isResponding = false;
            // this.dispatchEvent(new CustomEvent("received", { detail: emotion }) );
        }
    }

    private getAudioContext(): AudioContext {
        if (!ConversationService.audioContext) {
            ConversationService.audioContext = new AudioContext();
        }
        return ConversationService.audioContext;
    }

    // 檢查是否可以發送訊息
    private canSendMessage(): boolean {
        if (!this.socket) {
            if (isDev) console.warn("[WRN] ConversationService WebSocket 未初始化");
            return false;
        }

        if (this.readyState !== "ready") {
            if (isDev) console.warn("[WRN] ConversationService WebSocket 未就緒");
            return false;
        }

        if (this.isResponding) {
            if (isDev) console.warn("[WRN] ConversationService 正在等待回應");
            return false;
        }

        return true;
    }

    // 等待準備就緒
    async waitForReady(): Promise<this> {
        if (this.readyState === "ready" && !this.isResponding) {
            return this;
        }

        return new Promise<this>((resolve, reject) => {
            const checkReady = () => {
                if (this.readyState === "ready" && !this.isResponding) {
                    this.removeEventListener("ready", checkReady);
                    this.removeEventListener("received", checkReady);
                    resolve(this);
                }
            };

            const errorHandler = (event: Event) => {
                this.removeEventListener("ready", checkReady);
                this.removeEventListener("received", checkReady);
                this.removeEventListener("error", errorHandler);
                reject((event as CustomEvent).detail);
            }

            this.addEventListener("ready", checkReady);
            this.addEventListener("received", checkReady);
            this.addEventListener("error", errorHandler);
        });
    }

    // 發送音訊
    sendAudio(blob: Blob): boolean {
        if (!this.canSendMessage()) {
            return false;
        }

        this.socket!.send(blob);
        this.isResponding = true;
        return true;
    }

    // 發送音訊並等待回應
    async sendAudioAndWait(blob: Blob, abortSignal?: AbortSignal) {
        await this.waitForReady();

        if (!this.sendAudio(blob)) {
            throw new Error("無法發送音訊");
        }

        const received = new Promise<string>((resolve) => {
            this.addEventListener("received", (event) => resolve((event as CustomEvent<string>).detail), { once: true });
        });

        const played = this.autoPlay ? new Promise<void>((resolve) => {
            this.addEventListener("played", () => resolve(), { once: true });
        }) : Promise.resolve();

        const emotion = await received;

        return { emotion, played };
    }

    // 關閉連線
    close(): void {
        if (this.socket && this.token) {
            this.socket.close();
            ConversationService.communications.delete(this.token);
            this.socket = undefined;
        }

        this.currentAudio?.stop();
        this.currentAudio = undefined;
    }
}

// 通訊服務管理器
export class CommunicationManager {
    private static instance?: ConversationService;

    static getConversation(): ConversationService {
        if (!this.instance) {
            const tokenPromise = api(Api.chatGetToken).then(response => response.session_token);
            this.instance = new ConversationService(tokenPromise);
        }
        return this.instance;
    }

    static closeConversation(): void {
        if (this.instance) {
            this.instance.close();
            this.instance = undefined;
        }
    }
}
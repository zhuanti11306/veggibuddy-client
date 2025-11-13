


interface AudioWaveformDrawerOptions {
    barColor: string;
    clearWhenDraw: boolean;
    barWidth: number;
    barGap: number;
    fftsize: number;
    durationSec: number;
}


export class WaveformDrawer {

    public static defaultOptions: AudioWaveformDrawerOptions = {
        clearWhenDraw: true,
        barColor: "black",
        barWidth: 3,
        barGap: 1,
        fftsize: 2048,
        durationSec: 0.5
    };

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly options: AudioWaveformDrawerOptions;

    private stream: MediaStream | null = null;

    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataChunk: Float32Array<ArrayBuffer> | null = null;

    private waveformBuffer: Float32Array<ArrayBuffer> | null = null;
    private bufferHead: number = 0;

    constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, options?: Partial<AudioWaveformDrawerOptions>) {
        this.canvas = canvas;
        this.context = context;

        if (context.canvas !== canvas)
            throw new Error("Canvas and context do not match.");

        this.options = { ...WaveformDrawer.defaultOptions, ...options };
    }

    public setStream(stream: MediaStream) {
        this.stream = stream;

        this.audioContext = new AudioContext();

        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.options.fftsize;

        this.dataChunk = new Float32Array(this.analyser.frequencyBinCount);

        const sampleRate = this.audioContext.sampleRate;
        const desiredDuration = this.options.durationSec ?? 0.5;
        const bufferSize = Math.ceil(sampleRate * desiredDuration);

        this.waveformBuffer = new Float32Array(bufferSize);
        this.bufferHead = 0; // 指標

        source.connect(this.analyser);
        // this.analyser.connect(this.audioContext.destination);
    }

    public setFFTSize(fftsize: number) {
        this.options.fftsize = fftsize;

        if (this.analyser) {
            this.analyser.fftSize = fftsize;

            if (this.dataChunk)
                this.dataChunk = new Float32Array(this.analyser.frequencyBinCount);
        }

    }

    public setDuration(duration: number) {
        this.options.durationSec = duration;

        if (this.audioContext && this.waveformBuffer) {
            const sampleRate = this.audioContext.sampleRate;
            const bufferSize = Math.ceil(sampleRate * duration);
            this.waveformBuffer = new Float32Array(bufferSize);
            this.bufferHead = 0;
        }
    }

    public toggleClearWhenDraw(value?: boolean) {
        this.options.clearWhenDraw = value ?? !this.options.clearWhenDraw;
    }

    public setBarColor(color: string) {
        this.options.barColor = color;
    }

    public setBarWidth(width: number) {
        this.options.barWidth = width;
    }

    public setBarGap(gap: number) {
        this.options.barGap = gap;
    }

    public draw() {
        const context = this.context;
        const width = this.canvas.width;
        const height = this.canvas.height;

        if (this.options.clearWhenDraw ?? true)
            context.clearRect(0, 0, width, height);

        context.save();

        const totalBarWidth = this.options.barWidth + this.options.barGap;
        const numberOfBars = Math.floor(width / totalBarWidth);

        if (!this.analyser || !this.dataChunk || !this.waveformBuffer) {
            this.drawWaiting(numberOfBars);
        } else {
            this.drawWaveform(numberOfBars);
        }

        context.restore();
    }

    public destroy() {
        if (this.stream) {
            for (const track of this.stream.getTracks())
                this.stream.removeTrack(track)
            this.stream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
    }

    private waitingLineOffset = 0;

    private drawWaiting(numberOfBars: number) {
        const lines: [fromY: number, toY: number][] = [];

        this.waitingLineOffset = (this.waitingLineOffset + 0.25) % numberOfBars;

        for (let i = 0; i < numberOfBars; i++) {
            const currentValue = (i + this.waitingLineOffset) % numberOfBars - numberOfBars / 2;
            const heightScale = 1.05 ** -(currentValue * currentValue) * 0.5 * Math.sin(currentValue / 5 + i / 3);

            const fromY = (this.canvas.height / 2) * (1 - heightScale);
            const toY = (this.canvas.height / 2);
            lines.push([fromY, toY]);
        }

        this.drawLines(lines);
    }

    private drawWaveform(numberOfBars: number) {

        if (!this.analyser || !this.dataChunk || !this.waveformBuffer)
            return;

        const width = this.canvas.width;
        const height = this.canvas.height;

        this.analyser.getFloatTimeDomainData(this.dataChunk);
        for (let i = 0; i < this.dataChunk.length; i++) {
            this.waveformBuffer[this.bufferHead] = this.dataChunk[i];
            this.bufferHead = (this.bufferHead + 1) % this.waveformBuffer.length;
        }

        const bufferSize = this.waveformBuffer.length;

        const samplesPerBar = Math.floor(bufferSize / numberOfBars);

        const lines: [fromY: number, toY: number][] = [];

        for (let i = 0; i < numberOfBars; i++) {
            const barStartIndex = i * samplesPerBar;
            let peak = 0;

            for (let j = 0; j < samplesPerBar; j++) {
                const index = (this.bufferHead + barStartIndex + j) % bufferSize;
                const value = Math.abs(this.waveformBuffer[index]);
                if (value > peak) {
                    peak = value;
                }
            }

            // peak 的範圍是 [0, 1.0]
            const barHeight = Math.max(peak, 0.0078625) * height;

            const yStart = height / 2 - barHeight / 2;
            const yEnd = height / 2 + barHeight / 2;
            
            lines.push([yStart, yEnd]);
        }

        this.drawLines(lines);
    }

    private drawLines(lines: [fromY: number, toY: number][]) {
        const context = this.context;
        const width = this.canvas.width;

        context.lineWidth = this.options.barWidth;
        context.strokeStyle = this.options.barColor;
        context.lineCap = "round";

        const totalBarWidth = this.options.barWidth + this.options.barGap;
        const numberOfBars = Math.floor(width / totalBarWidth);
        const paddingX = (width - (numberOfBars * totalBarWidth)) / 2 + this.options.barGap;

        for (let i = 0; i < lines.length; i++) {
            const yStart = lines[i][0];
            const yEnd = lines[i][1];
            const x = i * totalBarWidth + paddingX;

            context.beginPath();
            context.moveTo(x, yStart);
            context.lineTo(x, yEnd);
            context.stroke();
        }
    }
}
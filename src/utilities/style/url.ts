export abstract class Source<T> {
    public readonly url: string;
    protected source: T;
    
    protected constructor(url: string, source: T) {
        this.url = url;
        this.source = source;
    }

    public getSource(): T {
        return this.source;
    }

    public abstract isLoaded(): boolean;
    public abstract load(): Promise<void>;
}

export class FontSource extends Source<FontFace> {
    public readonly fontFamily: string;

    constructor(fontFamily: string, url: string) {
        super(url, new FontFace(fontFamily, `url(${url})`));
        this.fontFamily = fontFamily;
    }

    public async load(): Promise<void> {
        if (this.isLoaded())
            return;
        
        await this.source.load();
        document.fonts.add(this.source);
    }

    public isLoaded(): boolean {
        return this.source.status === "loaded";
    }
}

export class ImageSource extends Source<HTMLImageElement> {
    constructor(url: string) {
        super(url, new Image());
        this.source.src = url;
    }

    public async load(): Promise<void> {
        if (this.isLoaded())
            return;

        await this.source.decode();
    }

    public isLoaded(): boolean {
        return this.source.complete && this.source.naturalWidth > 0;
    }
}
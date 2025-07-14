
export abstract class Color {
    abstract toString(): string;
    abstract toRGBA(): RGBA;
    abstract toHSLA(): HSLA;

    abstract alphaWith(value: number): Color;

    static readonly BLACK: Color;
    static readonly WHITE: Color;
    static readonly RED: Color;
    static readonly GREEN: Color;
    static readonly BLUE: Color;
    static readonly YELLOW: Color;
    static readonly CYAN: Color;
    static readonly MAGENTA: Color;
    static readonly TRANSPARENT: Color;
}

export class RGBA extends Color {
    public readonly r: number;
    public readonly g: number;
    public readonly b: number;
    public readonly a: number;

    constructor(r: number, g: number, b: number, a: number = 1) {
        super();
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    toString(): string {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }

    public toRGBA(): RGBA {
        return this;
    }

    public toHSLA(): HSLA {
        const r = this.r / 255;
        const g = this.g / 255;
        const b = this.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h!: number, s: number, l: number = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return new HSLA(h * 360, s * 100, l * 100, this.a);
    }

    static fromHex(hex: string | number): RGBA {
        if (typeof hex === 'string') {
            if (hex.match(/^#([0-9a-fA-F]{3})$/)) {
                // Convert 3-digit hex to 6-digit hex
                hex = hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            } else if (!hex.match(/^#([0-9a-fA-F]{6})$/)) {
                throw new Error(`Invalid hex color format: ${hex}`);
            }

            hex = hex.replace('#', '');
            hex = parseInt(hex, 16);
        }

        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        
        return new RGBA(r, g, b);
    }

    public alphaWith(value: number): RGBA {
        return new RGBA(this.r, this.g, this.b, value);
    }
}

export class HSLA extends Color {
    public readonly h: number; // 0-360
    public readonly s: number; // 0-100
    public readonly l: number; // 0-100
    public readonly a: number; // 0-1

    constructor(h: number, s: number, l: number, a: number = 1) {
        super();
        this.h = h;
        this.s = s;
        this.l = l;
        this.a = a;
    }

    toString(): string {
        return `hsla(${this.h}, ${this.s}%, ${this.l}%, ${this.a})`;
    }

    public toRGBA(): RGBA {
        const s = this.s / 100;
        const l = this.l / 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((this.h / 60) % 2 - 1));
        const m = l - c / 2;

        let r: number, g: number, b: number;

        if (this.h < 60) {
            r = c; g = x; b = 0;
        } else if (this.h < 120) {
            r = x; g = c; b = 0;
        } else if (this.h < 180) {
            r = 0; g = c; b = x;
        } else if (this.h < 240) {
            r = 0; g = x; b = c;
        } else if (this.h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        return new RGBA(
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
            this.a
        );
    }

    public toHSLA(): HSLA {
        return this;
    }

    public alphaWith(value: number): HSLA {
        return new HSLA(this.h, this.s, this.l, value);
    }
}

Object.defineProperty(Color, 'BLACK', { value: new RGBA(0, 0, 0) });
Object.defineProperty(Color, 'WHITE', { value: new RGBA(255, 255, 255) });
Object.defineProperty(Color, 'RED', { value: new RGBA(255, 0, 0) });
Object.defineProperty(Color, 'GREEN', { value: new RGBA(0, 255, 0) });
Object.defineProperty(Color, 'BLUE', { value: new RGBA(0, 0, 255) });
Object.defineProperty(Color, 'YELLOW', { value: new RGBA(255, 255, 0) });
Object.defineProperty(Color, 'CYAN', { value: new RGBA(0, 255, 255) });
Object.defineProperty(Color, 'MAGENTA', { value: new RGBA(255, 0, 255) });
Object.defineProperty(Color, 'TRANSPARENT', { value: new RGBA(0, 0, 0, 0) });

import { ComponentSize } from "./component-2d";

import { FontSource } from "@/utilities/style/url";
import { Color } from "@/utilities/style/color";
import { StyledComponent } from "./styled-component";

export interface LabelStyle {
    color: string | Color;
    fontFamily: string | FontSource;
    fontSize: number;
    fontWeight: "normal" | "bold" | number;
    fontStyle: "normal" | "italic" | "oblique";
    textAlign: "left" | "center" | "right";
    lineHeight: number;
    width: number | "auto";
}

export class Label extends StyledComponent<LabelStyle> {
    public static readonly defaultStyle: LabelStyle = <const>{
        color: Color.BLACK,
        fontFamily: "HYRunYuan-65W",
        fontSize: 16,
        fontWeight: "normal",
        fontStyle: "normal",
        textAlign: "center",
        lineHeight: 4 / 3,
        width: "auto"
    };
    
    private text: string[];
    private preferredSize: { width: number, height: number } | null = null;

    constructor(text: string, style?: Partial<LabelStyle>) {
        super(style);
        this.text = text.split("\n");
    }

    public getText(): string {
        return this.text.join("\n");
    }

    public setText(text: string): void {
        this.text = text.split("\n");
        this.preferredSize = null; // Reset preferred size when text changes
    }

    protected getDefaultStyle(): LabelStyle {
        return Label.defaultStyle;
    }

    protected drawAppearance(): void {
        super.drawAppearance();

        console.log(this.geometry);

        const style = this.styleContext();
        this.context.textBaseline = "top";

        const fontSize = style.fontSize;
        const lineHeight = fontSize * style.lineHeight;
        const textureWidth = this.getPreferredSize().width;
        
        const drawX: number = 
            style.textAlign === "left" ? 0 :
            style.textAlign === "center" ? textureWidth / 2 :
            textureWidth;
        
        this.text.forEach((line, index) => {
            const drawY = index * lineHeight + (lineHeight - fontSize) / 2;
            this.context.fillText(line, drawX, drawY);
        });
    }

    public override getMinSize(): ComponentSize {
        return this.preferredSize ??= this.calculatePreferredSize();
    } 

    public override getPreferredSize(): ComponentSize {
        return this.preferredSize ??= this.calculatePreferredSize();
    }

    private styleContext(): LabelStyle {
        const style = this.getStyle();
        const fontFamily = style.fontFamily instanceof FontSource ? style.fontFamily.fontFamily : style.fontFamily;

        this.context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${fontFamily}`;
        this.context.textAlign = style.textAlign;
        this.context.fillStyle = style.color instanceof Color ? style.color.toString() : style.color;

        return style;
    }


    private calculatePreferredSize(): { width: number, height: number } {
        const style = this.styleContext();

        const lineHeight = style.fontSize * style.lineHeight;
        
        const metrics = this.text.map(line => this.context.measureText(line));
        const width = Math.max(...metrics.map(m => m.width));
        const height = metrics.length * lineHeight;

        return { width, height };
    }
}
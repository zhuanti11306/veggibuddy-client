import { Component2D } from "./component-2d";

export type StyleDefine = {
    [key: string]: any; // Define a generic style type
}

export type OptionalStyle<T> = {
    [P in keyof T]?: T[P] extends StyleDefine ? OptionalStyle<T[P]> : T[P];
};

export abstract class StyledComponent<Style extends StyleDefine> extends Component2D {

    protected style: Style;

    constructor(style?: OptionalStyle<Style>) {
        super();
        this.style = style ? this.setDefaultValue(style) : this.getDefaultStyle();
        console.log(`[DBG] ${this.constructor.name} initialized with style:`, this.style);
    }

    public getStyle(): Style {
        return this.style;
    }

    public setStyle(style: OptionalStyle<Style>): void {
        StyledComponent.mergeStyle(this.style, style);
    }

    public resetStyle(...styleNames: (keyof Style)[]): void {
        // 如果沒有傳入任何 styleName，則重設所有樣式
        if (styleNames.length === 0) {
            this.style = this.getDefaultStyle();
            return;
        }

        const defaultStyle = this.getDefaultStyle();
        for (const name of styleNames) {
            // 確保預設樣式中有這個鍵
            if (name in defaultStyle) {
                this.style[name] = defaultStyle[name];
            }
        }
    }

    protected abstract getDefaultStyle(): Style;

    protected setDefaultValue(style: OptionalStyle<Style>): Style {
        const defaultStyle = this.getDefaultStyle();
        const currentStyle = { ...defaultStyle };

        StyledComponent.mergeStyle(currentStyle, style);

        return currentStyle as Style;
    }

    /**
     * 檢查給定的值是否為純物件。
     * @param value 待檢查的值
     * @returns true 如果是純物件，否則 false
     */
    protected static isPlainObject(value: any): value is StyleDefine {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return false;
        }
        
        const proto = Object.getPrototypeOf(value);
        return proto === Object.prototype || proto === null;
    }

    /**
     * 將 partialUpdate 物件中的值，遞迴地合併到 targetWithDefaults 物件中。
     * 此方法会直接修改 targetWithDefaults 物件。
     * 只會處理在 targetWithDefaults 中已經存在的鍵。
     * @param targetWithDefaults 完整的樣式物件 (通常是預設樣式或當前樣式)。
     * @param partialUpdate 包含部分更新值的物件。
     */
    protected static mergeStyle(targetWithDefaults: StyleDefine, partialUpdate: OptionalStyle<StyleDefine>): void {
        // 遍歷目標物件的鍵，確保最終物件的結構與預設值一致
        for (const key in targetWithDefaults) {
            
            // 如果 partialUpdate 中有這個鍵，則進行合併
            if (key in partialUpdate && partialUpdate[key] !== undefined) {
                const targetValue = targetWithDefaults[key];
                const sourceValue = partialUpdate[key];

                // 如果目標和來源對應的值都是非陣列物件，則進行遞迴合併
                if (
                    StyledComponent.isPlainObject(targetValue) &&
                    StyledComponent.isPlainObject(sourceValue)
                ) {
                    StyledComponent.mergeStyle(targetValue, sourceValue);
                } else {
                    // 否則，直接用來源值覆寫目標值
                    targetWithDefaults[key] = sourceValue;
                }
            }
        }
    }
}
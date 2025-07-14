import { ImageSource } from "@/utilities/style/url";
import { BoxLayout, BoxLayoutConstraints, BoxLayoutOptions } from "./box-layout";
import { Component2D, ComponentGeometry, ComponentSize } from "./component-2d";
import { EmptyLayout, LayoutManager } from "./layout-manager";
import { OptionalStyle, StyledComponent } from "./styled-component";

export type LayoutContraints = BoxLayoutConstraints;

export type EmptyLayoutStyle = {
    type: "empty";
}

export type BoxLayoutStyle = {
    type: "box";
    axis: BoxLayoutOptions["axis"];
    align: BoxLayoutOptions["align"];
    justify: BoxLayoutOptions["justify"];
    gap: number;
    padding: number;
}

type BackgroundSizeWidth = { percentWidth: number } | { width: number } | {};
type BackgroundSizeHeight = { percentHeight: number } | { height: number } | {};

export type BackgroundStyle = {
    color: string;
    image: ImageSource | null;
    repeat: "repeat" | "no-repeat" | "repeat-x" | "repeat-y";
    size: "cover" | "contain" | (BackgroundSizeWidth & BackgroundSizeHeight) | null;
    position: {
        x: number | "left" | "center" | "right";
        y: number | "top" | "center" | "bottom";
    }
}

export type BorderStyle = {
    width: number;
    color: string;
    radius: number;
}

export type SizeStyle = {
    width: number | "auto";
    height: number | "auto";

    minWidth: number;
    minHeight: number;

    maxWidth: number;
    maxHeight: number;
}

export interface ContainerStyle {
    size: SizeStyle;
    layout: BoxLayoutStyle | EmptyLayoutStyle;
    background: BackgroundStyle;
    border: BorderStyle;
}

type ContainerBackgroundImageInfo = {
    pattern: CanvasPattern;
    translate: [x: number, y: number];
    fillRect: [x: number, y: number, width: number, height: number];
}

export class Container extends StyledComponent<ContainerStyle> {
    protected children: Component2D[] = [];
    protected constraints: Map<Component2D, Partial<LayoutContraints>> = new Map();

    private layoutManager: LayoutManager = EmptyLayout;

    private isLayoutDirty: boolean = true;

    private isBoxModelDirty: boolean = true;
    private isBackgroundPatternDirty: boolean = true;

    private borderRegion: Path2D | null = null;
    private contentRegion: Path2D | null = null;
    private background: ContainerBackgroundImageInfo | null = null;

    constructor(style: OptionalStyle<ContainerStyle>, children?: (Component2D | { component: Component2D, constraints: LayoutContraints })[]) {
        super(style);

        // 根據樣式定義初始化佈局管理器

        const { layout: layoutStyle } = this.getStyle();

        switch (layoutStyle.type) {
            case "box":
                this.setLayout(new BoxLayout(layoutStyle));
                break;
            default:
                console.warn("Unsupported layout type:", layoutStyle.type);
                this.setLayout(EmptyLayout);
                break;
        }

        // 如果有子組件，則添加到容器中
        // 如果是 Component2D，則直接添加；如果是帶約束的組件，則添加並設置約束

        if (children) {
            for (const child of children) {
                if (child instanceof Component2D) {
                    this.addChild(child); // 如果是 Component2D，直接添加
                } else if (typeof child === "object" && "component" in child && "constraints" in child) {
                    this.addChild(child.component, child.constraints);
                } else {
                    console.warn("Invalid child type:", child);
                }
            }
        }
    }

    // 獲取和設置樣式

    public getDefaultStyle(): ContainerStyle {
        return {
            layout: {
                type: "box",
                axis: "horizontal",
                align: "stretch",
                justify: "space-between",
                gap: 0,
                padding: 0
            },

            background: {
                color: "transparent",
                image: null,
                repeat: "no-repeat",
                size: null,
                position: {
                    x: "center",
                    y: "center"
                }
            },

            border: {
                width: 0,
                color: "transparent",
                radius: 0
            },

            size: {
                width: "auto",
                height: "auto",
                minWidth: 0,
                minHeight: 0,
                maxWidth: Infinity,
                maxHeight: Infinity
            }
        }
    }

    public override setStyle(style: OptionalStyle<ContainerStyle>): void {
        super.setStyle(style);

        if (style.border)
            this.isBoxModelDirty = true; // 如果邊框樣式改變，則需要重新計算邊框區域

        if (style.background) {
            this.isBackgroundPatternDirty = true; // 如果背景樣式改變，則需要重新計算背景圖案
        }

        this.redraw(); // 重繪容器以應用新樣式
    }

    // 獲取和設置佈局管理器

    public setLayout(layoutManager: LayoutManager | null): void {
        if (!layoutManager) {
            this.layoutManager = EmptyLayout; // 如果沒有提供佈局管理器，則使用空佈局
        } else {
            this.layoutManager = layoutManager; // 設置自定義佈局管理器
        }

        this.isLayoutDirty = true; // 標記佈局需要更新
    }

    public getLayout(): LayoutManager | null {
        if (this.layoutManager === EmptyLayout) {
            return null; // 如果是空佈局，則返回 null
        }

        return this.layoutManager; // 返回當前的佈局管理器
    }

    // 添加和移除子組件

    public addChild(child: Component2D, constraints?: Partial<LayoutContraints>): void {
        if (this.children.includes(child)) {
            this.constraints.set(child, { ...constraints });
            return; // 如果子組件已經存在，則更新約束並返回
        }

        this.children.push(child);
        if (constraints)
            this.constraints.set(child, { ...constraints }); // 設置約束條件

        child.setParent(this);
        this.recalculateLayout(); // 重新計算佈局
    }

    public removeChild(child: Component2D): void {
        const index = this.children.indexOf(child);
        if (index === -1) return; // 如果沒有找到，則不做任何操作

        this.children.splice(index, 1); // 從子組件列表中移除
        child.setParent(null); // 清除父級引用
        child.setGeometry(null); // 清除幾何體
        this.constraints.delete(child); // 刪除約束條件
        this.recalculateLayout(); // 重新計算佈局
    }

    public getChildren(): Component2D[] {
        return this.children; // 返回子組件列表
    }

    // 獲取和設置子組件約束

    public getConstraints(child: Component2D): Partial<LayoutContraints> | null {
        return this.constraints.get(child) ?? null; // 返回指定子組件的約束條件，如果沒有則返回 null
    }

    // 重繪和更新

    public recalculateLayout(): void {
        this.isLayoutDirty = true; // 標記佈局需要更新
        this.redraw(); // 重繪容器
    }

    // 獲取容器的最小、最大和首選尺寸

    public override getMinSize(): ComponentSize {
        const { size } = this.getStyle();
        const demandMinSize = this.layoutManager.getMinSize(this);

        return {
            width: Math.max(size.minWidth, demandMinSize.width),
            height: Math.max(size.minHeight, demandMinSize.height)
        };
    }

    public override getMaxSize(): ComponentSize {
        const { size } = this.getStyle();
        const demandMaxSize = this.layoutManager.getMaxSize(this);

        return {
            width: Math.min(size.maxWidth, demandMaxSize.width),
            height: Math.min(size.maxHeight, demandMaxSize.height)
        };
    }

    public override getPreferredSize(): ComponentSize {
        const preferredSize = { width: 0, height: 0 };

        const { size } = this.getStyle();
        const demandPreferredSize = this.layoutManager.getPreferredSize(this);
        const demandMinSize = this.getMinSize();

        if (size.width === "auto") {
            preferredSize.width = Math.max(demandPreferredSize.width);
        } else {
            preferredSize.width = Math.min(size.width, demandMinSize.width);
        }

        if (size.height === "auto") {
            preferredSize.height = Math.max(demandPreferredSize.height);
        } else {
            preferredSize.height = Math.min(size.height, demandMinSize.height);
        }

        return {
            width: preferredSize.width,
            height: preferredSize.height
        };
    }

    // 覆寫更新和渲染方法

    public override setGeometry(geometry: ComponentGeometry | null): void {
        super.setGeometry(geometry);

        if (this.isGeometrySizeDirty || this.isGeometryPositionDirty)
            this.recalculateLayout(); // 如果幾何體已經被標記為需要更新，則需要重新計算佈局
    }

    protected updateLayout(): void {
        // 執行佈局管理器的佈局計算
        this.layoutManager.performLayout(this, this.isGeometrySizeDirty);
    }

    protected override updateGeometry(): void {
        super.updateGeometry(); // 更新幾何體

        if (this.isGeometrySizeDirty) {
            this.isBoxModelDirty = true; // 如果幾何體大小改變，則需要重新計算邊框區域
        }
    }

    protected override drawAppearance(): void {
        super.drawAppearance(); // 清理畫布

        const geometry = this.getGeometry();
        if (!geometry) return; // 如果幾何體為 null，則不進行繪製

        this.context.save(); // 保存當前上下文狀態

        const { background, border } = this.getStyle();
        const { width, height } = geometry.size;

        const boxModelRegion = this.getBoxModelRegion();

        if (border.width > 0) {
            this.context.fillStyle = border.color; // 設定邊框顏色
            this.context.fill(boxModelRegion.border); // 填充邊框區域
        }

        this.context.clip(boxModelRegion.content); // 剪裁內容區域

        this.context.fillStyle = background.color; // 設定背景顏色
        this.context.fillRect(0, 0, width, height); // 填充

        // 如果有背景圖片且已載入

        const backgroundPattern = this.getBackgroundImageInfo();

        if (backgroundPattern) {
            this.context.translate(...backgroundPattern.translate); // 平移畫布以對齊背景圖案
            this.context.fillStyle = backgroundPattern.pattern; // 設定填充樣式為背景圖案
            this.context.fillRect(...backgroundPattern.fillRect); // 填充背景圖案區域
        }

        this.context.restore(); // 恢復上下文狀態
    }

    public getBoxModelRegion(): { border: Path2D, content: Path2D } {
        if (this.isBoxModelDirty || !this.borderRegion || !this.contentRegion) {
            this.borderRegion = new Path2D();
            this.contentRegion = new Path2D();

            const geometry = this.getGeometry();
            if (!geometry) return { border: this.borderRegion, content: this.contentRegion };

            const { width, height } = geometry.size;
            const { border } = this.getStyle();

            this.borderRegion.roundRect(
                0, 0, width, height,
                border.radius
            );

            this.contentRegion.roundRect(
                border.width, border.width,
                width - border.width * 2, height - border.width * 2,
                Math.max(0, border.radius - border.width)
            );

            this.isBoxModelDirty = false; // 重置邊框區域更新標誌
        }

        return {
            border: this.borderRegion,
            content: this.contentRegion
        };
    }

    public getBackgroundImageInfo(): ContainerBackgroundImageInfo | null {
        if (this.isBackgroundPatternDirty || !this.background) {
            const geometry = this.getGeometry();
            if (!geometry)
                return null; // 如果幾何體為 null，則不進行繪製

            const { background } = this.getStyle();
            
            if (!(background.image && background.image.isLoaded()))
                return null;

            const image = background.image.getSource()!;

            const pattern = this.context.createPattern(image, background.repeat);

            if (!pattern)
                return null; // 如果無法創建圖案，則返回 null

            let translateX = 0, translateY = 0;
            let startX: number = 0, startY: number = 0;
            let drawWidth: number = image.width, drawHeight: number = image.height;

            switch (background.position.x) {
                case "left":
                    break;
                case "center":
                    startX = (geometry.size.width - image.width) / 2;
                    break;
                case "right":
                    startX = geometry.size.width - image.width;
                    break;
                default:
                    startX = background.position.x;
                    break;
            }

            switch (background.position.y) {
                case "top":
                    break;
                case "center":
                    startY = (geometry.size.height - image.height) / 2;
                    break;
                case "bottom":
                    startY = geometry.size.height - image.height;
                    break;
                default:
                    startY = background.position.y;
                    break;
            }

            const imageAspectRatio = image.width / image.height;
            const containerAspectRatio = geometry.size.width / geometry.size.height;

            switch (background.size) {
                case "cover":
                    if (imageAspectRatio > containerAspectRatio) {
                        drawHeight = geometry.size.height;
                        drawWidth = drawHeight * imageAspectRatio;
                    } else {
                        drawWidth = geometry.size.width;
                        drawHeight = drawWidth / imageAspectRatio;
                    }
                    break;

                case "contain":
                    if (imageAspectRatio > containerAspectRatio) {
                        drawWidth = geometry.size.width;
                        drawHeight = drawWidth / imageAspectRatio;
                    } else {
                        drawHeight = geometry.size.height;
                        drawWidth = drawHeight * imageAspectRatio;
                    }
                    break;

                case null:
                    break;

                default:
                    if ("percentWidth" in background.size)
                        drawWidth = geometry.size.width * (background.size.percentWidth / 100);
                    else if ("width" in background.size)
                        drawWidth = background.size.width;

                    if ("percentHeight" in background.size)
                        drawHeight = geometry.size.height * (background.size.percentHeight / 100);
                    else if ("height" in background.size)
                        drawHeight = background.size.height;
            }

            if (background.repeat === "repeat-x" || background.repeat === "repeat") {
                translateY = -startY % image.height;
                startY = 0;
                drawHeight = geometry.size.height + startY;
            }

            if (background.repeat === "repeat-y" || background.repeat === "repeat") {
                translateX = -startX % image.width;
                startX = 0;
                drawWidth = geometry.size.width + startX;
            }

            this.background = {
                pattern,
                translate: [translateX, translateY],
                fillRect: [startX, startY, drawWidth, drawHeight]
            };
        }

        return this.background;
    }

    public override update(deltatime: number): void {

        if (this.isLayoutDirty)
            this.updateLayout(); // 更新佈局

        super.update(deltatime); // 更新幾何體和外觀
        this.isLayoutDirty = false; // 重置佈局更新標誌

        for (const child of this.children)
            child.update(deltatime); // 更新每個子組件
    }

    public override render(): void {
        super.render(); // 渲染容器自身

        for (const child of this.children)
            child.render(); // 渲染每個子組件
    }
}
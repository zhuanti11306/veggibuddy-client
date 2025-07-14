import { Container } from "./container";
import { LayoutManager } from "./layout-manager";
import { ComponentGeometry, ComponentSize } from "./component-2d";

export const enum BoxLayoutAlignment {
    start = "start",
    end = "end",
    center = "center",
    stretch = "stretch"
}

export const enum BoxLayoutJustify {
    start = "start",
    end = "end",
    center = "center",
    spaceBetween = "space-between",
    spaceAround = "space-around"
}

export const enum BoxLayoutAxis {
    horizontal = "horizontal",
    vertical = "vertical"
}

export interface BoxLayoutConstraints {
    grow: number; // 子元素在主軸方向上的增長因子
    // shrink?: number; // 子元素在主軸方向上的收縮因子
}

export interface BoxLayoutOptions {
    /**
     * 佈局方向。
     * @default BoxLayoutAxis.vertical
     */
    axis: BoxLayoutAxis | `${BoxLayoutAxis}`; // 佈局方向

    /** 
     * 主軸對齊方式。
     * @default BoxLayoutJustify.start
     */
    justify: BoxLayoutJustify | `${BoxLayoutJustify}`; // 主軸對齊方式

    /** 
     * 副軸對齊方式。
     * @default BoxLayoutAlignment.stretch
     */
    align: BoxLayoutAlignment | `${BoxLayoutAlignment}`; // 副軸對齊方式

    /** 
     * 元素之間的間距，單位為像素。
     * @default 0
     */
    gap: number;

    /** 
     * 內邊距，單位為像素。
     * @default 0
     */
    padding: number; // 內邊距
}

type AxisNames = {
    main: "width" | "height";
    cross: "width" | "height";
    mainPos: "x" | "y";
    crossPos: "x" | "y";
};

type ChildSizeRequirements = {
    main: { min: number; max: number; preferred: number };
    cross: { min: number; max: number; preferred: number };
    constraints: BoxLayoutConstraints; // 可選的約束條件
};

export class BoxLayout implements LayoutManager {

    private readonly options: BoxLayoutOptions;
    private readonly axisNames: AxisNames;

    private static readonly defaultOptions: BoxLayoutOptions = {
        axis: BoxLayoutAxis.vertical,
        justify: BoxLayoutJustify.start,
        align: BoxLayoutAlignment.stretch,
        gap: 0,
        padding: 0
    };

    private static readonly defaultConstraints: BoxLayoutConstraints = {
        grow: 0
    }

    private containerPosition: { x: number, y: number } = { x: 0, y: 0 };

    constructor(options?: Partial<BoxLayoutOptions>) {
        this.options = {
            ...BoxLayout.defaultOptions,
            ...options // 合併默認選項和用戶提供的選項
        };

        switch (this.options.axis) {
            case BoxLayoutAxis.vertical:
                this.axisNames = {
                    main: "height",
                    cross: "width",
                    mainPos: "y",
                    crossPos: "x"
                };
                break;
            case BoxLayoutAxis.horizontal:
                this.axisNames = {
                    main: "width",
                    cross: "height",
                    mainPos: "x",
                    crossPos: "y"
                };
                break;
            default:
                console.log("[DBG] BoxLayout: Unsupported axis, defaulting to vertical.");
                this.axisNames = {
                    main: "height",
                    cross: "width",
                    mainPos: "y",
                    crossPos: "x"
                };
                break;
        }

    }

    public performLayout(container: Container, isSizeDirty?: boolean): void {
        if (isSizeDirty) {
            this.recalculateLayout(container);
        } else {
            this.adjustChildPosition(container);
        }
    }

    private recalculateLayout(container: Container): void {
        const containerGeometry = container.getGeometry();
        const children = container.getChildren();

        if (!containerGeometry) {
            for (const child of children)
                child.setGeometry(null); // 如果容器沒有幾何體，則清除所有子元素的幾何體
            return;
        }

        const childrenSizes = this.getChildrenSizeRequirements(container);

        const availableMainSize = containerGeometry.size[this.axisNames.main] - this.options.padding * 2; // 可用主軸大小
        const availableCrossSize = containerGeometry.size[this.axisNames.cross] - this.options.padding * 2; // 可用副軸大小

        const mainAxisGeometries = this.calculateMainAxis(childrenSizes, availableMainSize);
        const finalGeometries = mainAxisGeometries.map(geometry => ({
            position: { [this.axisNames.mainPos]: geometry.pos, [this.axisNames.crossPos]: 0 } as { x: number, y: number },
            size: { [this.axisNames.main]: geometry.size, [this.axisNames.cross]: 0 } as { width: number, height: number }
        }));

        this.calculateCrossAxis(finalGeometries, childrenSizes, availableCrossSize);

        const containerPos = containerGeometry.position;
        for (const [index, child] of children.entries()) {
            const geometry = finalGeometries[index];

            // 檢查尺寸是否有效
            if (geometry.size.width <= 0 || geometry.size.height <= 0) {
                child.setGeometry(null);
            } else {
                // [新增] 5. 轉換為全局座標
                geometry.position.x += containerPos.x;
                geometry.position.y += containerPos.y;
                child.setGeometry(geometry);
            }
        }
    }

    private adjustChildPosition(container: Container): void {
        const lastContainerPosition = this.containerPosition;
        const currentContainerPosition = container.getGeometry();

        if (!currentContainerPosition) return;

        const deltaX = currentContainerPosition.position.x - lastContainerPosition.x;
        const deltaY = currentContainerPosition.position.y - lastContainerPosition.y;

        for (const child of container.getChildren()) {
            const childGeometry = structuredClone(child.getGeometry());
            if (!childGeometry) continue;

            // 更新子元素的位置
            childGeometry.position.x += deltaX;
            childGeometry.position.y += deltaY;
            child.setGeometry(childGeometry);
        }
    }

    public getMinSize(container: Container): ComponentSize {
        const childrenReqs = this.getChildrenSizeRequirements(container);
        const { main, cross } = this.axisNames;

        const minMainSize = childrenReqs.reduce((sum, req) => sum + req.main.min, 0);
        const minCrossSize = Math.max(...childrenReqs.map(req => req.cross.min));

        const size = { width: 0, height: 0 };
        size[main] = minMainSize + this.options.padding * 2; // 加上內邊距
        size[cross] = minCrossSize + this.options.padding * 2; // 加上內邊距

        return size;
    }

    public getMaxSize(): ComponentSize {
        return { width: Infinity, height: Infinity }; // 無限大，BoxLayout 沒有最大尺寸限制
    }

    public getPreferredSize(container: Container): ComponentSize {
        const childrenReqs = this.getChildrenSizeRequirements(container);
        const { main, cross } = this.axisNames;

        const preferredMainSize = childrenReqs.reduce((sum, req) => sum + req.main.preferred, 0);
        const preferredCrossSize = Math.max(...childrenReqs.map(req => req.cross.preferred));

        const size = { width: 0, height: 0 };
        size[main] = preferredMainSize + this.options.padding * 2; // 加上內邊距
        size[cross] = preferredCrossSize + this.options.padding * 2; // 加上內邊距

        return size;
    }

    private getChildrenSizeRequirements(container: Container): ChildSizeRequirements[] {
        const { main, cross } = this.axisNames;
        return container.getChildren().map(child => {
            const min = (child as any).getMinSize();
            const max = (child as any).getMaxSize();
            const preferred = (child as any).getPreferredSize();
            // [修正] 拼寫錯誤: getConstraints
            const constraints = { ...BoxLayout.defaultConstraints, ...container.getConstraints(child) };

            return {
                main: { min: min[main], max: max[main], preferred: preferred[main] },
                cross: { min: min[cross], max: max[cross], preferred: preferred[cross] },
                constraints
            };
        });
    }

    private calculateMainAxis(childrenReqs: ChildSizeRequirements[], availableSize: number): { pos: number, size: number }[] {
        const { padding, gap, justify } = this.options;
        const childCount = childrenReqs.length;
        if (childCount === 0) return [];

        const results: { pos: number, size: number }[] = childrenReqs.map(() => ({ pos: 0, size: 0 }));

        // --- 步驟 1: 設置基礎尺寸 ---
        // 每個元素先獲得它們的 preferred 尺寸，並將其作為計算的起點
        let totalPreferredSize = 0;
        childrenReqs.forEach((req, i) => {
            const preferred = req.main.preferred;
            results[i].size = preferred;
            totalPreferredSize += preferred;
        });

        const totalGap = gap * (childCount - 1);
        const remainingSpace = availableSize - totalPreferredSize - totalGap;

        // --- 步驟 2: 分配剩餘空間 (增長或收縮) ---
        if (remainingSpace > 0) {
            // **增長邏輯 (Grow)**
            const totalGrow = childrenReqs.reduce((sum, s) => sum + s.constraints.grow, 0);
            if (totalGrow > 0) {
                const spacePerGrowUnit = remainingSpace / totalGrow;
                childrenReqs.forEach((req, i) => {
                    const growAddition = spacePerGrowUnit * req.constraints.grow;
                    const newSize = results[i].size + growAddition;
                    // 確保增長後的尺寸不超過 max
                    results[i].size = Math.min(newSize, req.main.max);
                });
            }
        } else if (remainingSpace < 0) {
            // **收縮邏輯 (Shrink)**
            // 這裡我們實現一個簡易的、按比例的收縮邏輯
            const totalOverload = -remainingSpace;
            let totalShrinkableAmount = 0;
            childrenReqs.forEach((req, i) => {
                totalShrinkableAmount += results[i].size - req.main.min;
            });
            
            if (totalShrinkableAmount > 0) {
                childrenReqs.forEach((req, i) => {
                    const shrinkable = results[i].size - req.main.min;
                    const shrinkRatio = shrinkable / totalShrinkableAmount;
                    const shrinkAmount = totalOverload * shrinkRatio;
                    results[i].size -= shrinkAmount;
                });
            }
        }

        // --- 步驟 3: 計算最終位置 (處理 Justify) ---
        // 注意：只有在沒有 grow 元素且空間有剩餘時，justify 才有明顯效果
        const finalTotalSize = results.reduce((sum, r) => sum + r.size, 0) + totalGap;
        let finalRemainingSpace = availableSize - finalTotalSize;
        
        // 為了避免浮點數精度問題導致微小的負數，我們做個處理
        if (Math.abs(finalRemainingSpace) < 1e-5) {
            finalRemainingSpace = 0;
        }

        let currentPos = padding;
        let dynamicGap = gap;

        // 僅當空間有剩餘時，justify 才有分配意義
        if (finalRemainingSpace > 0) {
            switch (justify) {
                case BoxLayoutJustify.end:
                    currentPos += finalRemainingSpace;
                    break;
                case BoxLayoutJustify.center:
                    currentPos += finalRemainingSpace / 2;
                    break;
                case BoxLayoutJustify.spaceBetween:
                    if (childCount > 1) dynamicGap = gap + finalRemainingSpace / (childCount - 1);
                    break;
                case BoxLayoutJustify.spaceAround:
                    if (childCount > 0) {
                        const space = finalRemainingSpace / childCount;
                        dynamicGap = gap + space;
                        currentPos += space / 2;
                    }
                    break;
            }
        }

        // 計算最終位置
        for (let i = 0; i < childCount; i++) {
            // 確保尺寸不小於 min size (收縮後可能需要校正)
            results[i].size = Math.max(childrenReqs[i].main.min, results[i].size);
            results[i].pos = currentPos;
            currentPos += results[i].size + dynamicGap;
        }

        return results;
    }

    private calculateCrossAxis(geometries: ComponentGeometry[], childrenSizes: ChildSizeRequirements[], availableSize: number): void {
        const { padding, align } = this.options;
        const { cross, crossPos } = this.axisNames;

        for (const [i, geo] of geometries.entries()) {
            const sizes = childrenSizes[i].cross;
            let finalSize = 0;

            if (align === BoxLayoutAlignment.stretch) {
                // 拉伸：在 min/max 範圍內盡量填滿
                finalSize = Math.max(sizes.min, Math.min(availableSize, sizes.max));
            } else {
                // 不拉伸：使用 preferred size，但不能超過可用空間和 min/max
                finalSize = Math.max(sizes.min, Math.min(sizes.preferred, availableSize));
            }
            geo.size[cross] = finalSize;

            // 計算位置
            const remainingSpace = availableSize - finalSize;
            let finalPos = padding;
            if (align === BoxLayoutAlignment.end) {
                finalPos += remainingSpace;
            } else if (align === BoxLayoutAlignment.center) {
                finalPos += remainingSpace / 2;
            }
            // 'start' 和 'stretch' 的位置就是 padding

            geo.position[crossPos] = finalPos;
        }
    }
}
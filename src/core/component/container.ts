import { BoxLayoutConstraints } from "./box-layout";
import { Component2D, ComponentGeometry } from "./component-2d";
import { EmptyLayout, LayoutManager } from "./layout-manager";

export type LayoutContraints = BoxLayoutConstraints;

export class Container extends Component2D {
    protected children: Component2D[] = [];
    protected constraints: Map<Component2D, Partial<LayoutContraints>> = new Map();
    private isLayoutDirty: boolean = true;

    private layoutManager: LayoutManager = EmptyLayout;

    constructor() {
        super();
    }

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

    public addChild(child: Component2D, constraints?: Partial<LayoutContraints>): void {
        if (this.children.includes(child)) {
            this.constraints.set(child, { ...constraints });
            return; // 如果子組件已經存在，則更新約束並返回
        }

        this.children.push(child);
        if (constraints)
            this.constraints.set(child, { ...constraints }); // 設置約束條件

        child.setParent(this);
        this.reperformanceLayout(); // 重新計算佈局
    }

    public removeChild(child: Component2D): void {
        const index = this.children.indexOf(child);
        if (index === -1) return; // 如果沒有找到，則不做任何操作

        this.children.splice(index, 1); // 從子組件列表中移除
        child.setParent(null); // 清除父級引用
        child.setGeometry(null); // 清除幾何體
        this.constraints.delete(child); // 刪除約束條件
        this.reperformanceLayout(); // 重新計算佈局
    }

    public getChildren(): Component2D[] {
        return this.children; // 返回子組件列表
    }

    public getConstraints(child: Component2D): Partial<LayoutContraints> | null {
        return this.constraints.get(child) ?? null; // 返回指定子組件的約束條件，如果沒有則返回 null
    }

    public reperformanceLayout(): void {
        this.isLayoutDirty = true; // 標記佈局需要更新
        this.redraw(); // 重繪容器
    }

    public override setGeometry(geometry: ComponentGeometry | null): void {
        super.setGeometry(geometry);

        if (this.isGeometryDirty)
            this.reperformanceLayout(); // 如果幾何體已經被標記為需要更新，則需要重新計算佈局
    }

    protected updateLayout(): void {
        // 執行佈局管理器的佈局計算
        this.layoutManager.performLayout(this);
    }

    public override update(deltatime: number): void {

        if (this.isLayoutDirty)
            this.updateLayout(); // 更新佈局

        super.update(deltatime); // 更新幾何體和外觀
        this.isLayoutDirty = false; // 重置佈局更新標誌

        for (const child of this.children)
            child.update(deltatime); // 更新子組件
    }

    public override render(): void {
        super.render(); // 渲染容器自身

        for (const child of this.children)
            child.render(); // 渲染每個子組件
    }
}
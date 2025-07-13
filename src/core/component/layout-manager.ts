import { Container } from "./container";

export interface LayoutManager {
    performLayout(container: Container): void;
};

export const EmptyLayout: LayoutManager = {
    performLayout: (): void => {
        // 空佈局管理器，不執行任何操作
        // 這可以用於不需要佈局的容器
    }
};
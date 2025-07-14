import { ComponentSize } from "./component-2d";
import { Container } from "./container";

export interface LayoutManager {
    /**
     * 執行佈局計算
     * 
     * 如果 isSizeDirty 為 true，則表示容器的尺寸已經改變，需要重新計算佈局。  
     * 如果 isSizeDirty 為 false，則表示容器的尺寸沒有改變，只需要調整子組件的位置即可。
     * 
     * @param container 容器組件 
     * @param isSizeDirty 決定是否需要重新計算佈局
     */
    performLayout(container: Container, isSizeDirty?: boolean): void;

    /**
     * 計算最小尺寸
     */
    getMinSize(container: Container): ComponentSize;

    /**
     * 計算最大尺寸
     */
    getMaxSize(container: Container): ComponentSize;

    /**
     * 計算首選尺寸
     */
    getPreferredSize(container: Container): ComponentSize;
};

export const EmptyLayout: LayoutManager = {
    performLayout(): void {
        // 空佈局管理器，不執行任何操作
        // 這可以用於不需要佈局的容器
    },

    getMinSize(): ComponentSize {
        // 返回容器的最小尺寸
        return { width: 0, height: 0 };
    },

    getMaxSize(): ComponentSize {
        // 返回容器的最大尺寸
        return { width: Infinity, height: Infinity };
    },

    getPreferredSize(): ComponentSize {
        return { width: 0, height: 0 };
    }
};
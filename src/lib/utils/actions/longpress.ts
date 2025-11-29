import type { Action } from 'svelte/action';

// 定義 Action 接受的參數類型
interface LongPressParameters {
    onclick?: (event: PointerEvent) => void;
    onlongpress?: (event: PointerEvent) => void;
    duration?: number; // 允許自訂長按時間
}

export const longpress: Action<HTMLElement, LongPressParameters> = (node, params) => {
    let timeoutId: number | undefined;
    const pressDuration = params?.duration ?? 500; // 預設 500ms

    // 處理指標按下事件
    const handlePointerDown = (event: PointerEvent) => {
        // 只處理滑鼠左鍵或觸控
        if (event.button !== 0) return;

        timeoutId = window.setTimeout(() => {
            timeoutId = undefined; // 計時器已觸發，清除 ID
            // 觸發 longpress 回呼
            params?.onlongpress?.(event);
        }, pressDuration);
    };

    // 處理指標抬起事件
    const handlePointerUp = (event: PointerEvent) => {
        if (event.button !== 0) return;

        // 如果 timeoutId 存在，表示計時器還沒觸發，這是一個正常的 click
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
            // 觸發 click 回呼
            params?.onclick?.(event);
        }
        // 如果 timeoutId 不存在，表示 longpress 已經被觸發了，所以這裡不做任何事
    };

    // 處理指標移出元素事件
    const handlePointerLeave = (event: PointerEvent) => {
        // 如果指標移出，就取消待處理的 longpress
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
        }
    };

    // 將事件監聽器綁定到元素上
    node.addEventListener('pointerdown', handlePointerDown);
    node.addEventListener('pointerup', handlePointerUp);
    node.addEventListener('pointerleave', handlePointerLeave);

    // Svelte Action 的生命週期函式
    return {
        // 當參數更新時（例如回呼函式或 duration 改變）
        update(newParams) {
            params = newParams;
        },
        // 當元素被銷毀時，清除事件監聽器以防止記憶體洩漏
        destroy() {
            node.removeEventListener('pointerdown', handlePointerDown);
            node.removeEventListener('pointerup', handlePointerUp);
            node.removeEventListener('pointerleave', handlePointerLeave);
        }
    };
};
export class Deque<T> implements Iterable<T> {
    private items: Map<bigint, T> = new Map();
    private headPointer: bigint = 0n;
    private tailPointer: bigint = 0n;

    public get length(): number {
        return Number(this.tailPointer - this.headPointer);
    }

    constructor(items?: Iterable<T>) {
        if (items) {
            for (const item of items) {
                this.push(item);
            }
        }
    }
    
    /**
     * 推入一個元素到隊列的尾部
     * @param item 元素
     */
    push(item: T): void {
        this.items.set(this.tailPointer, item);
        this.tailPointer++;
    }

    /**
     * 從隊列的尾部移除一個元素並返回它
     * @returns 移除的元素，如果隊列為空則返回 undefined
     */
    pop(): T | undefined {
        if (this.length === 0) return undefined;
        this.tailPointer--;
        const item = this.items.get(this.tailPointer);
        this.items.delete(this.tailPointer);
        return item;
    }

    /**
     * 從隊列的頭部移除一個元素並返回它
     * @returns 移除的元素，如果隊列為空則返回 undefined
     */
    shift(): T | undefined {
        if (this.length === 0) return undefined;
        const item = this.items.get(this.headPointer);
        this.items.delete(this.headPointer);
        this.headPointer++;
        return item;
    }

    /**
     * 將一個元素添加到隊列的頭部
     * @param item 元素
     */
    unshift(item: T): void {
        this.headPointer--;
        this.items.set(this.headPointer, item);
    }

    /**
     * 返回隊列頭部的元素但不移除它
     * @returns 頭部元素，如果隊列為空則返回 undefined
     */
    peek(): T | undefined {
        if (this.length === 0) return undefined;
        return this.items.get(this.headPointer);
    }

    /**
     * 返回隊列尾部的元素但不移除它
     * @returns 尾部元素，如果隊列為空則返回 undefined
     */
    peekTail(): T | undefined {
        if (this.length === 0) return undefined;
        return this.items.get(this.tailPointer - 1n);
    }

    /**
     * 清空隊列
     */
    clear(): void {
        this.items.clear();
        this.headPointer = 0n;
        this.tailPointer = 0n;
    }

    /**
     * 檢查隊列是否為空
     * @returns 如果隊列為空則返回 true，否則返回 false
     */
    isEmpty(): boolean {
        return this.length === 0;
    }

    /**
     * 返回隊列的迭代器
     * @returns 迭代器對象
     */
    [Symbol.iterator](): Iterator<T> {
        let current = this.headPointer;
        const end = this.tailPointer;
        const items = this.items;
        return {
            next(): IteratorResult<T> {
                if (current < end) {
                    const value = items.get(current)!;
                    current++;
                    return { value, done: false };
                }
                return { value: undefined as any, done: true };
            }
        };
    }
}
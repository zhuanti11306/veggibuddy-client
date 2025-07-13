// 提供延遲初始化功能

export interface ProxyContainer<T> {
    value: T | null;
    proxy: T;
    set(newValue: T): void;
    get(): T;
}

export function delay<T extends object>(errMessage: string): ProxyContainer<T> {

    const container: ProxyContainer<T> = {
        value: null,
        proxy: null!,

        set(newValue: T) { 
            this.value = newValue;
        },
        
        get() { 
            if (this.value === null) throw new Error(errMessage);
            return this.value;
        }
    };

    container.proxy = <T> new Proxy(container, {
        get(container, prop) {
            const target = container.get();
            const value = Reflect.get(target, prop);

            if (value instanceof Function)
                return (...args: any[]) => value.apply(target, args);
            return value;
        },

        set(container, prop, newValue) {
            const target = container.get();
            return Reflect.set(target, prop, newValue);
        }
    });

    return container;
}

export interface Pipeable<T, U> {
    pipe<V>(pipeFunction: (input: U) => V): Pipeable<T, V>;
    run(input: T): Promise<U>;
}

export function pipeable<T, U>(runFunction: (input: T) => U | Promise<U>): Pipeable<T, U> {
    return {
        pipe<V>(pipeFunction: (input: U) => V | Promise<V>): Pipeable<T, V> {
            return pipeable((input: T) => {
                const output = runFunction(input);
                return Promise.resolve(output).then(pipeFunction);
            });
        },

        async run(input: T): Promise<U> {
            return runFunction(input);
        }
    };
}

export type DataHandler<T> = (data: T) => void | Promise<void>;
export type PipeSubscriber<T> = (onData: DataHandler<T>) => void;
export type PipeTransformer<T, U> = (data: T) => U | Promise<U>;
export type SideEffectProcessor<T> = (data: T) => void | Promise<void>; 

export interface StreamPipeable<T> {
    pipe<U>(transformFn: PipeTransformer<T, U>): StreamPipeable<U>;
    tap(sideEffectFn: SideEffectProcessor<T>): StreamPipeable<T>;
    connect(handler: DataHandler<T>): Promise<void>;
}

export function streamPipeable<T>(subscribeFn: (onData: DataHandler<T>) => void): StreamPipeable<T> {
    return {
        pipe<U>(transform: PipeTransformer<T, U>): StreamPipeable<U> {
            return streamPipeable((onData: DataHandler<U>) => {
                subscribeFn(async originalData => {
                    const transformedData = await Promise.resolve(transform(originalData));
                    onData(transformedData);
                });
            });
        },

        tap(sideEffect: SideEffectProcessor<T>): StreamPipeable<T> {
            return this.pipe(async (data) => {
                await Promise.resolve(sideEffect(data));
                return data; // 將原始資料原封不動地傳下去
            });
        },

        async connect(handler: DataHandler<T>): Promise<void> {
            subscribeFn(handler);
        }
    };
}
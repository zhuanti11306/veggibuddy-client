import { sleep } from "./sleep";

interface TaskDetail {
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    callback?: () => void;
    token: Symbol;
}

const loadingDetail = new Map<Function, TaskDetail>();

const sharedToken = Symbol();

function promiseWithToken<T>(callee: Function, token: Symbol, operation: () => T | Promise<T>, callback?: () => void): Promise<T> {
    const existing = loadingDetail.get(callee);

    let promise: Promise<T>;
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;

    if (existing) {
        if (existing.token === token)
            return existing.promise as Promise<T>;

        promise = existing.promise as Promise<T>;
        resolve = existing.resolve;
        reject = existing.reject;

        existing.token = token;
    } else {
        ({ promise, resolve, reject } = Promise.withResolvers<T>());
        loadingDetail.set(callee, {
            promise, reject, token,
            resolve: resolve as (value: unknown) => void,
            callback
        });
    }

    Promise.resolve(operation())
        .then(result => {
            const current = loadingDetail.get(callee);
            if (current?.token === token) {
                resolve(result);
                loadingDetail.delete(callee);
                callback?.();
            }
        })
        .catch(error => {
            const current = loadingDetail.get(callee);
            if (current?.token === token) {
                reject(error);
                loadingDetail.delete(callee);
            }
        });

    return promise as Promise<T>;
}

export async function withExistingTask<T>(callee: Function, operation: () => T | Promise<T>): Promise<T> {
    return promiseWithToken<T>(callee, sharedToken, operation);
}

export async function withLatestTask<T>(callee: Function, operation: () => T | Promise<T>): Promise<T> {
    return promiseWithToken<T>(callee, Symbol(), operation);
}

const batchedTaskParameters = new Map<Function, unknown>();

export async function withBatchedTask<K, T>(
    callee: Function,
    getValue: (lastValue?: K) => K,
    operation: (value: K) => T | Promise<T>,
    timeout: number = 1000
): Promise<void> {

    return promiseWithToken(callee, Symbol(),
        async () => {
            batchedTaskParameters.set(callee, getValue(batchedTaskParameters.get(callee) as K | undefined));
            await sleep(timeout);
        },
        () => {
            const value = batchedTaskParameters.get(callee) as K | undefined ?? getValue();
            batchedTaskParameters.delete(callee);
            return operation(value as K);
        }
    );
}

export function isLoading(callee?: Function): boolean {
    if (!callee)
        return loadingDetail.size > 0;
    return loadingDetail.has(callee);
}
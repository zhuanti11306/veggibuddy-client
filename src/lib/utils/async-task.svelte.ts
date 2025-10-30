
interface TaskDetail {
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    token: Symbol;
}

const loadingDetail = $state<Map<Function, TaskDetail>>(new Map());
const sharedToken = Symbol();

function promiseWithToken<T>(callee: Function, token: Symbol, operation: () => T | Promise<T>): Promise<T> {
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
        loadingDetail.set(callee, { promise, reject, token, 
            resolve: resolve as (value: unknown) => void });
    }
    
    
    (async () => operation())()
        .then(result => {
            const current = loadingDetail.get(callee);
            if (current?.token === token) {
                resolve(result);
                loadingDetail.delete(callee);
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

export function withExistingTask<T>(callee: Function, operation: () => T | Promise<T>): Promise<T> {
    return promiseWithToken<T>(callee, sharedToken, operation);
}

export function withLatestTask<T>(callee: Function, operation: () => T | Promise<T>): Promise<T> {
    return promiseWithToken<T>(callee, Symbol(), operation);
}

export function isLoading(callee?: Function): boolean {
    if (!callee)
        return loadingDetail.size > 0;
    return loadingDetail.has(callee);
}
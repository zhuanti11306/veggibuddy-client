
export function* enumerate<T>(iterable: Iterable<T>, start: number = 0): IterableIterator<[number, T]> {
    let index = start;
    for (const item of iterable) {
        yield [index++, item];
    }
}

export function* zip<T, U>(iterable1: Iterable<T>, iterable2: Iterable<U>): IterableIterator<[T, U]> {
    const iterator1 = iterable1[Symbol.iterator]();
    const iterator2 = iterable2[Symbol.iterator]();

    while (true) {
        const result1 = iterator1.next();
        const result2 = iterator2.next();

        if (result1.done || result2.done) {
            break;
        }

        yield [result1.value, result2.value];
    }
}

// type IterableList<T> = T extends [infer U, ...infer Rest] ? [Iterable<U>, ...IterableList<Rest>] : [];

// type ZipItem<T> = T extends [infer U, ...infer Rest] ? U extends any[] ? [...U, ...ZipItem<Rest>]: [U, ...ZipItem<Rest>] : [];

// export function* zip<T extends any[]>(...iterables: IterableList<T>): IterableIterator<ZipItem<T>> {
//     const iterators = iterables.map(iterable => iterable[Symbol.iterator]());
//     while (true) {
//         const results = iterators.map(iterator => iterator.next());
//         if (results.some(result => result.done)) {
//             break;
//         }
//         yield results.map(result => result.value).flat() as ZipItem<T>;
//     }
// }

export function* range(start: number, end: number = -Infinity, step: number = 1): IterableIterator<number> {
    if (end === -Infinity) {
        end = start;
        start = 0;
    }

    while (step > 0 ? start < end : start > end) {
        yield start;
        start += step;
    }
}
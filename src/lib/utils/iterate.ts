export function sorted<T>(array: T[], key: (item: T) => string | number): T[] {
    return array.slice().sort((a, b) => {
        const keyA = key(a);
        const keyB = key(b);
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    });
}
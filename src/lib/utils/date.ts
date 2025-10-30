
export function getDateFromTimestamp(timestamp: Date): bigint {
    return BigInt(Math.floor(timestamp.getTime() / 86_400_000));
}
export interface Interpolatable<T> {
    getPosition(t: number): T;
    step(from: number, to: number, count: number): T[];
}

export interface Differentiable<T> {
    getTangent(t: number): T;
}

export interface Trajectory<T> {
    duration: number;
}

export interface VectorLike {
    clone(): this;
    add(v: this): this;
    sub(v: this): this;
    multiplyScalar(s: number): this;
    lengthSq(): number;
    dot(v: this): number;
}
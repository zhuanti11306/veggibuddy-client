import type { AllowDimension } from "./dimension";
import type { StructedView, StructedViewSupport } from "./structed-view";

import { Matrix } from "./matrix";

export class Vector<Dimension extends AllowDimension = AllowDimension> implements StructedViewSupport {

    public dimension: Dimension;
    public data: Float32Array // & { length: Dimension };

    constructor(data: number[] | Float32Array) {
        this.dimension = data.length as Dimension;
        this.data = new Float32Array(this.dimension);
        this.data.set(data);
    }

    public get x() { return this.get(0) };
    public get y() { return this.get(1) };
    public get z() { return this.get(2) };
    public get w() { return this.get(3) };

    public set x(value: number) { this.set(0, value) };
    public set y(value: number) { this.set(1, value) };
    public set z(value: number) { this.set(2, value) };
    public set w(value: number) { this.set(3, value) };

    public get r() { return this.get(0) };
    public get g() { return this.get(1) };
    public get b() { return this.get(2) };
    public get a() { return this.get(3) };

    public set r(value: number) { this.set(0, value) };
    public set g(value: number) { this.set(1, value) };
    public set b(value: number) { this.set(2, value) };
    public set a(value: number) { this.set(3, value) };

    /**
     * 取得向量在給定方向的分量。
     * 
     * @param axis 向量的分量索引。 
     * @returns 向量在給定方向的分量。
     * @throws {RangeError} 當索引超出範圍時拋出錯誤。
     */
    public get(axis: number): number {
        if (axis >= this.dimension)
            throw new RangeError("Index Out Of Range");
        return this.data[axis];
    }

    /**
     * 設定向量在給定方向的分量。
     * 
     * @param index 向量的分量索引。
     * @param value 要設置的值。
     * @throws {RangeError} 當索引超出範圍時拋出錯誤。
     */
    public set(index: number, value: number) {
        if (index >= this.dimension)
            throw new RangeError("Index Out Of Range");
        this.data[index] = value;
    }

    /**
     * 取得向量的分量。
     * 
     * @returns 向量的分量。
     */
    public length(): number {
        return Math.hypot(...this.data);
    }

    /**
     * 縮放當前向量。
     * 
     * @param scalar 縮放因子。
     * @returns 當前向量。
     */
    public scaleWith(scalar: number): this {
        for (let i = 0; i < this.data.length; i++)
            this.data[i] *= scalar;
        return this;
    }

    /**
     * 歸一化當前向量。
     * 
     * @param scalar 縮放因子。
     * @returns 當前向量。
     */
    public normalize(): this {
        const length = this.length();
        for (let i = 0; i < this.data.length; i++)
            this.data[i] /= length;
        return this;
    }

    /**
     * 複製當前向量。
     * 
     * @returns 複製的向量。
     */
    public clone(): Vector<Dimension> {
        return new Vector<Dimension>(this.data.slice());
    }

    /**
     * 向量的加法運算。
     * 
     * @param a 向量 A。
     * @param b 向量 B。
     * @returns 向量 A 和 B 相加後的向量。
     */
    public static add<Dimension extends AllowDimension>(a: Vector<Dimension>, b: Vector<Dimension>): Vector<Dimension> {
        return new Vector<Dimension>(a.data.map((value, index) => value + b.data[index]));
    }

    /**
     * 向量的減法運算。
     * 
     * @param a 向量 A。
     * @param b 向量 B。
     * @returns 向量 A 減去向量 B 後的向量。
     */
    public static subtract<Dimension extends AllowDimension>(a: Vector<Dimension>, b: Vector<Dimension>): Vector<Dimension> {
        return new Vector<Dimension>(a.data.map((value, index) => value - b.data[index]));
    }

    /**
     * 向量的點積運算。
     * 
     * @param a 向量 A。
     * @param b 向量 B。
     * @returns 向量 A 和 B 的點積。
     */
    public static dot<Dimension extends AllowDimension>(a: Vector<Dimension>, b: Vector<Dimension>): number {
        return a.data.reduce((acc, cur, index) => acc + cur * b.data[index], 0);
    }

    /**
     * 向量的叉積運算。
     * 
     * @param a 向量 A。
     * @param b 向量 B。
     * @returns 向量 A 和 B 的叉積。
     * @throws {RangeError} 當向量的維度不是 3 時拋出錯誤。
     */
    public static cross(a: Vector<3>, b: Vector<3>): Vector<3> {
        if (a.dimension !== 3 || b.dimension !== 3)
            throw new RangeError("Dimension Mismatch");

        return new Vector<3>([
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        ]);
    }

    /**
     * 利用矩陣轉換向量。
     * 矩陣的行數必須等於向量的維度，矩陣的列數等於轉換後的向量的維度。
     * 相當於矩陣乘法，矩陣在左，向量在右。
     * 
     * @param vector 向量。
     * @param matrix 轉換矩陣。
     * @returns 轉換後的向量。
     * @throws {RangeError} 當向量的維度和矩陣的行數不匹配時拋出錯誤。
     */
    public static transform<Original extends AllowDimension, Transformed extends AllowDimension>(vector: Vector<Original>, matrix: Matrix<Original, Transformed>): Vector<Transformed> {
        if (vector.dimension !== matrix.column)
            throw new RangeError("Dimension Mismatch");
        
        const data = new Float32Array(matrix.row);
        for (let i = 0; i < matrix.row; i++)
            data[i] = matrix.getRow(i).reduce((acc, cur, index) => acc + cur * vector.get(index), 0);

        return new Vector(data);
    }

    /**
     * 計算兩個向量之間的距離。
     * 
     * @param a 向量 A。
     * @param b 向量 B。
     * @returns 向量 A 和 B 之間的距離。
     */
    public static distance<Dimension extends AllowDimension>(a: Vector<Dimension>, b: Vector<Dimension>): number {
        return Math.hypot(...a.data.map((value, index) => value - b.data[index]));
    }

    /**
     * 判斷兩個向量是否相等。
     * 
     * @param a 向量 A。
     * @param b 向量 B。
     * @returns 是否相等。
     */
    public static isEqual<Dimension extends AllowDimension>(a: Vector<Dimension>, b: Vector<Dimension>): boolean {
        if (a.dimension !== b.dimension) return false;
        for (let i = 0; i < a.dimension; i++)
            if (a.get(i) !== b.get(i)) return false;
        return true;
    }

    /* 實作 StructedViewSupport */

    public getAlignment(): number {
        if (this.dimension > 2)
            return 4 * Float32Array.BYTES_PER_ELEMENT;
        return 2 * Float32Array.BYTES_PER_ELEMENT;
    }

    public getSize(): number {
        return this.data.length * Float32Array.BYTES_PER_ELEMENT;
    }

    public writeStructedView(view: StructedView, offset: number): number {
        for (let i = 0; i < this.data.length; i++)
            view.setFloatNumber(offset + i * Float32Array.BYTES_PER_ELEMENT, this.data[i]);
        return this.data.length * Float32Array.BYTES_PER_ELEMENT;
    }
}

/**
 * 建立一個向量。
 * 
 * @param data 向量的分量。
 * @param data.length 向量的維度。  
 * @returns 向量。
 */
function vector<Dimension extends AllowDimension>(...data: number[] & { length: Dimension }): Vector<Dimension> {
    return new Vector<Dimension>(data);
}

export { vector };

function zero<Dimension extends AllowDimension>(dimension: Dimension): Vector<Dimension> {
    return new Vector<Dimension>(new Float32Array(dimension));
}
export { zero };

export const add = Vector.add;
export const subtract = Vector.subtract;
export const dot = Vector.dot;
export const cross = Vector.cross;
export const transform = Vector.transform;
export const distance = Vector.distance;

export type VectorType<Key extends string> =
    Key extends `vec${infer Dimension extends AllowDimension}` ? Vector<Dimension> : never;
export type VectorTypeName = `vec${AllowDimension}`;
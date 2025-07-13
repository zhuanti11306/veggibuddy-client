import type { AllowDimension } from "./dimension";
import type { StructedView, StructedViewSupport } from "./structed-view";

import { Vector } from "./vector";

export class Matrix<Column extends AllowDimension = AllowDimension, Row extends AllowDimension = Column> implements StructedViewSupport {

    /** 矩陣的維度。 */
    public dimension: [Column, Row];

    /** 矩陣的資料。以欄優先的方式儲存。*/
    public data: Float32Array; // & { length: Column * Row };

    constructor(column: Column, row: Row, data: number[] | Float32Array) {
        if (data.length !== column * row)
            throw new RangeError("Data length mismatch.");
        this.dimension = [column, row];
        this.data = new Float32Array(data.length);
        this.data.set(data);
    }

    public get column(): Column { return this.dimension[0] }
    public get row(): Row { return this.dimension[1] }

    /**
     * 取得矩陣在給定位置的值。
     * 
     * @param column 欄索引。
     * @param row 列索引。
     * @returns 矩陣在給定位置的值。
     * @throws {RangeError} 當索引超出範圍時拋出錯誤。
     */
    public get(column: number, row: number): number {
        if (column >= this.column || row >= this.row)
            throw new RangeError("Index Out Of Range");
        return this.data[column * this.row + row];
    }

    /**
     * 設定矩陣在給定位置的值。
     * 
     * @param column 欄索引。
     * @param row 列索引。
     * @param value 要設置的值。
     */
    public set(column: number, row: number, value: number) {
        if (column >= this.column || row >= this.row)
            throw new RangeError("Index Out Of Range");
        this.data[column * this.row + row] = value;
    }

    /**
     * 取得矩陣的列。
     * 
     * @param index 列索引。
     * @returns 矩陣的列。
     */
    public getRow(index: number): number[] {
        if (index >= this.row)
            throw new RangeError("Index Out Of Range");
        const data = Array(this.column);
        for (let i = 0; i < this.column; i++)
            data[i] = this.data[i * this.row + index];
        return data;
    }

    /**
     * 取得矩陣的欄。
     * 
     * @param index 欄索引。
     * @returns 矩陣的欄。
     */
    public getColumn(index: number): number[] {
        if (index >= this.column)
            throw new RangeError("Index Out Of Range");
        const data = Array(this.row);
        for (let i = 0; i < this.row; i++)
            data[i] = this.data[index * this.row + i];
        return data;
    }

    /**
     * 取得矩陣的列向量。
     * 
     * @param index 列索引。
     * @returns 矩陣的列向量。
     */
    public getRowVector(index: number): Vector<Column> {
        return new Vector(this.getRow(index));
    }

    /**
     * 取得矩陣的行向量。
     * 
     * @param index 行索引。
     * @returns 矩陣的行向量。
     */
    public getColumnVector(index: number): Vector<Row> {
        return new Vector(this.getRow(index));
    }

    /**
     * 複製矩陣。
     * 
     * @returns 複製的矩陣。
     */
    public clone(): Matrix<Column, Row> {
        return new Matrix(this.column, this.row, this.data);
    }

    /**
     * 矩陣的加法運算。
     * 
     * @param a 矩陣 A。
     * @param b 矩陣 B。
     * @returns 矩陣 A 和 B 相加後的矩陣。
     * @throws {Error} 矩陣大小不匹配時拋出錯誤。
     */
    public static add<Column extends AllowDimension, Row extends AllowDimension>(a: Matrix<Column, Row>, b: Matrix<Column, Row>): Matrix<Column, Row> {
        if (a.column !== b.column || a.row !== b.row)
            throw new Error("Matrix size mismatch.");
        return new Matrix(a.column, a.row, a.data.map((value, index) => value + b.data[index]));
    }

    /**
     * 矩陣的減法運算。
     * 
     * @param a 矩陣 A。
     * @param b 矩陣 B。
     * @returns 矩陣 A 減去矩陣 B 後的矩陣。
     * @throws {Error} 矩陣大小不匹配時拋出錯誤。
     */
    public static subtract<Column extends AllowDimension, Row extends AllowDimension>(a: Matrix<Column, Row>, b: Matrix<Column, Row>): Matrix<Column, Row> {
        if (a.column !== b.column || a.row !== b.row)
            throw new Error("Matrix size mismatch.");
        return new Matrix(a.column, a.row, a.data.map((value, index) => value - b.data[index]));
    }

    /**
     * 矩陣的縮放運算。
     * 
     * @param a 矩陣 A。
     * @param scalar 縮放因子。
     * @returns 縮放後的矩陣。
     */
    public static scale<Column extends AllowDimension, Row extends AllowDimension>(a: Matrix<Column, Row>, scalar: number): Matrix<Column, Row> {
        return new Matrix(a.column, a.row, a.data.map(value => value * scalar));
    }

    /**
     * 矩陣的乘法運算。
     * 矩陣 A 的列數必須等於矩陣 B 的行數。
     * 
     * @param a 矩陣 A。
     * @param b 矩陣 B。
     * @returns 矩陣 A 和 B 相乘後的矩陣。
     * @throws {Error} 矩陣 A 的列數不等於矩陣 B 的行數時拋出錯誤。
     */
    public static multiply<M extends AllowDimension, N extends AllowDimension, P extends AllowDimension>(a: Matrix<P, M>, b: Matrix<N, P>): Matrix<N, M> {
        if (a.column !== b.row)
            throw new Error("Matrix size mismatch.");

        const newColumns = b.column;
        const newRows = a.row;
        const iterations = a.column;

        const data = new Float32Array(newColumns * newRows);
        for (let row = 0; row < newRows; row++) {
            for (let column = 0; column < newColumns; column++) {
                let sum = 0;
                for (let i = 0; i < iterations; i++)
                    sum += a.get(i, row) * b.get(column, i);
                data[column * newRows + row] = sum;
            }
        }

        return new Matrix<N, M>(newColumns, newRows, data);
    }

    /**
     * 矩陣的轉置運算。
     * 
     * @param matrix 矩陣。
     * @returns 轉置後的矩陣。
     */
    public static transpose<Column extends AllowDimension, Row extends AllowDimension>(matrix: Matrix<Column, Row>): Matrix<Row, Column> {
        const transposed = new Float32Array(matrix.row * matrix.column);
        for (let i = 0; i < matrix.row; i++)
            for (let j = 0; j < matrix.column; j++)
                transposed[i * matrix.column + j] = matrix.get(j, i);
        return new Matrix<Row, Column>(matrix.row, matrix.column, transposed);
    }

    /**
     * 建立單位矩陣。
     * 
     * @param dimension 矩陣的維度。
     * @returns 單位矩陣。
     */
    public static identity<Dimension extends AllowDimension>(dimension: Dimension): Matrix<Dimension, Dimension> {
        const data = new Float32Array(dimension * dimension);
        for (let i = 0; i < dimension; i++)
            data[i * dimension + i] = 1;
        return new Matrix(dimension, dimension, data);
    }

    /**
     * 矩陣的行列式運算。
     * 
     * @param matrix 矩陣。
     * @returns 矩陣的行列式。
     */
    public static determinant<Dimension extends AllowDimension>(matrix: Matrix<Dimension, Dimension>): number {
        if (matrix.column !== matrix.row)
            throw new Error("Matrix is not square.");
        if (matrix.column === 2)
            return matrix.get(0, 0) * matrix.get(1, 1) - matrix.get(0, 1) * matrix.get(1, 0);

        console.log(matrix);
        let det = 0;
        for (let i = 0; i < matrix.column; i++)
            det += ((i % 2 === 0 ? 1 : -1) * matrix.get(0, i) * Matrix.determinant(Matrix.subMatrix(matrix, 0, i)));
        return det;
    }

    /**
     * 矩陣的伴隨矩陣運算。
     * 
     * @param matrix 矩陣。
     * @returns 矩陣的伴隨矩陣。
     */
    public static adjugate<Dimension extends AllowDimension>(matrix: Matrix<Dimension, Dimension>): Matrix<Dimension, Dimension> {
        if (matrix.column !== matrix.row)
            throw new Error("Matrix is not square.");

        if (matrix.column === 2)
            return new Matrix(matrix.column, matrix.row, new Float32Array([
                matrix.get(1, 1), -matrix.get(0, 1),
                -matrix.get(1, 0), matrix.get(0, 0)
            ]));

        const cofactors = new Float32Array(matrix.column * matrix.row);
        for (let i = 0; i < matrix.row; i++) {
            for (let j = 0; j < matrix.column; j++) {
                const sign = (i + j) % 2 * -2 + 1;
                cofactors[i * matrix.column + j] = sign * Matrix.determinant(Matrix.subMatrix(matrix, i, j));
            }
        }

        return new Matrix(matrix.column, matrix.row, cofactors);
    }

    /**
     * 矩陣的子矩陣運算。
     * 
     * @param row 列索引。
     * @param column 欄索引。
     * @returns 矩陣的子矩陣。
     */
    public static subMatrix(matrix: Matrix<AllowDimension, AllowDimension>, row: number, column: number): Matrix<AllowDimension, AllowDimension> {
        if (matrix.row == 2 || matrix.column == 2) throw new Error("Submatrix dimension too small");

        const newRow = matrix.row - 1 as AllowDimension;
        const newCol = matrix.column - 1 as AllowDimension;

        const subData = [];
        for (let i = 0; i < matrix.row; i++) {
            if (i === row) continue;
            for (let j = 0; j < matrix.column; j++) {
                if (j === column) continue;
                subData.push(matrix.get(i, j));
            }
        }

        return new Matrix(newCol, newRow, subData);
    }

    /**
     * 矩陣的乘法反元素。
     * 
     * @returns 矩陣的逆矩陣。 
     * * @throws {Error} 矩陣不是方陣，或為奇異矩陣時拋出錯誤。
     */
    public static inverse<Dimension extends AllowDimension>(matrix: Matrix<Dimension, Dimension>): Matrix<Dimension, Dimension> {
        if (matrix.column !== matrix.row)
            throw new Error("Matrix is not square.");

        const det = Matrix.determinant(matrix);
        if (det === 0)
            throw new Error("Matrix is singular.");

        const adjugate = Matrix.adjugate(matrix);
        return Matrix.scale(adjugate, 1 / det);
    }

    /**
     * 比較兩個矩陣是否相等。
     * 
     * @param a 矩陣 A。
     * @param b 矩陣 B。
     * @returns 如果兩個矩陣相等，則返回 true；否則返回 false。
     */
    public static isEqual<Column extends AllowDimension, Row extends AllowDimension>(a: Matrix<Column, Row>, b: Matrix<Column, Row>): boolean {
        if (a.column !== b.column || a.row !== b.row)
            return false;
        for (let i = 0; i < a.data.length; i++)
            if (a.data[i] !== b.data[i]) return false;
        return true;
    }

    /* 實作 StructedViewSupport */

    public getAlignment(): number {
        if (this.column > 2)
            return 4 * Float32Array.BYTES_PER_ELEMENT;
        return 2 * Float32Array.BYTES_PER_ELEMENT;
    }

    public getSize(): number {
        const rowSize = this.column > 2 ? 4 : 2;
        return rowSize * this.row * Float32Array.BYTES_PER_ELEMENT;
    }

    public writeStructedView(view: StructedView, offset: number): number {
        for (let i = 0; i < this.data.length; i++)
            view.setFloatNumber(offset + i * Float32Array.BYTES_PER_ELEMENT, this.data[i]);
        return this.data.length * Float32Array.BYTES_PER_ELEMENT;
    }
}

function matrix<Column extends AllowDimension, Row extends AllowDimension>(column: Column, row: Row, data: number[]): Matrix<Column, Row> {
    return new Matrix(column, row, data);
}

function zero<Column extends AllowDimension, Row extends AllowDimension>(column: Column, row: Row): Matrix<Column, Row> {
    return new Matrix(column, row, new Float32Array(column * row));
}

function identity<Dimension extends AllowDimension>(dimension: Dimension): Matrix<Dimension, Dimension> {
    return Matrix.identity(dimension);
}

export { matrix, zero, identity };

export type MatrixType<Key extends string> =
    Key extends `mat${infer Column extends AllowDimension}x${infer Row extends AllowDimension}` ? Matrix<Column, Row> : never;
export type MatrixTypeName = `mat${AllowDimension}x${AllowDimension}`;
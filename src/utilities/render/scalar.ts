export type ScalarType<Key extends string> = Key extends ScalarTypeName ? number : never;
export type ScalarTypeName = `${Scalar}`;
export enum Scalar {
    float = "float",
    int = "int",
    uint = "uint"
}
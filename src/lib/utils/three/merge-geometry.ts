import { BufferGeometry, Mesh, type Group } from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

export function createMergedGeometry(group: Group): BufferGeometry {
    const geometries: BufferGeometry[] = [];
    group.updateWorldMatrix(true, true); // 確保 matrixWorld 是最新的

    group.traverse((object) => {
        if (object instanceof Mesh) {
            if (object.geometry instanceof BufferGeometry) {
                const clonedGeom = object.geometry.clone();
                clonedGeom.applyMatrix4(object.matrix); // 應用本地變換
                clonedGeom.applyMatrix4(object.matrixWorld); // 應用世界變換
                geometries.push(clonedGeom);
            }
        }
    });

    if (geometries.length > 0) {
        return BufferGeometryUtils.mergeGeometries(geometries);
    }
    return new BufferGeometry();
}
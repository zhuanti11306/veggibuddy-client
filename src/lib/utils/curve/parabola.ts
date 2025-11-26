import type { Differentiable, Interpolatable, Trajectory, VectorLike } from "./interfaces";


export function throwingParabola<T extends VectorLike>(start: T, velocity: T, acceleration: T): Differentiable<T> & Interpolatable<T> {
    const halfAcc = acceleration.clone().multiplyScalar(0.5);
    const velocity0 = velocity.clone();
    const position0 = start.clone();

    return {
        getTangent(t: number): T {
            // V(t) = At + V0
            // halfAcc * 2 = Acceleration
            const at = halfAcc.clone().multiplyScalar(2 * t);
            return at.add(velocity0) as T;
        },

        getPosition(t: number): T {
            // P(t) = 0.5*A*t^2 + V0*t + P0
            const at2 = halfAcc.clone().multiplyScalar(t * t);
            const vt = velocity0.clone().multiplyScalar(t);
            return at2.add(vt).add(position0) as T;
        },

        step(from: number, to: number, count: number): T[] {
            const points: T[] = [];
            for (let i = 0; i <= count; i++) {
                const t = from + (to - from) * i / count;
                points.push(this.getPosition(t));
            }
            return points;
        }
    };
}

export function aimedParabola<T extends VectorLike>(
    start: T,
    end: T,
    acceleration: T,
    speed: number,
    curve: "high" | "low" = "low"
): Differentiable<T> & Interpolatable<T> & Trajectory<T> | null {

    const halfAcc = acceleration.clone().multiplyScalar(0.5);

    const delta = end.clone().sub(start);
    const deltaSquare = delta.lengthSq();
    const halfAccSquare = halfAcc.lengthSq();
    const deltaDotAcc = delta.dot(acceleration);

    // 解一元二次方程: a*x^2 + b*x + c = 0，其中 x = T^2
    // 係數 a = |0.5A|^2
    // 係數 b = -(v^2 + ΔP · A)
    // 係數 c = |ΔP|^2

    const a = halfAccSquare;
    const negB = speed * speed + deltaDotAcc;
    const c = deltaSquare;

    const discriminant = negB * negB - 4 * a * c;


    if (discriminant < 0)
        return null; // 無法到達目標 (速度不足或目標太遠)

    const sqrtDiscriminant = Math.sqrt(discriminant);

    // 求根公式: x = (-b ± √Δ) / 2a
    // -b 就是 (speed^2 + deltaDotAcc)
    // "high" (高拋) 對應較長的飛行時間，所以取加號
    // "low" (直射) 對應較短的飛行時間，所以取減號
    const sign = curve === "high" ? 1 : -1;
    const timeSquared = (negB + sign * sqrtDiscriminant) / (2 * a);


    if (timeSquared < 0)
        return null; // 時間是虛數，無法達成

    const duration = Math.sqrt(timeSquared);

    // 計算初速度 V0
    // V0 = (ΔP - 0.5 * A * T^2) / T
    //    = ΔP / T - 0.5 * A * T
    //    = ΔP / T - halfAcc * T
    const velocity0 = delta.clone()
        .multiplyScalar(1 / duration)
        .sub(halfAcc.clone().multiplyScalar(duration));

    return {
        duration,
        ...throwingParabola(start, velocity0, acceleration)
    };
}
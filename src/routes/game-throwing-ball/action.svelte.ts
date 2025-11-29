import type { Action } from "svelte/action";

import { BackSide, Camera, Mesh, MeshStandardMaterial, Object3D, Raycaster, Scene, SphereGeometry, Vector2, Vector3 } from "three";
import { Line2, LineGeometry, LineMaterial, OrbitControls } from "three/examples/jsm/Addons.js";

import { SceneId } from "$lib/config";
import { assets, game, model, type SceneInitResult, type PetAsset } from "$lib/services";
import type { sceneInfoMap } from "$lib/services/model/scene-info";
import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";
import { aimedParabola, throwingParabola } from "$lib/utils/curve/parabola";

const gravity = new Vector3(0, -9.81, 0);

type ThrowingGameSceneInitResult = SceneInitResult<
    OrbitControls,
    typeof sceneInfoMap[SceneId.throwingBallGame]["info"]
>;

// 場景載入
let sceneInitResult: ThrowingGameSceneInitResult | null = null;
const { promise: sceneModelPromise, resolve: resolveSceneModel } = Promise.withResolvers<ThrowingGameSceneInitResult>();

const sceneModel = assets.sceneAssets.throwingGame.models.field;

// 寵物載入

const pet = $derived(game.petInfo.isLegal ? { id: game.petInfo.type, assets: assets.petAssets[game.petInfo.type] } : null);
const { promise: petPromise, resolve: resolvePet } = Promise.withResolvers<PetAsset>();
let lastPet: PetAsset | null = null;
const originScale = 32 / 900; 

export function registerPetSetup() {
    $effect(() => {
        if (!pet)
            return void game.getPetInfo();

        const petId = pet.id;

        Promise.all([
            assets.loadCharacterAssets(petId),
            sceneModelPromise
        ]).then(([petAsset, { scene }]) => {
            const petModelObject = petAsset.model.object;
            
            if (petModelObject) {
                scene.add(petModelObject);
                petModelObject.position.set(0, 0, .5);
                petModelObject.lookAt(new Vector3(0, 0, 0));
            }

            if (lastPet?.model.object && lastPet !== petAsset) {
                scene.remove(lastPet.model.object);
            }

            resolvePet(lastPet = petAsset);
        })
    });
}

// 拖曳狀態

const enum DragState {
    Idle,
    Pan,
    Dragging
}

const dragging = {
    _state: DragState.Idle,

    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },

    get startVec() {
        return new Vector2(this.start.x, this.start.y);
    },

    get currentVec() {
        return new Vector2(this.current.x, this.current.y);
    },

    get state() {
        return this._state;
    },

    set state(value: DragState) {
        this._state = value;

        if (!sceneInitResult) return;

        switch (value) {
            case DragState.Idle:
            case DragState.Pan:
                sceneInitResult.controls.enabled = true;
                break;
            case DragState.Dragging:
                sceneInitResult.controls.enabled = false;
                break;
        }
    }
};

function startDetect(
    pointer: Vector2,
    camera: Camera,
    target: Mesh
) {
    model.raycaster.setFromCamera(pointer, camera);

    const intersects = model.raycaster.intersectObject(target);

    if (intersects.length) {
        dragging.state = DragState.Dragging;
        dragging.start.x = dragging.current.x = pointer.x;
        dragging.start.y = dragging.current.y = pointer.y;
    } else {
        dragging.state = DragState.Idle;
    }
}

// Three.js 場景交互動作

export const action: Action<HTMLDivElement> = function (container) {
    const canvas = container.querySelector("canvas");

    if (!canvas)
        throw new Error("Canvas element not found in container.");

    // 初始化場景

    const result = sceneInitResult = model.initScene(container, canvas, SceneId.throwingBallGame);
    resolveSceneModel(result);

    // 加入物件

    const objects = addOjbectsToScene(result.scene);

    // 設置互動動作

    let dispose: (() => void) | null = null;

    Promise.all([
        sceneModel.whenLoaded,
        petPromise
    ]).then(([_, petAsset]) => {
        result.info.gyroTuner.enable();
        const petModelObject = petAsset.model.object!;

        const { animation, animationState, reset: resetAnimation } = getThrowingGameAnimation(petModelObject, objects);

        function onpointerdown(event: PointerEvent) {
            const pointer = new Vector2(event.offsetX, event.offsetY)
                .applyMatrix3(result.pointerNormalize);
            startDetect(pointer, result.camera, objects.ball);
        }

        function onpointermove(event: PointerEvent) {
            switch (dragging.state) {
                case DragState.Idle:
                    break;
                case DragState.Dragging: {
                    const { offsetX: x, offsetY: y } = event;
                    dragging.current.x = x;
                    dragging.current.y = y;

                    // 計算指標在三維空間中的位置
                    const pointer = new Vector2(x, y).applyMatrix3(result.pointerNormalize);

                    // 計算指標距離相機的距離
                    const endPosition = new Vector3();
                    const distance = objects.ball.position.distanceTo(result.camera.position);
                    model.raycaster.setFromCamera(pointer, result.camera);
                    model.raycaster.ray.at(distance, endPosition);

                    // 計算指標移動在真實世界的切線向量
                    const gravityAcceleration = gravity;
                    const startPosition = objects.ball.position.clone();
                    const tangent = new Vector3()
                        .subVectors(startPosition, endPosition)
                        // .multiply(new Vector3(16, 8 / distance, 16)); // 力度放大
                        .multiply(new Vector3(8, 16, 8)) // 力度放大
                        .multiplyScalar(1 / distance); // 距離修正


                    // 限制切線向量在水平方向上的最大長度
                    const horizontalTangent = new Vector3(tangent.x, 0, tangent.z);
                    const maxHorizontalLength = 2;

                    if (horizontalTangent.length() > maxHorizontalLength) {
                        horizontalTangent.setLength(maxHorizontalLength);
                        tangent.x = horizontalTangent.x;
                        tangent.z = horizontalTangent.z;
                    }

                    // 限制切線向量在垂直方向上的最大長度
                    if (tangent.y > 2) {
                        tangent.y = 2;
                    }

                    if (tangent.length() >= 0.0625) {
                        animationState.predictParabolaCurve = throwingParabola(startPosition, tangent, gravityAcceleration); // 建立拋物線曲線
                        const points = animationState.predictParabolaCurve.step(0, 0.375, 20); // 取得拋物線上的點

                        objects.parabolaLine.geometry.setFromPoints(points);
                        // objects.parabolaLine.geometry.setDrawRange(0, points.length * 4);
                        objects.parabolaLine.computeLineDistances();
                        objects.parabolaLine.geometry.attributes.position.needsUpdate = true;
                        objects.parabolaLine.visible = true;
                    }

                    break;
                }
            }
        }

        function onpointerup(_event: PointerEvent) {
            switch (dragging.state) {
                case DragState.Idle:
                    break;
                case DragState.Dragging: {
                    objects.parabolaLine.visible = false;;
                    animationState.throwParabolaCurve = animationState.predictParabolaCurve;
                    animationState.predictParabolaCurve = null;
                    animationState.hadFirstThrow = true;
                }
            }

            dragging.state = DragState.Idle;
        }

        addAnimationLoop(animation);

        container.addEventListener("pointerdown", onpointerdown);
        container.addEventListener("pointermove", onpointermove);
        container.addEventListener("pointerup", onpointerup);

        dispose = () => {
            clearAnimationLoop(animation);
            if (animationState.moving?.animation)
                clearAnimationLoop(animationState.moving.animation);

            container.removeEventListener("pointerdown", onpointerdown);
            container.removeEventListener("pointermove", onpointermove);
            container.removeEventListener("pointerup", onpointerup);
        };

        resetSceneGame = () => {
            resetAnimation();
            petModelObject.position.set(0, 0, .5);
            petModelObject.lookAt(new Vector3(0, 0, 0));
            petModelObject.scale.set(originScale, originScale, originScale);

            objects.ball.position.set(0, 0.025, 0.25);
            objects.parabolaLine.visible = false;

            result.camera.position.set(0, .0859375, -1 / 2 ** 12);
            result.camera.lookAt(new Vector3(0, .0859375, 1));

            result.controls.target.set(0, .0859375, 0);
        };
    });

    return {
        destroy() {
            result.dispose();
            dispose?.()
        }
    }
};

function addOjbectsToScene(scene: Scene) {
    // 球體
    const ball = new Mesh(
        new SphereGeometry(0.025, 16, 16),
        new MeshStandardMaterial({ color: 0xff5555, roughness: 0.5, metalness: 0 })
    );

    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.material.shadowSide = BackSide; // 解決陰影問題

    scene.add(ball);
    ball.position.set(0, 0.025, 0.25);

    // 拋物線軌跡線
    const parabolaLine = new Line2(
        new LineGeometry(),
        new LineMaterial({
            linewidth: 3,
            color: 0xff0000,
            dashed: true,
            dashSize: 0.03125,
            gapSize: 0.0078125,
        })
    );

    parabolaLine.visible = false;
    scene.add(parabolaLine);

    return { ball, parabolaLine };
}

const enum ChasingBallState {
    Idle,
    Chasing,
    PrepareReturn
}

function getThrowingGameAnimation(petModelObject: Object3D, objects: ReturnType<typeof addOjbectsToScene>) {

    const animationState = {
        hadFirstThrow: false,
        chasingBallState: ChasingBallState.Idle,
        currentChasingTarget: null as Vector3 | null,
        allowKickBall: false,

        ballStartMoving: null as number | null,
        ballThrowingTime: null as number | null,

        predictParabolaCurve: null as ReturnType<typeof throwingParabola<Vector3>> | null,
        throwParabolaCurve: null as ReturnType<typeof throwingParabola<Vector3>> | null,
        moving: null as ReturnType<typeof petMove> | null
    };

    function animation(_deltaTime: number, time: number) {
        if (animationState.throwParabolaCurve) {
            if (animationState.ballStartMoving === null || animationState.ballThrowingTime === null)
                animationState.ballThrowingTime = animationState.ballStartMoving = time;


            const ballTime = time - animationState.ballThrowingTime;

            const position = animationState.throwParabolaCurve.getPosition(ballTime / 1000);
            objects.ball.position.copy(position);

            if (
                time - animationState.ballStartMoving > 250 &&
                petModelObject.position.distanceTo(objects.ball.position) > 0.1 && // 距離足夠遠
                animationState.chasingBallState === ChasingBallState.Idle
            )
                animationState.chasingBallState = ChasingBallState.Chasing;

            if (
                position.y < 0.025 // 撞地，停止動畫
            ) {
                objects.ball.position.y = 0.025;

                const newPosition = new Vector3().copy(objects.ball.position);
                const newTanget = new Vector3().copy(animationState.throwParabolaCurve.getTangent(0))
                newTanget.multiply(new Vector3(0.75, 0.5, 0.75));

                if (
                    newTanget.x > 0.0078125 || newTanget.x < -0.0078125 ||
                    newTanget.z > 0.0078125 || newTanget.z < -0.0078125
                ) {
                    animationState.ballThrowingTime = time;
                    animationState.throwParabolaCurve = throwingParabola(
                        newPosition,
                        newTanget,
                        gravity
                    );
                } else if (dragging.state === DragState.Idle) {
                    animationState.ballStartMoving = null;
                    animationState.throwParabolaCurve = null;
                }
            }

            // if (
            //     position.x < -1.5 || position.x > 1.5 || // 超出水平範圍
            //     position.z < -1.5 || position.z > 1.5 // 超出深度範圍
            // ) {
            //     objects.ball.position.set(0, 0.025, 0.25);
            //     animationState.ballStartMoving = null;
            //     animationState.throwParabolaCurve = null;
            //     animationState.currentChasingTarget = null;
            // }
        }

        if (animationState.hadFirstThrow) {
            const ballPosition = new Vector3().copy(objects.ball.position).setY(petModelObject.position.y);
            petModelObject.lookAt(ballPosition);

            // const direction = new Vector3().subVectors(objects.ball.position, petModelObject.position);
            const distanceToBall = objects.ball.position.distanceTo(petModelObject.position);
            const camToBall = new Vector3().copy(ballPosition).setY(0);
            const distanceCamToBall = camToBall.length();

            // 允許寵物追球時，且寵物不在移動中
            if ((!animationState.throwParabolaCurve || animationState.chasingBallState) && !animationState.moving) {

                const ballPosition = new Vector3().copy(objects.ball.position).setY(petModelObject.position.y);
                let moveTarget: Vector3 | null = null;

                switch (animationState.chasingBallState) {
                    case ChasingBallState.Idle: {
                        if (distanceToBall > 0.1) {
                            animationState.chasingBallState = ChasingBallState.Chasing;
                        } else {
                            const rand = Math.random();
                            if (rand < 0.0025)
                                animationState.allowKickBall = true;
                        }

                        break;
                    }

                    case ChasingBallState.Chasing: {
                        if (!animationState.currentChasingTarget) {
                            const up = new Vector3(0, 1, 0);
                            const camToBall = new Vector3().copy(ballPosition).setY(0);
                            const rightForCam = new Vector3().crossVectors(up, camToBall).normalize().multiplyScalar(0.085);

                            const leftCandidate = new Vector3().copy(ballPosition).sub(rightForCam);
                            const rightCandidate = new Vector3().copy(ballPosition).add(rightForCam);
                            const behindCandidate = new Vector3().copy(ballPosition).addScaledVector(camToBall.normalize(), 0.085);

                            const leftDistance = leftCandidate.distanceTo(petModelObject.position);
                            const rightDistance = rightCandidate.distanceTo(petModelObject.position);
                            const behindDistance = behindCandidate.distanceTo(petModelObject.position);

                            const minDistance = Math.min(leftDistance, rightDistance, behindDistance);

                            switch (minDistance) {
                                case behindDistance:
                                    animationState.currentChasingTarget = behindCandidate;
                                    break;
                                case leftDistance:
                                    animationState.currentChasingTarget = leftCandidate;
                                    break;
                                case rightDistance:
                                    animationState.currentChasingTarget = rightCandidate;
                                    break;
                            }
                        }

                        if (new Vector3().subVectors(animationState.currentChasingTarget!, petModelObject.position).length() < 0.01) {
                            animationState.currentChasingTarget = null;
                            animationState.chasingBallState = ChasingBallState.PrepareReturn;
                        } else {
                            moveTarget = animationState.currentChasingTarget;
                        }

                        break;
                    }

                    case ChasingBallState.PrepareReturn: {
                        if (distanceToBall > 0.1) {
                            animationState.chasingBallState = ChasingBallState.Chasing;
                        } else {
                            const camToBall = new Vector3().copy(ballPosition).setY(0);
                            const ballToTarget = camToBall.normalize().multiplyScalar(0.085);
                            const targetPosition = new Vector3().copy(ballPosition).add(ballToTarget);

                            if (targetPosition.distanceTo(petModelObject.position) > 0.01)
                                moveTarget = targetPosition;

                            animationState.chasingBallState = ChasingBallState.Idle;
                        }

                    }
                }

                if (moveTarget) {
                    moveTarget.setY(0);

                    const movement = new Vector3().subVectors(moveTarget, petModelObject.position);
                    const distance = movement.length();
                    movement.normalize().multiplyScalar(distance / Math.ceil(distance / 0.25));

                    animationState.moving = petMove(
                        petModelObject,
                        petModelObject.position.clone(),
                        petModelObject.position.clone().add(movement),
                        // moveTarget,
                    );

                    if (animationState.moving) {
                        const movingAnimation = animationState.moving.animation;
                        addAnimationLoop(movingAnimation);
                        animationState.moving.promise.then(() => {
                            animationState.moving = null;
                            clearAnimationLoop(movingAnimation);
                        });
                    }
                }
            }

            // 寵物踢球：允許、且距離足夠近，且沒有預測中的拋物線
            if (animationState.allowKickBall && !animationState.predictParabolaCurve && distanceToBall < 0.1 && distanceCamToBall > 0.5) {
                const kickDirection = new Vector3().subVectors(objects.ball.position, petModelObject.position).setY(0).normalize();
                kickDirection.setY(0.25);
                kickDirection.applyAxisAngle(new Vector3(0, 1, 0), (Math.random() - 0.5) * Math.PI / 8); // 加入隨機偏角

                const kickParabola = throwingParabola(objects.ball.position.clone(), kickDirection, gravity);

                animationState.throwParabolaCurve = kickParabola;
                animationState.ballThrowingTime = time;
                animationState.allowKickBall = false;
            }
        }
    }

    function reset() {

        animationState.hadFirstThrow = false;
        animationState.chasingBallState = ChasingBallState.Idle;
        animationState.currentChasingTarget = null;
        animationState.allowKickBall = false;

        animationState.ballStartMoving = null;
        animationState.ballThrowingTime = null;

        animationState.predictParabolaCurve = null;
        animationState.throwParabolaCurve = null;
        if (animationState.moving?.animation)
            clearAnimationLoop(animationState.moving.animation);
        animationState.moving = null;
    }

    return { animation, animationState, reset };
}

function petMove(petModelObject: Object3D, from: Vector3, to: Vector3, speed: number = 1.75): { animation(dt: number, t: number): void; promise: Promise<void> } | null {
    const moveParabola: ReturnType<typeof aimedParabola<Vector3>> = aimedParabola(from, to, gravity, speed, "high");
    if (!moveParabola)
        return null;

    const { promise, resolve } = Promise.withResolvers<void>();

    const prepareStage = 250;
    const jumpStage = moveParabola.duration * 1000;
    const recoverStage = 200;

    const startVelocity = moveParabola.getTangent(0);
    const startSpeed = startVelocity.length();
    const finalVelocity = moveParabola.getTangent(moveParabola.duration);
    const finalSpeed = finalVelocity.length();

    const finalSpeedSqueezeFactor = finalSpeed / startSpeed;

    let isParabolaDone = false;

    const squeezeValue = 0.25;

    return {
        animation(_dt: number, elapsed: number) {
            let squeeze = 1; // 擠壓比例

            if (elapsed < prepareStage) {
                const t = elapsed / prepareStage;
                const t2 = t * t;
                squeeze = 1 + (squeezeValue * 0.5) * ((3 * t2 - 2 * t) + Math.sqrt(8) * (t2 - t)); // 總之會落在 [0.75, 1.25] 之間
            } else if (elapsed < prepareStage + jumpStage) {
                const time = (elapsed - prepareStage) / 1000; // 轉換成秒
                const speed = moveParabola.getTangent(time).length();
                squeeze = 1 + squeezeValue * (1 - speed / startSpeed);
                petModelObject.position.copy(moveParabola.getPosition(time));
            } else if (elapsed < prepareStage + jumpStage + recoverStage) {
                const t = (elapsed - prepareStage - jumpStage) / recoverStage;
                const t2 = t * t;
                squeeze = 1 + squeezeValue * finalSpeedSqueezeFactor * ((2 * t2 - 3 * t + 1) + Math.sqrt(3) * (t2 - t));
                if (!isParabolaDone) {
                    petModelObject.position.copy(moveParabola.getPosition(moveParabola.duration));
                    petModelObject.position.y = 0; // 確保回到地面
                    isParabolaDone = true;
                }
            } else {
                resolve();
                petModelObject.scale.y = originScale;
                petModelObject.scale.x = petModelObject.scale.z = originScale;
            }

            petModelObject.scale.y = originScale * squeeze;
            petModelObject.scale.x = petModelObject.scale.z = originScale / Math.sqrt(squeeze);
        },

        promise
    };
}

let resetSceneGame: (() => void) | null = null;

export function resetThrowingBallGame() {
    resetSceneGame?.();
}

export const forwardCam: Action<HTMLButtonElement> = function (button) {

    function animation(deltatime: number) {
        if (!sceneInitResult) return;

        const camera = sceneInitResult.camera;
        const controls = sceneInitResult.controls;

        const forward = camera.getWorldDirection(new Vector3()).setY(0).normalize();
        const distance = 0.3; // 每秒移動一公分

        camera.position.addScaledVector(forward, distance * deltatime / 1000);
        controls.target.addScaledVector(forward, distance * deltatime / 1000);
    }

    function onpointerdown() {
        addAnimationLoop(animation);
    }

    function onpointerup() {
        clearAnimationLoop(animation);
    }

    button.addEventListener("pointerdown", onpointerdown);
    button.addEventListener("pointerup", onpointerup);

    return {
        destroy() {
            button.removeEventListener("pointerdown", onpointerdown);
            button.removeEventListener("pointerup", onpointerup);
            clearAnimationLoop(animation);
        }
    }
};

export const backwardCam: Action<HTMLButtonElement> = function (button) {

    function animation(deltatime: number) {
        if (!sceneInitResult) return;

        const camera = sceneInitResult.camera;
        const controls = sceneInitResult.controls;

        const forward = camera.getWorldDirection(new Vector3()).setY(0).normalize();
        const distance = -0.3; // 每秒移動一公分

        camera.position.addScaledVector(forward, distance * deltatime / 1000);
        controls.target.addScaledVector(forward, distance * deltatime / 1000);
    }

    function onpointerdown() {
        addAnimationLoop(animation);
    }

    function onpointerup() {
        clearAnimationLoop(animation);
    }

    button.addEventListener("pointerdown", onpointerdown);
    button.addEventListener("pointerup", onpointerup);

    return {
        destroy() {
            button.removeEventListener("pointerdown", onpointerdown);
            button.removeEventListener("pointerup", onpointerup);
            clearAnimationLoop(animation);
        }
    }
};
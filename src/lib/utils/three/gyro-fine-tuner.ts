import * as THREE from 'three';

// 定義靈敏度介面
export interface GyroSensitivities {
    pitch: number; // X軸 (仰角/俯仰)
    yaw: number;   // Y軸 (水平/偏航)
    roll: number;  // Z軸 (翻滾/歪頭) - 剩下那個
}

export class GyroFineTuner {
    public enabled: boolean = false;

    // 設定靈敏度：預設 Pitch/Yaw 0.5, Roll 1.0
    public sensitivities: GyroSensitivities = {
        pitch: 0.5,
        yaw: 0.5,
        roll: 1.0
    };

    // 內部運算用的變數 (避免在 Render Loop 中重複創建物件)
    private deviceEuler = new THREE.Euler();
    private deviceQuat = new THREE.Quaternion();
    private baseQuat = new THREE.Quaternion();
    private deltaQuat = new THREE.Quaternion();
    private finalQuat = new THREE.Quaternion();

    // 螢幕與世界座標修正
    private screenTransform = new THREE.Quaternion();
    private worldTransform = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X

    private hasBase: boolean = false;

    constructor(pitch: number = 0.5, yaw: number = 0.5, roll: number = 1.0) {
        this.sensitivities = { pitch, yaw, roll };

        // 綁定 this 避免監聽器上下文丟失
        this.onDeviceOrientationChange = this.onDeviceOrientationChange.bind(this);
        this.onScreenOrientationChange = this.onScreenOrientationChange.bind(this);
    }

    /**
     * 請求權限並啟動 (iOS 13+ 需要)
     */
    public async enable(): Promise<void> {
        // 檢查是否有 requestPermission 方法 (iOS 13+)
        if (typeof (window.DeviceOrientationEvent as any)?.requestPermission === 'function') {
            try {
                const permission = await (window.DeviceOrientationEvent as any).requestPermission();
                if (permission === 'granted') {
                    this.start();
                }
            } catch (e) {
                console.error('Permission denied or error:', e);
            }
        } else {
            // 非 iOS 或舊版瀏覽器直接啟動
            this.start();
        }
    }

    private start(): void {
        this.enabled = true;
        window.addEventListener('deviceorientation', this.onDeviceOrientationChange, false);
        window.addEventListener('orientationchange', this.onScreenOrientationChange, false);
        this.onScreenOrientationChange(); // 初始化螢幕方向
    }

    public stop(): void {
        this.enabled = false;
        window.removeEventListener('deviceorientation', this.onDeviceOrientationChange);
        window.removeEventListener('orientationchange', this.onScreenOrientationChange);
    }

    /**
     * 處理螢幕旋轉 (直向/橫向)
     */
    private onScreenOrientationChange(): void {
        const angle = window.orientation ? THREE.MathUtils.degToRad(Number(window.orientation)) : 0;
        this.screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -angle);
    }

    /**
     * 接收陀螺儀數據並轉為四元數
     */
    private onDeviceOrientationChange(event: DeviceOrientationEvent): void {
        if (!this.enabled) return;

        const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0; // Z
        const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;    // X'
        const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0; // Y''
        const orient = window.orientation ? THREE.MathUtils.degToRad(Number(window.orientation)) : 0;

        // 1. 將 DeviceOrientation 轉為 Quaternion
        this.deviceEuler.set(beta, alpha, -gamma, 'YXZ');
        this.deviceQuat.setFromEuler(this.deviceEuler);

        // 2. 修正相機預設朝向與螢幕旋轉
        this.deviceQuat.multiply(this.worldTransform);

        const minusHalfAngle = -orient / 2;
        const qz = Math.sin(minusHalfAngle);
        const qw = Math.cos(minusHalfAngle);
        const screenRot = new THREE.Quaternion(0, 0, qz, qw);

        this.deviceQuat.multiply(screenRot);

        // 3. 設定初始基準點 (歸零)
        if (!this.hasBase) {
            this.baseQuat.copy(this.deviceQuat);
            this.hasBase = true;
        }
    }

    /**
     * 核心邏輯：應用旋轉到相機
     * 必須在 OrbitControls.update() 之後呼叫
     */
    public applyTo(camera: THREE.Camera): void {
        if (!this.enabled || !this.hasBase) return;

        // 1. 計算變化量 (Delta)
        // Delta = BaseInverse * Current
        this.deltaQuat.copy(this.baseQuat).invert().multiply(this.deviceQuat);

        // 2. 分軸處理靈敏度
        // 我們需要暫時轉回 Euler，因為 Quaternion 無法簡單地只縮放 "Yaw"
        // Order 'YXZ' 是相機視角的標準順序 (先轉頭Y，再抬頭X，最後歪頭Z)
        const tempEuler = new THREE.Euler().setFromQuaternion(this.deltaQuat, 'YXZ');

        // 分別乘上係數
        tempEuler.x *= this.sensitivities.pitch; // 仰角
        tempEuler.y *= this.sensitivities.yaw;   // 水平
        tempEuler.z *= this.sensitivities.roll;  // 翻滾 (剩下那個)

        // 3. 轉回 Quaternion
        this.finalQuat.setFromEuler(tempEuler);

        // 4. 疊加到相機 (使用 multiply 右乘，代表 Local Space 旋轉)
        camera.quaternion.multiply(this.finalQuat);
    }

    /**
     * 重置視角中心
     */
    public recenter(): void {
        this.hasBase = false;
    }
}
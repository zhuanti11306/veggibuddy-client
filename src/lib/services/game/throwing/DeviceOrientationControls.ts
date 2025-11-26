import * as THREE from "three";

export class DeviceOrientationControls {
  private camera: THREE.Camera;
  private enabled: boolean;
  private alpha = 0;
  private beta = 0;
  private gamma = 0;
  private screenOrientation = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.enabled = true;

    // 裝置旋轉事件
    window.addEventListener(
      "deviceorientation",
      this.onDeviceOrientationChangeEvent.bind(this)
    );
    window.addEventListener(
      "orientationchange",
      this.onScreenOrientationChangeEvent.bind(this)
    );

    this.onScreenOrientationChangeEvent();
  }

  private onDeviceOrientationChangeEvent(event: DeviceOrientationEvent) {
    this.alpha = THREE.MathUtils.degToRad(event.alpha || 0);
    this.beta = THREE.MathUtils.degToRad(event.beta || 0);
    this.gamma = THREE.MathUtils.degToRad(event.gamma || 0);
  }

  private onScreenOrientationChangeEvent() {
    this.screenOrientation = getScreenOrientation();
  }

  public update() {
    if (!this.enabled) return;

    const zee = new THREE.Vector3(0, 0, 1);
    const euler = new THREE.Euler();
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // 修正裝置坐標系

    euler.set(this.beta, this.alpha, -this.gamma, "YXZ");
    this.camera.quaternion.setFromEuler(euler);
    this.camera.quaternion.multiply(q1);
    this.camera.quaternion.multiply(
      q0.setFromAxisAngle(zee, -this.screenOrientation)
    );
  }

  public connect() {
    this.enabled = true;
  }

  public disconnect() {
    this.enabled = false;
    window.removeEventListener(
      "deviceorientation",
      this.onDeviceOrientationChangeEvent
    );
    window.removeEventListener(
      "orientationchange",
      this.onScreenOrientationChangeEvent
    );
  }
}

// 取得螢幕方向角度
function getScreenOrientation(): number {
  if (screen.orientation && typeof screen.orientation.angle === "number") {
    return screen.orientation.angle;
  } else {
    // fallback 舊版
    return window.orientation || 0;
  }
}

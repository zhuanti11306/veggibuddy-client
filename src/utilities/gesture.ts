// 實作手勢偵測的類別，包含單指、雙指、滾輪等手勢的偵測與事件派發

interface PointerState {
    id: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    time: number;
    startTime: number;
    endTime?: number;
}

interface SingleTouchGestureState {
    type: "single";
    pointer: PointerState;

    startTime: number;
    lastDispatchTime?: number;
    // endTime?: number;

    startPosition: { x: number; y: number };
    lastPosition: { x: number; y: number };
    lastDispatchPosition?: { x: number; y: number };

    hasMoved: boolean;
    hasDispatchedAs?: "tap" | "longpress" | "swipe" | "pan";

    timeoutForLongPress?: ReturnType<typeof setTimeout>;
}

interface TwoTouchesGestureState {
    type: "two";
    pointers: [PointerState, PointerState];

    startTime: number;
    lastDispatchTime?: number;
    // endTime?: number;

    // startBarycenter: { x: number; y: number };
    // lastBarycenter: { x: number; y: number };
    // lastDispatchBarycenter?: { x: number; y: number };

    startDistance: number;
    lastDistance: number;
    lastDispatchDistance?: number;

    startAngle: number;
    lastAngle: number;
    lastDispatchAngle?: number;
}

interface WheelGestureState {
    type: "wheel";

    startTime: number;
    lastDispatchTime?: number;
    // endTime?: number;

    delta: { readonly x: number; readonly y: number; readonly z: number };
    total: { readonly x: number; readonly y: number; readonly z: number };
    lastDispatchDelta?: { readonly x: number; readonly y: number; readonly z: number };

    // wheelDeltaMode: typeof WheelEvent.DOM_DELTA_LINE | typeof WheelEvent.DOM_DELTA_PIXEL | typeof WheelEvent.DOM_DELTA_PAGE;
}

type GestureState = SingleTouchGestureState | TwoTouchesGestureState | WheelGestureState;

export class GestureTarget extends EventTarget {

    public static readonly longPressThreshold: number = 500; // in ms
    public static readonly panThreshold: number = Math.min(window.screen.availWidth, window.screen.availHeight) * 0.0625; // in px
    public static readonly swipeThreshold: number = 300; // in ms

    public readonly currentTarget: Element;

    private readonly pointers: Map<number, PointerState> = new Map();
    private alivePointerCount: number = 0;
    private gesture: GestureState | null = null;

    constructor(currentTarget: Element) {
        super();
        this.currentTarget = currentTarget;

        this.currentTarget.addEventListener("pointerdown", this.onPointerDown.bind(this) as EventListener);
        this.currentTarget.addEventListener("pointermove", this.onPointerMove.bind(this) as EventListener);
        this.currentTarget.addEventListener("pointerup", this.onPointerUp.bind(this) as EventListener);
        this.currentTarget.addEventListener("pointercancel", this.onPointerCancel.bind(this) as EventListener);

        this.currentTarget.addEventListener("wheel", this.onMouseWheel.bind(this) as EventListener, { passive: false });
    }

    private addPointer(event: PointerEvent): PointerState {
        const state = this.createPointerState(event);
        this.pointers.set(event.pointerId, state);
        this.alivePointerCount++;
        return state;
    }

    private removePointer(event: PointerEvent): PointerState | undefined {
        const state = this.pointers.get(event.pointerId);
        if (state) {
            this.pointers.delete(event.pointerId);
            this.alivePointerCount--;
        }
        return state;
    }

    private createPointerState(event: PointerEvent): PointerState {
        const now = Date.now();
        return {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
            startTime: now,
            time: now,
        };
    }

    private onPointerDown(event: PointerEvent): void {
        event.preventDefault();
        const state = this.addPointer(event);

        if (this.alivePointerCount === 1) {
            this.setSignelTouchGestureState(state);
        } else if (this.alivePointerCount === 2) {
            const states = Array.from(this.pointers.values());
            this.setTwoTouchGestureState(states);
        } else {
            this.clearGestureState();
        }
    }

    private onPointerMove(event: PointerEvent): void {
        event.preventDefault();
        const state = this.pointers.get(event.pointerId);
        if (state) {
            state.x = event.clientX;
            state.y = event.clientY;
            state.time = Date.now();
        }

        if (this.gesture?.type === "single") {
            this.analyzeSinglePointerGestureWhenPointerMove(this.gesture);
        } else if (this.gesture?.type === "two") {
            this.analyzeTwoPointerGestureWhenPointerMove(this.gesture);
        } else {

        }
    }

    private onPointerUp(event: PointerEvent): void {
        event.preventDefault();
        const gesture = this.gesture;
        const state = this.removePointer(event);
        if (state) {
            state.x = event.clientX;
            state.y = event.clientY;
            state.time = Date.now();
            state.endTime = Date.now();
        }

        if (gesture?.type === "single") {
            this.analyzeSinglePointerGestureWhenPointerMove(gesture);
            this.analyzeSinglePointerGestureWhenPointerUp(gesture);
        } else if (gesture?.type === "two") {
            this.analyzeTwoPointerGestureWhenPointerMove(gesture);
            this.analyzeTwoPointerGestureWhenPointerUp(gesture);
        }

        this.clearGestureState();
    }

    private onPointerCancel(event: PointerEvent): void {
        event.preventDefault();
        const state = this.removePointer(event);
        if (state) {
            state.x = event.clientX;
            state.y = event.clientY;
            state.time = Date.now();
            state.endTime = Date.now();
        }

        // if (this.gesture?.type === "single") {
        //     this.analyzeSinglePointerGestureWhenPointerUp(this.gesture);
        // } else if (this.gesture?.type === "two") {
        //     this.analyzeTwoPointerGestureWhenPointerUp(this.gesture);
        // } else {
        //     this.gesture = null;
        // }

        this.clearGestureState();
    }

    private onMouseWheel(event: WheelEvent): void {
        event.preventDefault();

        if (this.gesture?.type !== "wheel") {
            this.setWheelGestureState(event);
        } else {
            const gesture = this.gesture as WheelGestureState;
            gesture.delta = { x: event.deltaX, y: event.deltaY, z: event.deltaZ };
            gesture.total = { x: gesture.delta.x + gesture.total.x, y: gesture.delta.y + gesture.total.y, z: gesture.delta.z + gesture.total.z };

            this.analyzeWheelGestureWhenWheelRoll(gesture);
        }
    }

    private setSignelTouchGestureState(state: PointerState): void {
        if (this.gesture)
            this.clearGestureState();

        const now = Date.now();
        this.gesture = {
            type: "single",
            pointer: state,
            startTime: now,
            startPosition: { x: state.x, y: state.y },
            lastPosition: { x: state.x, y: state.y },
            hasMoved: false,
            timeoutForLongPress: setTimeout(() => {
                this.dispatchLongPressGesture(this.gesture as SingleTouchGestureState);
            }, GestureTarget.longPressThreshold)
        };
    }

    private setTwoTouchGestureState(states: PointerState[]): void {
        if (this.gesture)
            this.clearGestureState();

        const [p1, p2] = states;
        const now = Date.now();
        const distance = GestureTarget.calculateDistance(p1, p2);
        const angle = GestureTarget.calculateAngle(p1, p2);

        // const barycenterX = (p1.x + p2.x) / 2;
        // const barycenterY = (p1.y + p2.y) / 2;

        this.gesture = {
            type: "two",
            pointers: [p1, p2],
            startTime: now,

            // startBarycenter: { x: barycenterX, y: barycenterY },
            // lastBarycenter: { x: barycenterX, y: barycenterY },

            startDistance: distance,
            lastDistance: distance,

            startAngle: angle,
            lastAngle: angle
        };
    }

    private setWheelGestureState(event: WheelEvent): void {
        if (this.gesture)
            this.clearGestureState();

        const now = Date.now();
        const delta = { x: event.deltaX, y: event.deltaY, z: event.deltaZ };
        const total = { x: event.deltaX, y: event.deltaY, z: event.deltaZ };

        this.gesture = {
            type: "wheel",
            startTime: now,
            lastDispatchTime: now,
            delta: delta,
            total: total
        };
    }

    private clearGestureState(): void {
        if (!this.gesture) return;

        if (this.gesture.type === "single") {
            this.clearSingleTouchGestureState(this.gesture);
        } else if (this.gesture.type === "two") {
            this.clearTwoTouchGestureState(this.gesture);
        }

        this.gesture = null;
    }

    private clearSingleTouchGestureState(gesture: SingleTouchGestureState): void {
        if (gesture.timeoutForLongPress) {
            clearTimeout(gesture.timeoutForLongPress);
            delete gesture.timeoutForLongPress;
        }
    }

    private clearTwoTouchGestureState(_gesture: TwoTouchesGestureState): void {
        // No specific cleanup needed for two touch gestures
    }

    private analyzeSinglePointerGestureWhenPointerMove(gesture: SingleTouchGestureState): void {
        const currentX = gesture.pointer.x;
        const currentY = gesture.pointer.y;

        const dx = gesture.pointer.x - gesture.startPosition.x;
        const dy = gesture.pointer.y - gesture.startPosition.y;
        const distance = Math.hypot(dx, dy);

        if (gesture.hasMoved || GestureTarget.hasMovedEnough(distance)) {
            gesture.hasMoved = true;
            gesture.lastPosition = { x: currentX, y: currentY };
            this.dispatchPanGesture(gesture);
            if (gesture.timeoutForLongPress) {
                clearTimeout(gesture.timeoutForLongPress);
                delete gesture.timeoutForLongPress;
            }
        }

        // gesture.lastPosition = { x: currentX, y: currentY };
    }

    private analyzeSinglePointerGestureWhenPointerUp(gesture: SingleTouchGestureState): void {
        if (gesture.timeoutForLongPress) {
            clearTimeout(gesture.timeoutForLongPress);
            delete gesture.timeoutForLongPress;
        }

        if (!gesture.hasMoved && !gesture.hasDispatchedAs) {
            return this.dispatchTapGesture(gesture);
        }

        const now = Date.now();
        const duration = now - gesture.startTime;
        if (gesture.hasMoved && duration < GestureTarget.swipeThreshold) {
            return this.dispatchSwipeGesture(gesture);
        }
    }

    private analyzeTwoPointerGestureWhenPointerMove(gesture: TwoTouchesGestureState): void {
        const [p1, p2] = gesture.pointers;
        // const currentBarycenterX = (p1.x + p2.x) / 2;
        // const currentBarycenterY = (p1.y + p2.y) / 2;

        const currentDistance = GestureTarget.calculateDistance(p1, p2);
        const deltaDistance = currentDistance - (gesture.lastDispatchDistance || gesture.startDistance);

        const currentAngle = GestureTarget.calculateAngle(p1, p2);
        const deltaAngle = currentAngle - (gesture.lastDispatchAngle || gesture.startAngle);

        if (GestureTarget.hasMovedEnough(deltaDistance)) {
            gesture.lastDistance = currentDistance;
            this.dispatchZoomGesture(gesture);
        }

        if (Math.abs(deltaAngle) > 0.0625) { // Around 3.6 degrees
            gesture.lastAngle = currentAngle;
            this.dispatchRotateGesture(gesture);
        }
    }

    private analyzeTwoPointerGestureWhenPointerUp(_gesture: TwoTouchesGestureState): void {
        // No action needed on pointer up for two touches
    }

    private analyzeWheelGestureWhenWheelRoll(gesture: WheelGestureState): void {
        this.dispatchZoomWithWheel(gesture);
    }


    private dispatchTapGesture(gesture: SingleTouchGestureState): void {
        const event = new GestureSinglePressEvent("tap", gesture);
        this.currentTarget.dispatchEvent(event);
    }

    private dispatchLongPressGesture(gesture: SingleTouchGestureState): void {
        const event = new GestureSinglePressEvent("longpress", gesture);
        this.currentTarget.dispatchEvent(event);
    }

    private dispatchZoomGesture(gesture: TwoTouchesGestureState): void {
        const event = new GestureTouchZoomEvent("zoom", gesture);
        this.currentTarget.dispatchEvent(event);
    }

    private dispatchZoomWithWheel(gesture: WheelGestureState): void {
        const event = new GesutreWheelZoomEvent("zoom", gesture);
        this.currentTarget.dispatchEvent(event);
    }

    private dispatchRotateGesture(gesture: TwoTouchesGestureState): void {
        const event = new GestureRotateEvent("rotate", gesture);
        this.currentTarget.dispatchEvent(event);
    }

    private dispatchPanGesture(gesture: SingleTouchGestureState): void {
        const event = new GesturePanEvent("pan", gesture);
        this.currentTarget.dispatchEvent(event);
    }

    private dispatchSwipeGesture(gesture: SingleTouchGestureState): void {
        const event = new GesturePanEvent("swipe", gesture);
        this.currentTarget.dispatchEvent(event);
    }

    private static hasMovedEnough(delta: number): boolean {
        return Math.abs(delta) > GestureTarget.panThreshold;
    }

    private static calculateDistance(p1: PointerState, p2: PointerState): number {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    private static calculateAngle(p1: PointerState, p2: PointerState): number {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }
}

export class GestureSinglePressEvent extends Event {

    public gesture: SingleTouchGestureState;

    public position: { x: number; y: number };

    constructor(type: "tap" | "longpress", gesture: SingleTouchGestureState) {
        super(type, { bubbles: true, cancelable: true });
        this.gesture = gesture;
        this.position = { x: gesture.pointer.x, y: gesture.pointer.y };

        gesture.lastDispatchPosition = { x: gesture.pointer.x, y: gesture.pointer.y };
        gesture.hasDispatchedAs = type;
        gesture.lastDispatchTime = Date.now();
    }
}

export class GesturePanEvent extends Event {

    public gesture: SingleTouchGestureState;

    public startPosition: { x: number; y: number };
    public currentPosition: { x: number; y: number };

    public move: { x: number; y: number };
    public deltaMove: { x: number; y: number };

    constructor(type: "swipe" | "pan", gesture: SingleTouchGestureState) {
        super(type, { bubbles: true, cancelable: true });
        this.gesture = gesture;

        this.startPosition = { x: gesture.startPosition.x, y: gesture.startPosition.y };
        this.currentPosition = { x: gesture.pointer.x, y: gesture.pointer.y };

        this.move = {
            x: gesture.pointer.x - gesture.startPosition.x,
            y: gesture.pointer.y - gesture.startPosition.y
        };

        this.deltaMove = {
            x: gesture.pointer.x - (gesture.lastDispatchPosition?.x ?? gesture.startPosition.x),
            y: gesture.pointer.y - (gesture.lastDispatchPosition?.y ?? gesture.startPosition.y)
        };

        gesture.lastDispatchPosition = { x: gesture.pointer.x, y: gesture.pointer.y };
        gesture.hasDispatchedAs = type;
        gesture.lastDispatchTime = Date.now();
    }
}

export class GestureRotateEvent extends Event {

    public gesture: TwoTouchesGestureState;

    public angle: number;
    public deltaAngle: number;

    constructor(type: string, gesture: TwoTouchesGestureState) {
        super(type, { bubbles: true, cancelable: true });
        this.gesture = gesture;

        this.angle = gesture.lastAngle - gesture.startAngle;
        this.deltaAngle = gesture.lastAngle - (gesture.lastDispatchAngle ?? gesture.startAngle);

        gesture.lastDispatchAngle = gesture.lastAngle;
        gesture.lastDispatchTime = Date.now();
    }
}

export interface GestureZoomEvent extends Event {
    gesture: GestureState;
    distance: number;
    deltaDistance: number;
    scale: number;
    deltaScale: number;
}

export class GesutreWheelZoomEvent extends Event implements GestureZoomEvent {

    public static zoomScale: number = 1.0;

    public gesture: WheelGestureState;

    public distance: number = NaN;
    public deltaDistance: number = NaN;

    public scale: number = NaN;
    public deltaScale: number = NaN;
    
    constructor(type: string, gesture: WheelGestureState) {
        super(type, { bubbles: true, cancelable: true });
        this.gesture = gesture;

        this.distance = gesture.total.y;
        this.deltaDistance = gesture.delta.y;

        this.scale = this.distance * GesutreWheelZoomEvent.zoomScale;
        this.deltaScale = this.deltaDistance * GesutreWheelZoomEvent.zoomScale;

        gesture.lastDispatchDelta = gesture.delta;
        gesture.lastDispatchTime = Date.now();
    }
}

export class GestureTouchZoomEvent extends Event implements GestureZoomEvent {

    public gesture: TwoTouchesGestureState;

    public distance: number = NaN;
    public deltaDistance: number = NaN;

    public scale: number = NaN;
    public deltaScale: number = NaN;

    constructor(type: string, gesture: TwoTouchesGestureState) {
        super(type, { bubbles: true, cancelable: true });
        this.gesture = gesture;

        this.distance = gesture.lastDistance - gesture.startDistance;
        this.deltaDistance = gesture.lastDistance - (gesture.lastDispatchDistance ?? gesture.startDistance);

        this.scale = this.distance / gesture.startDistance;
        this.deltaScale = this.deltaDistance / gesture.startDistance;

        gesture.lastDispatchDistance = gesture.lastDistance;
        gesture.lastDispatchTime = Date.now();
    }
}
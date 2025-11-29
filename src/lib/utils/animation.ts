
const animations: Map<(deltaTime: number, time: number) => void, number> = new Map();
const prepareAnimations: Set<(deltaTime: number, time: number) => void> = new Set();

let animationFrameId: number | null = null;
let lastTime: number | null = null;

export function addAnimationLoop(animate: (deltaTime: number, time: number) => void) {
    prepareAnimations.add(animate);

    if (prepareAnimations.size && !animations.size && animationFrameId === null)
        startAnimations();
}

export function clearAnimationLoop(animate: (deltaTime: number, time: number) => void) {
    animations.delete(animate);
    prepareAnimations.delete(animate);

    if (animations.size === 0 && animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function startAnimations() {
    const loop = (time: number) => {
        if (prepareAnimations.size) {
            prepareAnimations.forEach((animate) => {
                animations.set(animate, time);
            });
            prepareAnimations.clear();
        }

        const deltaTime = lastTime !== null ? time - lastTime : 0;
        lastTime = time;

        runAnimations(deltaTime, time);
        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
}

export function runAnimations(deltaTime: number, time: number) {
    animations.forEach((startTime, animate) => animate(deltaTime, time - startTime));
}

export function stopAllAnimations() {
    animations.clear();

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}
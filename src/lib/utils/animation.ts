
const animations: Set<(deltaTime: number, time: number) => void> = new Set();

let animationFrameId: number | null = null;
let lastTime: number | null = null;

export function addAnimationLoop(animate: (deltaTime: number, time: number) => void) {
    console.log("Add animation loop", animations.size + 1);
    
    animations.add(animate);

    if (animations.size && animationFrameId === null)
        startAnimations();
}

export function clearAnimationLoop(animate: (deltaTime: number, time: number) => void) {
    animations.delete(animate);

    if (animations.size === 0 && animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function startAnimations() {
    const loop = (time: number) => {
        const deltaTime = lastTime !== null ? time - lastTime : 0;
        lastTime = time;

        runAnimations(deltaTime, time);
        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
}

export function runAnimations(deltaTime: number, time: number) {
    animations.forEach(animate => animate(deltaTime, time));
}

export function stopAllAnimations() {
    animations.clear();

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}
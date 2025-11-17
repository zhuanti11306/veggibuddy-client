<script lang="ts">
  import {
    endDrag,
    exit,
    moveDrag,
    reset,
    startDrag,
    sliderChange,
  } from "$lib/services/game/throwing/eventHandler";
  import { init } from "$lib/services/game/throwing/main";
  import { noticeEvent } from "$lib/services/game/notice";
  import { onMount } from "svelte";

  // UI 狀態
  let loading = true;
  let showCameraControl = false;
  let showResetButton = false;
  let showExitButton = false;

  let slideValue = 50;

  // Notice 系統
  let noticeText = "";
  let showNotice = false;

  // 遊戲初始化
  onMount(() => {
    init().then(() => {
      loading = false;
      showCameraControl = true;
      showResetButton = true;
      showExitButton = true;
    });
    return exit;
  });

  // 拖曳事件管理
  let dragging = false;

  function handleDown(event: MouseEvent | TouchEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("#cameraControl, #resetButton, #exitButton")) return;

    dragging = true;
    const { clientX: x, clientY: y } =
      "touches" in event ? event.touches[0] : event;
    startDrag(x, y);
  }

  function handleMove(event: MouseEvent | TouchEvent) {
    if (!dragging) return;
    const { clientX: x, clientY: y } =
      "touches" in event ? event.touches[0] : event;
    moveDrag(x, y);
  }

  function handleUp() {
    if (!dragging) return;
    dragging = false;
    endDrag();
  }

  // Slider 監聽
  $: sliderChange(slideValue);
  $: if ($noticeEvent) {
    noticeText = $noticeEvent;
    showNotice = true;
  } else {
    showNotice = false;
  }

  // Reset 按鈕
  function handleReset() {
    slideValue = 50;
    reset();
  }
</script>

<canvas
  id="gameCanvas"
  width={window.innerWidth}
  height={window.innerHeight}
  on:mousedown={handleDown}
  on:mousemove={handleMove}
  on:mouseup={handleUp}
  on:touchstart={handleDown}
  on:touchmove={handleMove}
  on:touchend={handleUp}
>
</canvas>

{#if loading}
  <div id="loading-spinner">
    <div class="dot"></div>
  </div>
{/if}

<div id="cameraControl" class:visible={showCameraControl}>
  <input
    id="slideControl"
    type="range"
    min="0"
    max="100"
    bind:value={slideValue}
  />
</div>

<button id="resetButton" class:visible={showResetButton} on:click={handleReset}
  >↺</button
>
<button id="exitButton" class:visible={showExitButton} on:click={exit}>×</button
>

<div class="notice {showNotice ? 'show' : ''}">{noticeText}</div>

<style>
  /* Canvas */
  #gameCanvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  /* Loading Spinner */
  #loading-spinner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  #loading-spinner .dot {
    width: 60px;
    height: 60px;
    border: 8px solid #f3f3f3;
    border-top: 8px solid #00ff00;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Camera Control */
  #cameraControl {
    position: absolute;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    background: #333;
    padding: 10px;
    border-radius: 8px;
    width: 50px;
    height: 150px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s;
    z-index: 10000;
  }
  #cameraControl.visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* Vertical Slider */
  #slideControl {
    width: 20px;
    height: 100%;
    writing-mode: vertical-lr;
    direction: rtl;
    -webkit-appearance: none;
    background: linear-gradient(180deg, #555, #333);
    border-radius: 10px;
    cursor: pointer;
  }
  #slideControl::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    background: #00ff00;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.7);
  }

  /* Buttons */
  #resetButton,
  #exitButton {
    position: absolute;
    width: 60px; /* 固定寬度 */
    height: 40px; /* 固定高度 */
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 20px;
    z-index: 10000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s;
  }
  #resetButton.visible {
    bottom: 20px;
    left: 20px;
    background: #aaa;
    color: #fff;
    opacity: 1;
    pointer-events: auto;
  }
  #exitButton.visible {
    top: 10px;
    right: 10px;
    background: #444;
    color: #fff;
    opacity: 1;
    pointer-events: auto;
  }

  /* Notice */
  .notice {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 16px;
    z-index: 100000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s;
  }
  .notice.show {
    opacity: 1;
  }
</style>

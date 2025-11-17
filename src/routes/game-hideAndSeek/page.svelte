<script lang="ts">
  import {
    capture,
    exit,
    handlePoint,
    reset,
    sliderChange,
  } from "$lib/services/game/hideAndSeek/eventHandler";
  import { noticeEvent } from "$lib/services/game/notice";
  import { init } from "$lib/services/game/hideAndSeek/main";
  import { onMount } from "svelte";

  let showLoading = true;
  let showSlider = false;
  let showCapture = false;
  let showCongrats = false;
  let showReset = false;
  let showExit = false;
  let showNotice = false;
  let canClickCanvas = false;

  let noticeText = "";
  let slideValue = 50;

  onMount(() => {
    init().then(() => {
      showLoading = false;
      showCapture = true;
      showReset = true;
      showExit = true;
      showSlider = false;
      console.log("onMount");
    });

    return () => {
      exit();
    };
  });

  function handlePress(event: MouseEvent | TouchEvent) {
    const target = event.target as HTMLElement;

    if (target.closest("#slideControl, #captureBtn, #resetButton, #exitButton"))
      return;

    const pos = "touches" in event ? event.touches[0] : event;

    let isSuccessful = handlePoint(pos.clientX, pos.clientY);

    if (isSuccessful) {
      showCongrats = true;
      showSlider = false;
      canClickCanvas = false;
      showLoading = false;
      showCapture = false;
      showNotice = false;
      showReset = true;
      showExit = true;
    }
    console.log("handlePress");
  }

  async function handleCapture() {
    let isSuccessful = await capture();
    if (isSuccessful) {
      showCapture = false;
      showSlider = true;
      canClickCanvas = true;
      showCongrats = false;
      showLoading = false;
      showNotice = false;
      showReset = true;
      showExit = true;
    }
    console.log(isSuccessful);
  }

  function resetApp() {
    reset();
    showSlider = false;
    showCapture = true;
    canClickCanvas = false;
    showCongrats = false;
    showLoading = false;
    showNotice = false;
    showReset = true;
    showExit = true;
  }

  function exitApp() {
    exit();
    showSlider = false;
    showCapture = false;
    canClickCanvas = false;
    showCongrats = false;
    showLoading = false;
    showNotice = false;
    showReset = false;
    showExit = false;
  }

  // slider 同步動作
  $: sliderChange?.(slideValue);
  $: if ($noticeEvent) {
    noticeText = $noticeEvent;
    showNotice = true;
  } else {
    showNotice = false;
  }
</script>

{#if showLoading}
  <div id="loading-spinner"></div>
{/if}

<canvas
  id="gameCanvas"
  width={innerWidth}
  height={innerHeight}
  on:mousedown={handlePress}
  on:touchstart={handlePress}
></canvas>

<div id="slider-container" class:visible={showSlider}>
  <input
    id="slideControl"
    type="range"
    min="0"
    max="100"
    bind:value={slideValue}
  />
</div>

<button
  id="captureBtn"
  class:visible={showCapture}
  on:click={handleCapture}
  aria-label="Take a photo"
></button>
<button id="resetButton" class:visible={showReset} on:click={resetApp}>↺</button
>
<button id="exitButton" class:visible={showExit} on:click={exitApp}>×</button>

{#if showCongrats}
  <div id="congratsText">Congratulation!</div>
{/if}

<div class="notice {showNotice ? 'show' : ''}">{noticeText}</div>

<style>
  #gameCanvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }
  /* === 載入動畫 === */
  #loading-spinner {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.85);
    z-index: 9999;

    border: 8px solid #f3f3f3;
    border-top: 8px solid #00ff00;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    margin: auto;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  #slider-container {
    position: absolute;
    display: none;
    bottom: 40px;
    left: 0;
    width: 100vw;
    box-sizing: border-box;
    z-index: 2000;
    justify-content: center;
    align-items: center;
  }

  #slider-container.visible {
    display: flex; /* showSlider = true 時顯示 */
  }

  #captureBtn {
    position: absolute;
    top: 90%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 4px solid white;
    background-color: transparent;
    cursor: pointer;
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
    transition:
      transform 0.1s,
      box-shadow 0.1s;
  }

  #captureBtn::before {
    content: "";
    width: 42px;
    height: 42px;
    background-color: red;
    border-radius: 50%;
    display: block;
    transition: transform 0.1s;
  }

  #captureBtn:active::before {
    transform: scale(0.85);
  }

  #resetButton {
    transform: rotate(180deg);
    position: absolute;
    left: 20px;
    top: 20px;
    padding: 10px 20px;
    background-color: #444;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    z-index: 10000;
    font-size: 20px;
  }

  #exitButton {
    position: absolute;
    right: 20px;
    top: 20px;
    padding: 10px 20px;
    background-color: #444;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    z-index: 10000;
    font-size: 20px;
  }

  #congratsText {
    position: absolute;
    top: 58%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 30px;
    color: #000000;
    font-weight: bold;
    z-index: 10000;
  }

  .notice {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    color: white;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 16px;
    z-index: 999999;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .notice.show {
    opacity: 1;
  }
</style>

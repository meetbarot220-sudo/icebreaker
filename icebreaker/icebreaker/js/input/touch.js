/**
 * touch.js - Mobile virtual on-screen controls for touch devices
 */

export class TouchInput {
  constructor() {
    this.isTouchDevice = false;
    this.state = {
      left: false,
      right: false,
      jump: false,
      hammer: false,
      pause: false
    };

    this.container = null;
    this.init();
  }

  init() {
    // Detect touch device
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (hasTouch) {
      this.isTouchDevice = true;
      this.createTouchOverlay();
    } else {
      // Also listen for first touch event just in case
      window.addEventListener('touchstart', () => {
        if (!this.isTouchDevice) {
          this.isTouchDevice = true;
          this.createTouchOverlay();
        }
      }, { once: true });
    }
  }

  createTouchOverlay() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'touch-controls-container';
    this.container.innerHTML = `
      <div id="touch-dpad">
        <button id="btn-left" class="touch-btn dpad-btn" aria-label="Left">◀</button>
        <button id="btn-right" class="touch-btn dpad-btn" aria-label="Right">▶</button>
      </div>
      <div id="touch-actions">
        <button id="btn-hammer" class="touch-btn action-btn red-btn" aria-label="Hammer">B</button>
        <button id="btn-jump" class="touch-btn action-btn red-btn" aria-label="Jump">A</button>
      </div>
      <button id="btn-pause" class="touch-btn pause-btn" aria-label="Pause">PAUSE</button>
    `;

    document.body.appendChild(this.container);

    // Bind touch events to buttons
    this.bindButton('btn-left', 'left');
    this.bindButton('btn-right', 'right');
    this.bindButton('btn-jump', 'jump');
    this.bindButton('btn-hammer', 'hammer');
    this.bindButton('btn-pause', 'pause');
  }

  bindButton(elementId, stateKey) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const setDown = (e) => {
      e.preventDefault();
      this.state[stateKey] = true;
      el.classList.add('active');
    };

    const setUp = (e) => {
      e.preventDefault();
      this.state[stateKey] = false;
      el.classList.remove('active');
    };

    el.addEventListener('touchstart', setDown, { passive: false });
    el.addEventListener('touchend', setUp, { passive: false });
    el.addEventListener('touchcancel', setUp, { passive: false });
  }

  getState() {
    return { ...this.state };
  }
}

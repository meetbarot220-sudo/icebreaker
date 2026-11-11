/**
 * gamepad.js - HTML5 Gamepad API integration for 1P and 2P controller support
 */

export class GamepadInput {
  constructor() {
    this.prevButtons = [[], []];
  }

  getGamepad(playerIndex = 0) {
    if (!navigator.getGamepads) return null;
    const gamepads = navigator.getGamepads();
    // Find active connected gamepads
    const active = [];
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        active.push(gamepads[i]);
      }
    }
    return active[playerIndex] || null;
  }

  getState(playerIndex = 0) {
    const gp = this.getGamepad(playerIndex);
    if (!gp) {
      return { left: false, right: false, jump: false, hammer: false, start: false };
    }

    // D-pad & Analog stick
    const axisX = gp.axes[0] || 0;
    const dpadLeft = gp.buttons[14] && gp.buttons[14].pressed;
    const dpadRight = gp.buttons[15] && gp.buttons[15].pressed;

    const left = axisX < -0.3 || dpadLeft;
    const right = axisX > 0.3 || dpadRight;

    // Button 0 (A) = Jump, Button 1 (B) / Button 2 (X) = Hammer
    const btnA = gp.buttons[0] && gp.buttons[0].pressed;
    const btnB = gp.buttons[1] && gp.buttons[1].pressed;
    const btnX = gp.buttons[2] && gp.buttons[2].pressed;
    const btnStart = gp.buttons[9] && gp.buttons[9].pressed; // Start / Options

    return {
      left: !!left,
      right: !!right,
      jump: !!btnA,
      hammer: !!(btnB || btnX),
      start: !!btnStart
    };
  }

  isStartPressed(playerIndex = 0) {
    const gp = this.getGamepad(playerIndex);
    if (!gp) return false;
    const startDown = gp.buttons[9] && gp.buttons[9].pressed;
    const wasDown = this.prevButtons[playerIndex] && this.prevButtons[playerIndex][9];
    if (!this.prevButtons[playerIndex]) this.prevButtons[playerIndex] = [];
    this.prevButtons[playerIndex][9] = startDown;
    return startDown && !wasDown;
  }
}

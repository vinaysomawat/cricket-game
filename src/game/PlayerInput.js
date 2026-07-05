export class PlayerInput {
  constructor() {
    this.swingAt = null;
    this.hasSwungThisBall = false;
  }
  reset() {
    this.hasSwungThisBall = false;
    this.swingAt = null;
  }
  swing(now) {
    if (this.hasSwungThisBall) return false;
    this.hasSwungThisBall = true;
    this.swingAt = now;
    return true;
  }
}

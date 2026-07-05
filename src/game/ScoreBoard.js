export class ScoreBoard {
  constructor() {
    this.totalBalls = 12;
    this.reset();
  }
  reset() {
    this.runs = 0; this.wickets = 0; this.ballsBowled = 0;
    this.fours = 0; this.sixes = 0; this.dots = 0;
    this.highScore = Number(localStorage.getItem('cricketClash3DHighScore') || 0);
  }
  addBall(runs, isOut, isDot) {
    this.ballsBowled++;
    this.runs += runs;
    if (runs === 4) this.fours++;
    if (runs === 6) this.sixes++;
    if (isDot) this.dots++;
    if (isOut) this.wickets++;
  }
  get isMatchOver() { return this.wickets >= 1 || this.ballsBowled >= this.totalBalls; }
  get overs() {
    const completed = Math.floor(this.ballsBowled / 6);
    const rem = this.ballsBowled % 6;
    return `${completed}.${rem}`;
  }
  get ballsLeft() { return this.totalBalls - this.ballsBowled; }
  get crr() {
    if (this.ballsBowled === 0) return '0.00';
    return (this.runs / (this.ballsBowled / 6)).toFixed(2);
  }
  get strikeRate() {
    if (this.ballsBowled === 0) return '0.0';
    return ((this.runs / this.ballsBowled) * 100).toFixed(1);
  }
  maybeUpdateHighScore() {
    const isNew = this.runs > this.highScore;
    if (isNew) {
      this.highScore = this.runs;
      localStorage.setItem('cricketClash3DHighScore', String(this.runs));
    }
    return isNew;
  }
}

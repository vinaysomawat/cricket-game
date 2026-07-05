# Cricket Clash — 12 Ball Blitz

A single-player, timing-based batting cricket game built with vanilla HTML, CSS, and JavaScript. No build tools, no frameworks — just open `index.html` in a browser.

## Play

Open `index.html` directly in any modern browser (Chrome, Firefox, Safari, Edge).

- **Desktop:** Press `Space` to play a shot.
- **Mobile:** Tap the screen to play a shot.

Face 12 balls with 1 wicket in hand. Time your shot against the bowler's delivery — perfect timing clears the boundary, mistimed shots go to hand. Your highest score is saved locally and shown on the start screen.

## Project structure

```
cricket-game/
  index.html      Screens: start, toss, game, match summary
  style.css       Glassmorphism UI, gradients, responsive layout, animations
  script.js       Game, Player, Bowler, ScoreBoard, AnimationManager, SoundManager
  assets/
    images/
    sounds/       (sound effects are generated procedurally via WebAudio — no files needed)
```

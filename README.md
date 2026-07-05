# Cricket Clash 3D — 12 Ball Blitz

A single-player, timing-based batting cricket game rendered as a real-time 3D scene with Three.js. No build tools — open `index.html` in a modern browser (needs network access once, to load Three.js from a CDN via an import map).

> Scope note: this is a stylized, original-asset take inspired by the *presentation* of commercial mobile cricket games — not a recreation of any real game's assets, likenesses, or UI. It aims for a genuinely 3D, cinematic feel (multi-camera broadcast cuts, slow-motion replays, dynamic day/evening/night lighting, an instanced crowd) at a scope realistic for hand-written code — not literal console-AAA fidelity (no real PBR asset pipeline, 4K textures, or motion-captured rigs).

## Play

Serve the folder over HTTP (the ES module + import map need `http(s)://`, not `file://`) and open `index.html`, e.g.:

```
python3 -m http.server 8080
```

- **Desktop:** Press `Space` to play a shot.
- **Mobile:** Tap the screen to play a shot.

Face 12 balls with 1 wicket in hand. Time your shot against the bowler's delivery — perfect timing clears the boundary, mistimed shots go to hand or bowl you. Your highest score is saved locally and shown on the start screen.

## Architecture

```
index.html            Screens (start/toss/game/summary) + Three.js import map
style.css             Glassmorphism UI, timing meter, camera label, replay banner
src/
  main.js             Entry point
  utils.js            Small math/random helpers shared across modules
  engine/
    Renderer.js        WebGLRenderer + EffectComposer (bloom) + resize handling
    Textures.js         Procedural canvas textures (ball seam, bat wood grain)
  stadium/
    Stadium.js          Pitch, ground, boundary rope, stands, pavilion, dugouts,
                         sight screen, floodlight towers, LED boards, replay screen, flags
    Lighting.js          Sun + hemisphere + floodlights; day/evening/night presets
    Crowd.js             InstancedMesh spectators; idle bob, cheer, silence, Mexican wave
  players/
    FigureFactory.js     Shared low-poly humanoid rig builder (pivoted limbs)
    BowlerModel.js        Run-up, bowling action, idle
    BatsmanModel.js        Stance, loft/drive/defend/miss swings, celebrate/disappointment
  physics/
    BallPhysics.js        Deterministic delivery flight (swing/bounce/seam) and
                           post-hit trajectories (dot/runs/four/six) as pure functions of progress
  cameras/
    CameraRig.js          Bowler/batsman/broadcast/boundary/drone/crowd/stump/follow
                           camera poses; hard cuts, eased flights, ball-follow mode
  effects/
    ParticleSystem.js     Pooled GPU point-sprite bursts (bat impact, six, out dust)
    Confetti.js            DOM-canvas confetti for a new high score
  replay/
    ReplayManager.js       Slow-motion instant replay after 4/6/OUT — replays the
                            same deterministic trajectory function on a slower clock
                            from a different camera angle
  audio/
    SoundManager.js        Procedural WebAudio SFX (no audio files) with simple
                            PannerNode-based spatial positioning
  ui/
    UIManager.js           All DOM overlay: screens, scoreboard, popups, commentary,
                            shot-timing meter, camera label, replay banner
  game/
    Game.js               State machine tying every module together
    ScoreBoard.js          Runs/wickets/overs/strike-rate/high-score state
    DeliveryGenerator.js   Randomized per-ball pace/line/swing/seam/bounce
    PlayerInput.js         Swing-timing capture
    Commentary.js          Commentary line pools
    constants.js           Shared world-space dimensions
```

## Gameplay rules

1 innings, 1 wicket, 12 balls. Shot outcome is driven by timing accuracy against the ball's flight (closer to the "perfect" window near the bat scores more), with weighted randomness within each timing band so no two deliveries play out the same way.

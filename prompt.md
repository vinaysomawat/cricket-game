Prompt: Build a Basic Cricket Game (HTML + CSS + JavaScript)

You are an expert JavaScript game developer.

Build a complete browser-based cricket game using Vanilla JavaScript, HTML5 Canvas (or DOM if more appropriate), and CSS.

The game should be clean, modern, responsive, and easy to extend later.

Game Type

A simple one-player batting cricket game.

The player controls the batsman.

The computer bowls automatically.

The objective is to score as many runs as possible before getting out.

Gameplay
Match
1 inning
1 wicket
12 balls
Highest score wins
Controls

Desktop

Space → Hit shot

Mobile

Tap screen to hit
Bowling

The bowler delivers the ball every 2–3 seconds.

Ball speed should vary slightly.

The ball should have a realistic animation.

Batting

The player must press Space at the correct timing.

Timing determines the result.

Perfect timing

Six
Four

Good timing

1
2
3

Late / Early

Dot ball

Very poor timing

OUT
Randomness

Every delivery should be different.

Random ball speed

Random bounce

Random shot result

Example probability:

Perfect

20%

Good

40%

Poor

30%

Out

10%

Scoreboard

Display

Runs

Wickets

Overs

Balls remaining

Current run rate

Highest score (stored in LocalStorage)

Example

Score

42 / 1

Overs

1.4

Balls Left

2

UI

Create a modern cricket stadium.

Include

Sky

Ground

Pitch

Bowler

Batsman

Ball animation

Simple audience

Shadow effects

Smooth animations

Animations

Bowler runs

Ball travels

Bat swings

Ball flies after hit

Boundary celebration

Six animation

Out animation

Score popup

Example

+4

+6

OUT!

Sound Effects

(Optional but supported)

Bat hit

Crowd cheer

Boundary

Six

Out

Background stadium ambience

Game Flow

Start Screen

Play button

↓

Toss animation

↓

Game begins

↓

12 balls

↓

Match Summary

↓

Play Again

Match Summary

Display

Final Score

Strike Rate

Boundaries

Sixes

Dots

Wickets

Highest Score

Play Again button

Visual Style

Use modern gradients.

Rounded cards.

Glassmorphism scoreboard.

Smooth CSS transitions.

Responsive layout.

Looks similar to modern mobile cricket games.

Code Structure

Organize files.

cricket-game/

index.html

style.css

script.js

assets/

images/

sounds/


Keep JavaScript modular.

Use classes.

Example

Game

Player

Bowler

Ball

ScoreBoard

AnimationManager
Features

Implement

✅ Ball animation

✅ Bat animation

✅ Random bowling

✅ Timing detection

✅ Score calculation

✅ Boundary detection

✅ Out logic

✅ Match end

✅ Restart game

✅ LocalStorage high score

Nice-to-Have

Add simple particle effects when hitting a six.

Camera shake on six.

Confetti on match win.

Crowd wave animation.

Commentary text such as:

What a shot!

Fantastic cover drive!

That's massive!

Straight into the crowd!

Bowled him!

Clean hit!

Excellent timing!
Performance

Use requestAnimationFrame() for animations.

Maintain 60 FPS.

Avoid memory leaks.

Keep the game lightweight (<5 MB).

Coding Standards
Use modern ES6+ JavaScript.
Write clean, reusable, modular code.
Comment important logic.
No external frameworks.
No build tools required.
The project should run by simply opening index.html.
Final Deliverable

Produce a complete, fully playable cricket game with:

Responsive UI
Smooth animations
Attractive stadium visuals
Working scoring system
Timing-based batting mechanics
Match summary
Replay functionality
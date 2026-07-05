Additional Prompt: AAA Graphics & Real Cricket 26 Inspired Visuals

Note: Take inspiration from the production quality and presentation of commercial mobile cricket games such as Real Cricket 26, but do not copy or recreate any copyrighted assets, logos, stadiums, player likenesses, UI elements, animations, or proprietary designs. Create all graphics, models, textures, and UI from scratch with an original visual style.

Goal

Transform the game into a premium-looking cricket game with realistic 3D graphics, smooth animations, cinematic camera work, dynamic lighting, and broadcast-style presentation.

Graphics Engine

Use one of these:

Three.js (preferred)
Babylon.js
WebGL

Do not use Canvas 2D for the main gameplay.

Everything should be rendered in real-time 3D.

Visual Quality

Target console-quality visuals.

Include:

Physically Based Rendering (PBR)
HDR lighting
Soft shadows
Ambient Occlusion
Bloom
Depth of Field
Motion Blur (light)
Screen Space Reflections
Dynamic Exposure
Anti-Aliasing (MSAA/FXAA)

Aim for realistic materials.

Grass should move slightly.

Pitch should have detailed texture.

Ball should have leather stitching.

Bat should have realistic wood grain.

Stadium

Create a beautiful international stadium.

Include

3D crowd
Stadium lights
LED advertising boards
Giant replay screen
Flags
Boundary ropes
Dugout
Pavilion
Sight screen
Multiple stands
VIP boxes

Crowd should cheer dynamically.

Pitch

Create a highly realistic pitch.

Include

Pitch cracks
Dust particles
Footmarks
Grass variations
Seam marks
Shadows
Player Models

Use stylized realistic characters.

Include

Full body
Gloves
Pads
Helmet
Jersey
Shoes

Animations should include

Walking

Running

Sprint

Batting stance

Drive

Pull

Cut

Sweep

Defensive shot

Lofted shot

Celebration

Disappointment

Appeal

Bowling action

Idle breathing

Ball Physics

Implement realistic cricket physics.

Include

Swing

Seam

Spin

Bounce

Gravity

Air resistance

Realistic trajectory

Edges

Top edge

Inside edge

Outside edge

Ground friction

Rolling

Cameras

Multiple cinematic cameras.

Examples

Bowler Camera

Batsman Camera

Broadcast Camera

Drone Camera

Boundary Camera

Ultra Slow Motion Camera

Follow Camera

Crowd Camera

Replay Camera

Automatically switch cameras.

Replay System

Create replay after

Four
Six
Wicket

Replay should use

Slow motion

Multiple angles

Smooth camera interpolation

Zoom effects

UI

Modern broadcast UI.

Include

Animated scoreboard

Current over

Runs

Required rate

Run rate

Wagon wheel

Shot map

Ball speed

Shot timing meter

Mini scorecard

Commentary ticker

Player statistics

Lighting

Dynamic sunlight.

Evening mode.

Night match.

Floodlights.

Cloud shadows.

Golden hour.

Crowd

Crowd should

Wave

Stand up

Cheer

Clap

Celebrate sixes

Become silent after wickets

Randomize clothing colors.

Effects

When ball hits bat

Wood particles

Dust

Spark effect

Impact flash

Sound vibration

When six

Fireworks

Confetti

Camera shake

Crowd eruption

Commentator excitement

Audio

3D spatial sound.

Include

Crowd ambience

Bat impact

Ball bounce

Appeals

Umpire

Commentary

Stadium echo

Boundary celebration

Animations

Use smooth animation blending.

No robotic movement.

Include anticipation and follow-through.

Every animation should have natural weight.

Performance

Target

60 FPS on desktop

30–60 FPS on mid-range mobile

Use

LOD (Level of Detail)

Texture compression

Instancing

Frustum culling

Object pooling

Lazy loading

Polish

Add

Screen transitions

Animated menus

Loading screen

Match intro

Team entrance

Coin toss animation

Boundary celebrations

Dynamic weather

Day/Night cycle

Rain effect (optional)

Lens flare

Bloom

Realistic shadows

High-resolution textures (2K–4K)

Responsive UI animations

Code Quality

Organize the project into modules:

src/
 ├── engine/
 ├── renderer/
 ├── physics/
 ├── animations/
 ├── audio/
 ├── ui/
 ├── assets/
 ├── players/
 ├── stadium/
 ├── effects/
 ├── cameras/
 ├── replay/
 └── game/

Use modern ES modules, clean architecture, and reusable components.

Final Goal

The finished game should feel like a premium mobile cricket title with original assets and presentation, delivering realistic visuals, fluid gameplay, cinematic replays, and a polished broadcast experience while remaining lightweight, maintainable, and extensible.
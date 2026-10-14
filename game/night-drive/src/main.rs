use macroquad::audio::{load_sound, play_sound, PlaySoundParams, Sound};
use macroquad::prelude::*;
use macroquad::rand;

// ─── NIGHT DRIVE ─────────────────────────────────────────────────────────────
// A small synthwave arcade dodger that runs on the garage monitor (loaded from
// the floppy). Steer with ← → (or A/D), dodge the oncoming traffic, survive as
// long as you can. Speed ramps up the longer you last. High score persists
// across reloads; sound on crash / dodge / engine.
//
// Build:  ./game/build.sh     (Rust → wasm, copied into public/game/)
// Run:    insert the floppy in the 3D garage, or open /game/index.html.
// Docs:   https://macroquad.rs  ·  https://docs.rs/macroquad
// ─────────────────────────────────────────────────────────────────────────────

const W: f32 = 640.0; // the monitor is 640×360
const H: f32 = 360.0;
const ROAD_W: f32 = 340.0; // drivable width, centred
const LANES: usize = 3;
const CAR_W: f32 = 34.0;
const CAR_H: f32 = 58.0;
const HIT_PAD: f32 = 6.0; // shrink hitboxes a touch so crashes feel fair

// ── persistent high score ────────────────────────────────────────────────────
// On wasm these resolve to a tiny plugin in index.html backed by localStorage
// (numbers only — no string marshalling). On native they're no-ops so a plain
// `cargo build`/`cargo run` still links and works (score just won't persist).
#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
extern "C" {
    fn hs_load() -> f64;
    fn hs_save(v: f64);
    // pitched engine, synthesised in Web Audio (see index.html) — macroquad
    // can't re-pitch a sample, so the engine note is a JS oscillator we re-tune.
    fn engine_start();
    fn engine_stop();
    fn engine_set(freq: f64);
}
#[cfg(target_arch = "wasm32")]
fn load_best() -> f32 {
    unsafe { hs_load() as f32 }
}
#[cfg(target_arch = "wasm32")]
fn save_best(v: f32) {
    unsafe { hs_save(v as f64) }
}
#[cfg(target_arch = "wasm32")]
fn eng_start() {
    unsafe { engine_start() }
}
#[cfg(target_arch = "wasm32")]
fn eng_stop() {
    unsafe { engine_stop() }
}
#[cfg(target_arch = "wasm32")]
fn eng_set(freq: f32) {
    unsafe { engine_set(freq as f64) }
}
#[cfg(not(target_arch = "wasm32"))]
fn load_best() -> f32 {
    0.0
}
#[cfg(not(target_arch = "wasm32"))]
fn save_best(_v: f32) {}
#[cfg(not(target_arch = "wasm32"))]
fn eng_start() {}
#[cfg(not(target_arch = "wasm32"))]
fn eng_stop() {}
#[cfg(not(target_arch = "wasm32"))]
fn eng_set(_freq: f32) {}

// palette
fn night() -> Color { Color::from_rgba(12, 10, 28, 255) }
fn verge() -> Color { Color::from_rgba(20, 18, 40, 255) }
fn tarmac() -> Color { Color::from_rgba(30, 28, 46, 255) }
fn magenta() -> Color { Color::from_rgba(255, 80, 200, 255) }
fn cyan() -> Color { Color::from_rgba(80, 220, 255, 255) }

const TRAFFIC: [(u8, u8, u8); 5] = [
    (90, 150, 255),  // blue
    (120, 230, 140), // green
    (255, 190, 70),  // amber
    (210, 120, 255), // violet
    (240, 240, 250), // white
];

enum State {
    Title,
    Playing,
    Over,
}

struct Car {
    x: f32,
    y: f32,
    color: Color,
    passed: bool,
}

fn window_conf() -> Conf {
    Conf {
        window_title: "NIGHT DRIVE".to_owned(),
        window_width: W as i32,
        window_height: H as i32,
        high_dpi: true,
        ..Default::default()
    }
}

fn text_center(s: &str, y: f32, size: f32, color: Color) {
    let d = measure_text(s, None, size as u16, 1.0);
    draw_text(s, W / 2.0 - d.width / 2.0, y, size, color);
}

#[macroquad::main(window_conf)]
async fn main() {
    // sounds (relative to the page; missing files just disable that sfx). The
    // engine is NOT a sample — it's a pitched Web Audio oscillator (eng_*).
    let crash = load_sound("crash.wav").await.ok();
    let pass = load_sound("pass.wav").await.ok();
    let blowoff = load_sound("blowoff.wav").await.ok(); // turbo dump on crash
    let sfx = |s: &Option<Sound>, vol: f32| {
        if let Some(snd) = s {
            play_sound(snd, PlaySoundParams { looped: false, volume: vol });
        }
    };

    let road_x = (W - ROAD_W) / 2.0;
    let lane_w = ROAD_W / LANES as f32;
    let lane_center = |i: usize| road_x + lane_w * (i as f32 + 0.5);

    let mut state = State::Title;
    let mut car_x = W / 2.0 - CAR_W / 2.0;
    let car_y = H - CAR_H - 22.0;
    let mut scroll = 0.0f32; // centre-dash scroll
    let mut speed = 300.0f32; // world scroll speed (px/s)
    let mut dist = 0.0f32; // score
    let mut best = load_best(); // survives reloads (wasm)
    let mut traffic: Vec<Car> = Vec::new();
    let mut spawn_in = 0.0f32; // countdown to next spawn
    let mut shake = 0.0f32; // crash screen-shake

    let begin = |car_x: &mut f32, speed: &mut f32, dist: &mut f32, traffic: &mut Vec<Car>, spawn_in: &mut f32| {
        *car_x = W / 2.0 - CAR_W / 2.0;
        *speed = 300.0;
        *dist = 0.0;
        traffic.clear();
        *spawn_in = 1.2; // brief grace so the first car never spawns on top of you
    };

    loop {
        let dt = get_frame_time().min(0.05); // clamp big steps (tab-switch/lag)
        let start = is_key_pressed(KeyCode::Space)
            || is_key_pressed(KeyCode::Enter)
            || is_mouse_button_pressed(MouseButton::Left);

        match state {
            State::Title => {
                scroll = (scroll + 240.0 * dt) % 40.0;
                if start {
                    rand::srand(get_time().to_bits());
                    begin(&mut car_x, &mut speed, &mut dist, &mut traffic, &mut spawn_in);
                    eng_start();
                    state = State::Playing;
                }
            }
            State::Playing => {
                // steer
                let mut dir = 0.0;
                if is_key_down(KeyCode::Left) || is_key_down(KeyCode::A) {
                    dir -= 1.0;
                }
                if is_key_down(KeyCode::Right) || is_key_down(KeyCode::D) {
                    dir += 1.0;
                }
                car_x = (car_x + dir * 340.0 * dt)
                    .clamp(road_x + 6.0, road_x + ROAD_W - CAR_W - 6.0);

                // ramp difficulty
                speed = (speed + 7.0 * dt).min(640.0);
                eng_set(50.0 + (speed - 300.0) * 0.38); // engine note rises with speed
                dist += speed * dt / 45.0;
                if dist > best {
                    best = dist; // live best; persisted on crash
                }
                scroll = (scroll + speed * dt) % 40.0;

                // spawn oncoming cars; interval shrinks as you speed up
                spawn_in -= dt;
                if spawn_in <= 0.0 {
                    spawn_in = (330.0 / speed).clamp(0.42, 1.1);
                    let lane = rand::gen_range(0, LANES as i32) as usize;
                    let (r, g, b) = TRAFFIC[rand::gen_range(0, TRAFFIC.len() as i32) as usize];
                    traffic.push(Car {
                        x: lane_center(lane) - CAR_W / 2.0,
                        y: -CAR_H,
                        color: Color::from_rgba(r, g, b, 255),
                        passed: false,
                    });
                }
                for c in &mut traffic {
                    c.y += speed * dt;
                    // dodged: fully past the player without a crash → whoosh
                    if !c.passed && c.y > car_y + CAR_H {
                        c.passed = true;
                        sfx(&pass, 0.25);
                    }
                }
                traffic.retain(|c| c.y < H + CAR_H);

                // collision (padded hitboxes)
                let pr = Rect::new(car_x + HIT_PAD, car_y + HIT_PAD, CAR_W - 2.0 * HIT_PAD, CAR_H - 2.0 * HIT_PAD);
                if traffic.iter().any(|c| {
                    pr.overlaps(&Rect::new(c.x + HIT_PAD, c.y + HIT_PAD, CAR_W - 2.0 * HIT_PAD, CAR_H - 2.0 * HIT_PAD))
                }) {
                    eng_stop();
                    sfx(&crash, 0.6);
                    sfx(&blowoff, 0.5); // turbo dumps as the throttle cuts — pshh
                    save_best(best);
                    shake = 1.0;
                    state = State::Over;
                }
            }
            State::Over => {
                if shake > 0.0 {
                    shake = (shake - dt * 3.0).max(0.0);
                }
                if start {
                    begin(&mut car_x, &mut speed, &mut dist, &mut traffic, &mut spawn_in);
                    eng_start();
                    state = State::Playing;
                }
            }
        }

        // ── draw ─────────────────────────────────────────────────────────────
        clear_background(night());
        let (ox, oy) = if shake > 0.0 {
            (rand::gen_range(-1.0, 1.0) * shake * 6.0, rand::gen_range(-1.0, 1.0) * shake * 6.0)
        } else {
            (0.0, 0.0)
        };

        // verges + road
        draw_rectangle(ox, oy, road_x, H, verge());
        draw_rectangle(road_x + ROAD_W + ox, oy, W - road_x - ROAD_W, H, verge());
        draw_rectangle(road_x + ox, oy, ROAD_W, H, tarmac());
        // neon edges
        draw_rectangle(road_x + ox, oy, 4.0, H, magenta());
        draw_rectangle(road_x + ROAD_W - 4.0 + ox, oy, 4.0, H, cyan());
        // lane dashes (between lanes)
        for l in 1..LANES {
            let lx = road_x + lane_w * l as f32;
            let mut y = -40.0 + scroll;
            while y < H {
                draw_rectangle(lx - 2.0 + ox, y + oy, 4.0, 20.0, Color::from_rgba(200, 200, 230, 120));
                y += 40.0;
            }
        }
        // centre dash accent
        let mut y = -40.0 + scroll;
        while y < H {
            draw_rectangle(W / 2.0 - 3.0 + ox, y + oy, 6.0, 22.0, Color::from_rgba(235, 235, 255, 150));
            y += 40.0;
        }

        // traffic (oncoming — taillights toward us at their bottom)
        for c in &traffic {
            draw_rectangle(c.x + ox, c.y + oy, CAR_W, CAR_H, c.color);
            draw_rectangle(c.x + 5.0 + ox, c.y + 30.0 + oy, CAR_W - 10.0, 16.0, Color::from_rgba(0, 0, 0, 90));
            draw_rectangle(c.x + 4.0 + ox, c.y + CAR_H - 6.0 + oy, 7.0, 4.0, RED);
            draw_rectangle(c.x + CAR_W - 11.0 + ox, c.y + CAR_H - 6.0 + oy, 7.0, 4.0, RED);
        }

        // player car (title shows a hero car centred instead)
        if !matches!(state, State::Title) {
            draw_player(car_x + ox, car_y + oy);
        }

        // ── overlays / HUD ────────────────────────────────────────────────────
        match state {
            State::Title => {
                draw_player(W / 2.0 - CAR_W / 2.0, car_y);
                draw_dim();
                text_center("NIGHT DRIVE", 118.0, 46.0, magenta());
                text_center("dodge the traffic", 148.0, 20.0, cyan());
                text_center("<-  ->  steer", 196.0, 22.0, WHITE);
                if best > 0.0 {
                    text_center(&format!("best  {:.0}", best), 222.0, 18.0, Color::from_rgba(150, 150, 180, 255));
                }
                blink("PRESS SPACE / CLICK TO START", 252.0, 20.0, Color::from_rgba(255, 235, 120, 255));
            }
            State::Playing => hud(dist, best, speed),
            State::Over => {
                hud(dist, best, speed);
                draw_dim();
                text_center("CRASHED", 128.0, 46.0, Color::from_rgba(255, 80, 90, 255));
                text_center(&format!("distance  {:.0}", dist), 168.0, 24.0, WHITE);
                text_center(&format!("best  {:.0}", best), 196.0, 20.0, cyan());
                blink("PRESS SPACE / CLICK TO RETRY", 238.0, 20.0, Color::from_rgba(255, 235, 120, 255));
            }
        }

        next_frame().await
    }
}

fn draw_player(x: f32, y: f32) {
    draw_circle(x + 8.0, y + 2.0, 10.0, Color::from_rgba(255, 245, 180, 40));
    draw_circle(x + CAR_W - 8.0, y + 2.0, 10.0, Color::from_rgba(255, 245, 180, 40));
    draw_rectangle(x, y, CAR_W, CAR_H, Color::from_rgba(255, 70, 90, 255));
    draw_rectangle(x + 5.0, y + 10.0, CAR_W - 10.0, 16.0, Color::from_rgba(120, 220, 255, 255));
    draw_rectangle(x + 4.0, y + 2.0, 7.0, 4.0, Color::from_rgba(255, 245, 180, 255));
    draw_rectangle(x + CAR_W - 11.0, y + 2.0, 7.0, 4.0, Color::from_rgba(255, 245, 180, 255));
}

fn hud(dist: f32, best: f32, speed: f32) {
    draw_text(&format!("{:.0} m", dist), 12.0, 26.0, 26.0, WHITE);
    draw_text(&format!("best {:.0}", best), 12.0, 46.0, 16.0, Color::from_rgba(150, 150, 180, 255));
    let kmh = format!("{:.0} km/h", speed / 3.2);
    let d = measure_text(&kmh, None, 18, 1.0);
    draw_text(&kmh, W - d.width - 12.0, 24.0, 18.0, Color::from_rgba(120, 220, 255, 255));
}

fn draw_dim() {
    draw_rectangle(0.0, 0.0, W, H, Color::from_rgba(8, 6, 20, 150));
}

fn blink(s: &str, y: f32, size: f32, color: Color) {
    if (get_time() * 2.0) as i64 % 2 == 0 {
        text_center(s, y, size, color);
    }
}

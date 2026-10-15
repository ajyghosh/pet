//! Pure input routing for the macOS click-through overlay. No keyboard events.
use std::time::{Duration, Instant};

pub const FRAME_TIMEOUT: Duration = Duration::from_millis(250);
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Button {
    Left,
    Right,
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ClickAction {
    Happy,
    Jump,
    Settings,
}
#[derive(Default)]
pub struct HitState {
    pub x: f64,
    pub y: f64,
    pub side: f64,
    pub grid: u32,
    pub rows: Vec<[i32; 3]>,
    pub updated: Option<Instant>,
    pub visible: bool,
    left: bool,
    right: bool,
}
impl HitState {
    pub fn contains(&self, x: f64, y: f64, now: Instant) -> bool {
        if !self.visible
            || self.side <= 0.0
            || ![32, 64].contains(&self.grid)
            || self
                .updated
                .is_none_or(|t| now.saturating_duration_since(t) > FRAME_TIMEOUT)
        {
            return false;
        }
        let px = (x - self.x) * self.grid as f64 / self.side;
        let py = (y - self.y) * self.grid as f64 / self.side;
        if !(0.0..self.grid as f64).contains(&px) || !(0.0..self.grid as f64).contains(&py) {
            return false;
        }
        self.rows.iter().any(|[left, row, width]| {
            py.floor() == *row as f64 && px >= *left as f64 && px < (left + width) as f64
        })
    }
    pub fn clear(&mut self) {
        self.visible = false;
        self.left = false;
        self.right = false;
    }
    /// Capture only a press that began on an opaque pixel; pair its release even if the pointer leaves.
    /// A stale/hidden pet always fails open, including any interrupted click sequence.
    pub fn route(
        &mut self,
        button: Button,
        down: bool,
        point: (f64, f64),
        clicks: i64,
        now: Instant,
    ) -> (bool, Option<ClickAction>) {
        if !self.visible
            || self
                .updated
                .is_none_or(|t| now.saturating_duration_since(t) > FRAME_TIMEOUT)
        {
            self.clear();
            return (false, None);
        }
        let hit = self.contains(point.0, point.1, now);
        let pressed = match button {
            Button::Left => &mut self.left,
            Button::Right => &mut self.right,
        };
        if down {
            *pressed = hit;
            return (hit, None);
        }
        let owned = std::mem::take(pressed);
        let action = if owned && hit {
            Some(match button {
                Button::Right => ClickAction::Settings,
                Button::Left if clicks >= 2 => ClickAction::Jump,
                _ => ClickAction::Happy,
            })
        } else {
            None
        };
        (owned, action)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn sample(now: Instant) -> HitState {
        HitState {
            x: -100.0,
            y: 20.0,
            side: 128.0,
            grid: 32,
            rows: vec![[8, 8, 16]],
            updated: Some(now),
            visible: true,
            ..Default::default()
        }
    }
    #[test]
    fn high_resolution_sprites_keep_exact_pixel_boundaries() {
        let now = Instant::now();
        let mut state = sample(now);
        state.grid = 64;
        state.rows = vec![[16, 16, 32]];
        assert!(state.contains(-67.0, 53.0, now));
        assert!(!state.contains(-69.0, 53.0, now));
        assert!(!state.contains(-67.0, 55.0, now));
        state.grid = 0;
        assert!(!state.contains(-67.0, 53.0, now));
    }
    #[test]
    fn transparent_pixels_and_negative_screen_coordinates() {
        let now = Instant::now();
        let s = sample(now);
        assert!(s.contains(-68.0, 52.0, now));
        assert!(!s.contains(-69.0, 52.0, now));
        assert!(!s.contains(-4.0, 52.0, now));
        assert!(!s.contains(-68.0, 56.0, now));
        assert!(!s.contains(f64::NAN, 52.0, now));
    }
    #[test]
    fn unrelated_drags_and_release_never_become_pet_clicks() {
        let now = Instant::now();
        let mut s = sample(now);
        assert_eq!(
            s.route(Button::Left, true, (0.0, 0.0), 1, now),
            (false, None)
        );
        assert_eq!(
            s.route(Button::Left, false, (-60.0, 52.0), 1, now),
            (false, None)
        );
        assert_eq!(
            s.route(Button::Left, true, (-60.0, 52.0), 1, now),
            (true, None)
        );
        assert_eq!(
            s.route(Button::Left, false, (0.0, 0.0), 1, now),
            (true, None)
        );
    }
    #[test]
    fn double_click_right_click_and_stale_frames() {
        let now = Instant::now();
        let mut s = sample(now);
        let p = (-60.0, 52.0);
        s.route(Button::Left, true, p, 2, now);
        assert_eq!(
            s.route(Button::Left, false, p, 2, now),
            (true, Some(ClickAction::Jump))
        );
        s.route(Button::Right, true, p, 1, now);
        assert_eq!(
            s.route(Button::Right, false, p, 1, now),
            (true, Some(ClickAction::Settings))
        );
        assert!(!s.contains(p.0, p.1, now + Duration::from_secs(1)));
        assert_eq!(
            s.route(Button::Left, true, p, 1, now + Duration::from_secs(1)),
            (false, None)
        );
    }
}

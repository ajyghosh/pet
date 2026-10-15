use serde::{Deserialize, Serialize};
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
pub struct Rect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Display {
    pub id: String,
    pub name: String,
    pub primary: bool,
    pub scale: f64,
    // Windows desktop coordinates are physical pixels; AppKit uses global points.
    pub coordinate_scale: f64,
    pub bounds: Rect,
    pub work: Rect,
    pub taskbar: String,
    pub auto_hide: bool,
}
pub fn placement(display: &Display, x: f64, size: u32, lift: f64) -> (i32, i32, i32) {
    let side = (size as f64 * display.coordinate_scale).round() as i32;
    let gap = (4.0 * display.coordinate_scale).round() as i32;
    let left = display.work.left + (x * display.coordinate_scale).round() as i32;
    let left = left.clamp(
        display.work.left,
        (display.work.right - side).max(display.work.left),
    );
    let top = (display.work.bottom
        - gap
        - side
        - (lift.clamp(0.0, 80.0) * display.coordinate_scale).round() as i32)
        .max(display.work.top);
    (left, top, side)
}
#[cfg(any(target_os = "macos", test))]
pub fn cocoa_rect(x: f64, y: f64, width: f64, height: f64, primary_height: f64) -> Rect {
    Rect {
        left: x.round() as i32,
        top: (primary_height - y - height).round() as i32,
        right: (x + width).round() as i32,
        bottom: (primary_height - y).round() as i32,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn negative_monitor_coordinates_and_dpi() {
        let d = Display {
            id: "x".into(),
            name: "x".into(),
            primary: false,
            scale: 1.5,
            coordinate_scale: 1.5,
            bounds: Rect {
                left: -1920,
                top: 0,
                right: 0,
                bottom: 1080,
            },
            work: Rect {
                left: -1920,
                top: 0,
                right: 0,
                bottom: 1020,
            },
            taskbar: "bottom".into(),
            auto_hide: false,
        };
        assert_eq!(placement(&d, 0.0, 128, 0.0), (-1920, 822, 192));
        assert_eq!(placement(&d, 9000.0, 128, 0.0).0, -192);
        assert_eq!(placement(&d, -10.0, 128, 0.0).0, -1920);
    }
    #[test]
    fn mac_screens_use_points_even_on_retina_and_above_primary() {
        let work = cocoa_rect(-1440.0, 900.0, 1440.0, 850.0, 900.0);
        assert_eq!((work.left, work.top, work.bottom), (-1440, -850, 0));
        let d = Display {
            id: "mac-2".into(),
            name: "Retina".into(),
            primary: false,
            scale: 2.0,
            coordinate_scale: 1.0,
            bounds: work,
            work,
            taskbar: "bottom".into(),
            auto_hide: false,
        };
        assert_eq!(placement(&d, 100.0, 128, 0.0), (-1340, -132, 128));
    }
}

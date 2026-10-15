//! AppKit geometry and a mouse-only CoreGraphics filter. Both webview overlays
//! always ignore mouse events; transparent pixels cannot become an input blocker.
use super::Display;
use crate::{
    geometry::Rect,
    hit_test::{Button, ClickAction, HitState},
};
use core_foundation::{
    base::TCFType,
    boolean::CFBoolean,
    dictionary::{CFDictionary, CFDictionaryRef},
    runloop::{kCFRunLoopDefaultMode, CFRunLoop},
    string::CFString,
};
use core_graphics::event::{
    CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
    CallbackResult, EventField,
};
use objc2::MainThreadMarker;
use objc2_app_kit::{NSColor, NSEvent, NSScreen, NSWindow, NSWindowCollectionBehavior};
use objc2_foundation::{ns_string, NSNumber, NSPoint, NSRect, NSSize, NSString, NSUserDefaults};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Mutex, OnceLock,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager};

static HIT: OnceLock<Mutex<HitState>> = OnceLock::new();
static TAP_ACTIVE: AtomicBool = AtomicBool::new(false);
static STARTED: AtomicBool = AtomicBool::new(false);
fn hit() -> &'static Mutex<HitState> {
    HIT.get_or_init(|| Mutex::new(HitState::default()))
}

#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(options: CFDictionaryRef) -> bool;
}

fn on_main<T: Send + 'static>(
    app: &tauri::AppHandle,
    f: impl FnOnce(MainThreadMarker) -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    if let Some(mtm) = MainThreadMarker::new() {
        return f(mtm);
    }
    let (tx, rx) = mpsc::sync_channel(1);
    app.run_on_main_thread(move || {
        let result = MainThreadMarker::new()
            .ok_or_else(|| "AppKit requires the main thread".to_owned())
            .and_then(f);
        let _ = tx.send(result);
    })
    .map_err(|e| e.to_string())?;
    rx.recv().map_err(|e| e.to_string())?
}

fn primary_height(mtm: MainThreadMarker) -> Result<f64, String> {
    NSScreen::screens(mtm)
        .firstObject()
        .map(|s| s.frame().size.height)
        .ok_or_else(|| "No macOS screens available".into())
}
fn top_left(r: NSRect, primary_height: f64) -> Rect {
    crate::geometry::cocoa_rect(
        r.origin.x,
        r.origin.y,
        r.size.width,
        r.size.height,
        primary_height,
    )
}
pub fn displays(app: &tauri::AppHandle) -> Result<Vec<Display>, String> {
    on_main(app, |mtm| {
        let screens = NSScreen::screens(mtm);
        let primary_height = primary_height(mtm)?;
        let dock = NSUserDefaults::standardUserDefaults()
            .persistentDomainForName(ns_string!("com.apple.dock"));
        let auto_hide = dock
            .as_ref()
            .and_then(|d| d.objectForKey(ns_string!("autohide")))
            .and_then(|n| n.downcast::<NSNumber>().ok())
            .is_some_and(|n| n.boolValue());
        let orientation = dock
            .as_ref()
            .and_then(|d| d.objectForKey(ns_string!("orientation")))
            .and_then(|s| s.downcast::<NSString>().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "bottom".into());
        let mut result = Vec::new();
        for (index, screen) in screens.iter().enumerate() {
            let id = screen
                .deviceDescription()
                .objectForKey(ns_string!("NSScreenNumber"))
                .and_then(|n| n.downcast::<NSNumber>().ok())
                .ok_or("Screen identifier is missing")?
                .unsignedIntValue();
            let bounds = top_left(screen.frame(), primary_height);
            let mut work = top_left(screen.visibleFrame(), primary_height);
            let taskbar = if work.left - bounds.left > 4 {
                "left"
            } else if bounds.right - work.right > 4 {
                "right"
            } else if bounds.bottom - work.bottom > 4 {
                "bottom"
            } else if auto_hide {
                &orientation
            } else {
                "none"
            }
            .to_owned();
            if auto_hide {
                match orientation.as_str() {
                    "left" => work.left = work.left.max(bounds.left + 8),
                    "right" => work.right = work.right.min(bounds.right - 8),
                    _ => work.bottom = work.bottom.min(bounds.bottom - 8),
                }
            }
            result.push(Display {
                id: format!("mac-{id}"),
                name: screen.localizedName().to_string(),
                primary: index == 0,
                scale: screen.backingScaleFactor(),
                coordinate_scale: 1.0,
                bounds,
                work,
                taskbar,
                auto_hide,
            });
        }
        Ok(result)
    })
}
pub fn position(
    window: &tauri::WebviewWindow,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<bool, String> {
    let app = window.app_handle().clone();
    let window = window.clone();
    on_main(&app, move |mtm| {
        // AppKit global coordinates are points with a bottom-left origin. Never multiply
        // a global point by the selected display's Retina scale (mixed-DPI layouts break).
        let ns = unsafe {
            &*window
                .ns_window()
                .map_err(|e| e.to_string())?
                .cast::<NSWindow>()
        };
        let previous = ns.frame();
        let frame = NSRect::new(
            NSPoint::new(x as f64, primary_height(mtm)? - y as f64 - height as f64),
            NSSize::new(width as f64, height as f64),
        );
        if previous != frame {
            ns.setFrame_display(frame, true);
        }
        Ok(previous.size != frame.size)
    })
}
pub fn clear_input() {
    if let Ok(mut state) = hit().lock() {
        state.clear();
    }
}
pub fn sync_input(
    window: &tauri::WebviewWindow,
    x: i32,
    y: i32,
    side: i32,
    rows: &[[i32; 3]],
    visible: bool,
    grid: u32,
) -> Result<Option<bool>, String> {
    let app = window.app_handle().clone();
    let window = window.clone();
    let rows = rows.to_vec();
    on_main(&app, move |mtm| {
        let ns = unsafe {
            &*window
                .ns_window()
                .map_err(|e| e.to_string())?
                .cast::<NSWindow>()
        };
        let mouse = NSEvent::mouseLocation();
        let now = Instant::now();
        let mut state = hit().lock().map_err(|e| e.to_string())?;
        state.x = x as f64;
        state.y = y as f64;
        state.side = side as f64;
        state.rows = rows;
        state.grid = grid;
        state.visible = visible && ns.isVisible() && ns.isOnActiveSpace();
        state.updated = Some(now);
        Ok(Some(state.contains(
            mouse.x,
            primary_height(mtm)? - mouse.y,
            now,
        )))
    })
}
pub fn input_status() -> bool {
    TAP_ACTIVE.load(Ordering::Relaxed) && unsafe { AXIsProcessTrusted() }
}
/// Only called by an explicit settings button. Launching the app never prompts.
pub fn request_input_permission() -> bool {
    let options = CFDictionary::from_CFType_pairs(&[(
        CFString::new("AXTrustedCheckOptionPrompt"),
        CFBoolean::true_value(),
    )]);
    unsafe { AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef()) }
}

pub fn initialize(app: &tauri::AppHandle) -> Result<(), String> {
    for label in ["pet", "bubble"] {
        let window = app
            .get_webview_window(label)
            .ok_or("Overlay window missing")?;
        window
            .set_ignore_cursor_events(true)
            .map_err(|e| e.to_string())?;
        on_main(app, move |_| {
            let ns = unsafe {
                &*window
                    .ns_window()
                    .map_err(|e| e.to_string())?
                    .cast::<NSWindow>()
            };
            ns.setOpaque(false);
            ns.setBackgroundColor(Some(&NSColor::clearColor()));
            ns.setHasShadow(false);
            ns.setIgnoresMouseEvents(true);
            ns.setHidesOnDeactivate(false);
            ns.setCollectionBehavior(
                NSWindowCollectionBehavior::CanJoinAllSpaces
                    | NSWindowCollectionBehavior::FullScreenAuxiliary,
            );
            Ok(())
        })?;
    }
    if STARTED.swap(true, Ordering::Relaxed) {
        return Ok(());
    }
    let (tx, rx) = mpsc::sync_channel(32);
    let app = app.clone();
    std::thread::spawn(move || {
        while let Ok(action) = rx.recv() {
            match action {
                ClickAction::Settings => crate::show_settings(&app),
                ClickAction::Happy => {
                    let _ = app.emit_to("pet", "pet-action", "happy");
                }
                ClickAction::Jump => {
                    let _ = app.emit_to("pet", "pet-action", "jumping");
                }
            }
        }
    });
    std::thread::spawn(move || loop {
        TAP_ACTIVE.store(false, Ordering::Relaxed);
        if !unsafe { AXIsProcessTrusted() } {
            std::thread::sleep(Duration::from_secs(1));
            continue;
        }
        let sender = tx.clone();
        let tap = CGEventTap::new(
            CGEventTapLocation::Session,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::Default,
            vec![
                CGEventType::LeftMouseDown,
                CGEventType::LeftMouseUp,
                CGEventType::RightMouseDown,
                CGEventType::RightMouseUp,
            ],
            move |_, kind, event| {
                let (button, down) = match kind {
                    CGEventType::LeftMouseDown => (Button::Left, true),
                    CGEventType::LeftMouseUp => (Button::Left, false),
                    CGEventType::RightMouseDown => (Button::Right, true),
                    CGEventType::RightMouseUp => (Button::Right, false),
                    _ => {
                        TAP_ACTIVE.store(false, Ordering::Relaxed);
                        if let Ok(mut state) = hit().try_lock() {
                            state.clear();
                        }
                        return CallbackResult::Keep;
                    }
                };
                // Never wait in the OS callback; contention, missing frames and hidden pets pass through.
                let Ok(mut state) = hit().try_lock() else {
                    return CallbackResult::Keep;
                };
                let p = event.location();
                let (consume, action) = state.route(
                    button,
                    down,
                    (p.x, p.y),
                    event.get_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE),
                    Instant::now(),
                );
                if let Some(action) = action {
                    let _ = sender.try_send(action);
                }
                if consume {
                    CallbackResult::Drop
                } else {
                    CallbackResult::Keep
                }
            },
        );
        let Ok(tap) = tap else {
            std::thread::sleep(Duration::from_secs(1));
            continue;
        };
        let Ok(source) = tap.mach_port().create_runloop_source(0) else {
            std::thread::sleep(Duration::from_secs(1));
            continue;
        };
        let runloop = CFRunLoop::get_current();
        runloop.add_source(&source, unsafe { kCFRunLoopDefaultMode });
        while unsafe { AXIsProcessTrusted() } {
            tap.enable();
            TAP_ACTIVE.store(true, Ordering::Relaxed);
            CFRunLoop::run_in_mode(
                unsafe { kCFRunLoopDefaultMode },
                Duration::from_millis(500),
                false,
            );
        }
        clear_input();
        runloop.remove_source(&source, unsafe { kCFRunLoopDefaultMode });
    });
    Ok(())
}

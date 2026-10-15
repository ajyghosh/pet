mod geometry;
mod platform;
mod settings;

use geometry::Display;
use settings::Settings;
use std::{
    path::PathBuf,
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{
    Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_plugin_autostart::ManagerExt;

struct DesktopState {
    settings: Settings,
    warning: Option<String>,
    path: PathBuf,
    displays: Vec<Display>,
    refreshed: Instant,
    hidden: bool,
    shape: Vec<[i32; 3]>,
    side: i32,
    message: Option<String>,
}
type Shared = Mutex<DesktopState>;
fn allowed(window: &WebviewWindow, labels: &[&str]) -> Result<(), String> {
    if labels.contains(&window.label()) {
        Ok(())
    } else {
        Err("This window cannot perform that action".into())
    }
}
fn show_settings(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
#[derive(serde::Serialize)]
struct Bootstrap {
    settings: Settings,
    warning: Option<String>,
}
#[tauri::command]
fn bootstrap(
    window: WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<Shared>,
) -> Result<Bootstrap, String> {
    allowed(&window, &["settings", "pet"])?;
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.settings.autostart = app.autolaunch().is_enabled().map_err(|e| e.to_string())?;
    Ok(Bootstrap {
        settings: s.settings.clone(),
        warning: s.warning.clone(),
    })
}
#[tauri::command]
fn save_settings(
    window: WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<Shared>,
    settings: Settings,
) -> Result<Settings, String> {
    allowed(&window, &["settings"])?;
    settings.validate()?;
    let mut s = state.lock().map_err(|e| e.to_string())?;
    let manager = app.autolaunch();
    let previous = manager.is_enabled().map_err(|e| e.to_string())?;
    if settings.autostart != previous {
        if settings.autostart {
            manager.enable()
        } else {
            manager.disable()
        }
        .map_err(|e| e.to_string())?;
    }
    if let Err(e) = settings::save(&s.path, &settings) {
        let rollback = if previous {
            manager.enable()
        } else {
            manager.disable()
        };
        return Err(format!(
            "Could not save settings: {e}. Startup rollback: {rollback:?}"
        ));
    }
    s.settings = settings.clone();
    s.warning = None;
    app.emit("settings-changed", &settings)
        .map_err(|e| e.to_string())?;
    Ok(settings)
}
#[tauri::command]
fn list_monitors(
    window: WebviewWindow,
    state: tauri::State<Shared>,
) -> Result<Vec<Display>, String> {
    allowed(&window, &["pet", "settings"])?;
    let displays = platform::displays()?;
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.displays = displays.clone();
    s.refreshed = Instant::now();
    Ok(displays)
}
#[derive(serde::Deserialize)]
struct Frame {
    x: f64,
    lift: f64,
    rows: Vec<[i32; 3]>,
    message: Option<String>,
}
#[tauri::command]
fn present_frame(
    window: WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<Shared>,
    frame: Frame,
) -> Result<(), String> {
    allowed(&window, &["pet"])?;
    if !frame.x.is_finite()
        || !frame.lift.is_finite()
        || frame.x.abs() > 100000.0
        || frame.rows.is_empty()
        || frame.rows.len() > 1024
        || frame.rows.iter().any(|[x, y, w]| {
            *x < 0 || *x >= 32 || *y < 0 || *y >= 32 || *w <= 0 || *w > 32 || x + w > 32
        })
    {
        return Err("Invalid sprite frame".into());
    }
    if frame
        .message
        .as_ref()
        .is_some_and(|m| m.chars().count() > 160)
    {
        return Err("Speech bubble is too long".into());
    }
    let mut s = state.lock().map_err(|e| e.to_string())?;
    if s.refreshed.elapsed() > Duration::from_secs(2) {
        s.displays = platform::displays()?;
        s.refreshed = Instant::now();
    }
    let display = s
        .displays
        .iter()
        .find(|d| d.id == s.settings.monitor)
        .or_else(|| s.displays.iter().find(|d| d.primary))
        .or_else(|| s.displays.first())
        .ok_or("No monitors available")?
        .clone();
    let (x, y, side) = geometry::placement(&display, frame.x, s.settings.size, frame.lift);
    // Move first: WM_DPICHANGED can resize a window when changing monitors.
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    let desired_size = PhysicalSize::new(side as u32, side as u32);
    let resized = window.inner_size().map_err(|e| e.to_string())? != desired_size;
    if resized {
        window.set_size(desired_size).map_err(|e| e.to_string())?;
    }
    // A region is applied BEFORE a hidden pet is shown; no rectangular input blocker at startup.
    if s.shape != frame.rows || s.side != side || resized {
        platform::shape(&window, &frame.rows, side)?;
        s.shape = frame.rows;
        s.side = side;
    }
    if !s.hidden && !window.is_visible().map_err(|e| e.to_string())? {
        window.show().map_err(|e| e.to_string())?;
    }
    let bubble = app
        .get_webview_window("bubble")
        .ok_or("Bubble window missing")?;
    let message = if s.settings.bubbles && !s.hidden {
        frame.message
    } else {
        None
    };
    if message != s.message {
        s.message = message.clone();
        app.emit_to("bubble", "bubble-message", &message)
            .map_err(|e| e.to_string())?;
    }
    if message.is_some() {
        let bw = (280.0 * display.scale).round() as i32;
        let bh = (104.0 * display.scale).round() as i32;
        let bx = (x + side / 2 - bw / 2).clamp(
            display.work.left,
            (display.work.right - bw).max(display.work.left),
        );
        bubble
            .set_position(PhysicalPosition::new(bx, (y - bh).max(display.work.top)))
            .map_err(|e| e.to_string())?;
        let bubble_size = PhysicalSize::new(bw as u32, bh as u32);
        if bubble.inner_size().map_err(|e| e.to_string())? != bubble_size {
            bubble.set_size(bubble_size).map_err(|e| e.to_string())?;
        }
        if !bubble.is_visible().map_err(|e| e.to_string())? {
            bubble.show().map_err(|e| e.to_string())?;
        }
    } else if bubble.is_visible().map_err(|e| e.to_string())? {
        bubble.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn bubble_message(
    window: WebviewWindow,
    state: tauri::State<Shared>,
) -> Result<Option<String>, String> {
    allowed(&window, &["bubble"])?;
    Ok(state.lock().map_err(|e| e.to_string())?.message.clone())
}
#[tauri::command]
fn pet_action(window: WebviewWindow, app: tauri::AppHandle, action: String) -> Result<(), String> {
    allowed(&window, &["settings", "pet"])?;
    if ![
        "idle",
        "walking",
        "sleeping",
        "jumping",
        "happy",
        "snooze",
        "wake",
        "reminder:water",
        "reminder:stretch",
        "reminder:break",
    ]
    .contains(&action.as_str())
    {
        return Err("Unknown pet action".into());
    }
    app.emit_to("pet", "pet-action", action)
        .map_err(|e| e.to_string())
}
#[tauri::command]
fn open_settings(window: WebviewWindow, app: tauri::AppHandle) -> Result<(), String> {
    allowed(&window, &["pet"])?;
    show_settings(&app);
    Ok(())
}
#[tauri::command]
fn report_pet_error(
    window: WebviewWindow,
    app: tauri::AppHandle,
    message: String,
) -> Result<(), String> {
    allowed(&window, &["pet"])?;
    window.hide().map_err(|e| e.to_string())?;
    if let Some(bubble) = app.get_webview_window("bubble") {
        let _ = bubble.hide();
    }
    app.state::<Shared>()
        .lock()
        .map_err(|e| e.to_string())?
        .warning = Some(message.chars().take(500).collect());
    let _ = app.emit_to("settings", "native-error", message);
    show_settings(&app);
    Ok(())
}
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            show_settings(app)
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("Miso")
                .args(["--autostart"])
                .build(),
        )
        .setup(|app| {
            let path = app.path().app_config_dir()?.join("settings.json");
            let first_run = !path.exists();
            let (settings, mut warning) = match settings::load(&path) {
                Ok(s) => (s, None),
                Err(e) => (
                    Settings::default(),
                    Some(format!(
                        "{e}. Original file preserved; saving will replace it."
                    )),
                ),
            };
            if first_run {
                if let Err(error) = settings::save(&path, &settings) {
                    warning = Some(format!("Could not create local settings: {error}"));
                }
            }
            let show_on_start =
                warning.is_some() || (first_run && !std::env::args().any(|a| a == "--autostart"));
            let displays = platform::displays().unwrap_or_default();
            app.manage(Mutex::new(DesktopState {
                settings,
                warning,
                path,
                displays,
                refreshed: Instant::now(),
                hidden: false,
                shape: vec![],
                side: 0,
                message: None,
            }));
            WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
                .title("Miso · a little company")
                .inner_size(1080.0, 780.0)
                .min_inner_size(760.0, 600.0)
                .center()
                .visible(show_on_start)
                .build()?;
            WebviewWindowBuilder::new(app, "pet", WebviewUrl::App("index.html?window=pet".into()))
                .title("Miso")
                .inner_size(128.0, 128.0)
                .decorations(false)
                .transparent(true)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .focused(false)
                .focusable(false)
                .visible(false)
                .build()?;
            let bubble = WebviewWindowBuilder::new(
                app,
                "bubble",
                WebviewUrl::App("index.html?window=bubble".into()),
            )
            .title("Miso says")
            .inner_size(280.0, 104.0)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .focused(false)
            .focusable(false)
            .visible(false)
            .build()?;
            bubble.set_ignore_cursor_events(true)?;
            use tauri::{
                menu::{Menu, MenuItem, PredefinedMenuItem},
                tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
            };
            let settings_item =
                MenuItem::with_id(app, "settings", "Open Miso settings", true, None::<&str>)?;
            let visible = MenuItem::with_id(app, "visible", "Hide / show pet", true, None::<&str>)?;
            let sleep = MenuItem::with_id(app, "sleeping", "Let Miso sleep", true, None::<&str>)?;
            let wake = MenuItem::with_id(app, "wake", "Wake Miso", true, None::<&str>)?;
            let snooze = MenuItem::with_id(
                app,
                "snooze",
                "Snooze reminders for 15 minutes",
                true,
                None::<&str>,
            )?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Miso", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &settings_item,
                    &visible,
                    &sleep,
                    &wake,
                    &snooze,
                    &separator,
                    &quit,
                ],
            )?;
            TrayIconBuilder::new()
                .icon(tauri::image::Image::from_bytes(include_bytes!(
                    "../icons/32x32.png"
                ))?)
                .tooltip("Miso · a little company")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "settings" => show_settings(app),
                    "quit" => app.exit(0),
                    "visible" => {
                        let state = app.state::<Shared>();
                        if let Ok(mut s) = state.lock() {
                            s.hidden = !s.hidden;
                            if s.hidden {
                                for label in ["pet", "bubble"] {
                                    if let Some(w) = app.get_webview_window(label) {
                                        let _ = w.hide();
                                    }
                                }
                            }
                        };
                    }
                    action => {
                        let _ = app.emit_to("pet", "pet-action", action);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                    ) {
                        show_settings(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "settings" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            bootstrap,
            save_settings,
            list_monitors,
            present_frame,
            bubble_message,
            pet_action,
            open_settings,
            report_pet_error
        ])
        .run(tauri::generate_context!())
        .expect("Miso could not start");
}

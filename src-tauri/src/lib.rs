mod geometry;
#[cfg(any(target_os = "macos", test))]
mod hit_test;
mod platform;
mod settings;

use geometry::Display;
use settings::Settings;
use std::{
    path::PathBuf,
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_autostart::ManagerExt;

struct DesktopState {
    settings: Settings,
    warning: Option<String>,
    path: PathBuf,
    displays: Vec<Display>,
    refreshed: Instant,
    hidden: bool,
    shape: Vec<[i32; 3]>,
    grid: u32,
    side: i32,
    message: Option<String>,
    started: Instant,
    last_frame: Option<Instant>,
    pet_error: Option<String>,
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
#[serde(rename_all = "camelCase")]
struct Bootstrap {
    platform: &'static str,
    click_enabled: bool,
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
        platform: std::env::consts::OS,
        click_enabled: platform::input_status(),
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
    let displays = platform::displays(window.app_handle())?;
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
    grid: u32,
    message: Option<String>,
}
#[tauri::command]
fn present_frame(
    window: WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<Shared>,
    frame: Frame,
) -> Result<Option<bool>, String> {
    allowed(&window, &["pet"])?;
    if !frame.x.is_finite()
        || !frame.lift.is_finite()
        || frame.x.abs() > 100000.0
        || ![32, 64].contains(&frame.grid)
        || frame.rows.is_empty()
        || frame.rows.len() > 1024
        || frame.rows.iter().any(|[x, y, w]| {
            *x < 0
                || *x >= frame.grid as i32
                || *y < 0
                || *y >= frame.grid as i32
                || *w <= 0
                || *w > frame.grid as i32
                || x + w > frame.grid as i32
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
        s.displays = platform::displays(&app)?;
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
    let (left, right) = geometry::walking_bounds(&display, &s.settings);
    let (x, y, side) = geometry::placement(
        &display,
        frame.x.clamp(left, right),
        s.settings.size,
        frame.lift,
    );
    let resized = platform::position(&window, x, y, side, side)?;
    // A region is applied BEFORE a hidden pet is shown; no rectangular input blocker at startup.
    if s.shape != frame.rows || s.side != side || s.grid != frame.grid || resized {
        #[cfg(windows)]
        platform::shape(&window, &frame.rows, side, frame.grid)?;
        s.shape = frame.rows.clone();
        s.grid = frame.grid;
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
    if let Some(text) = message.as_deref() {
        let bw = (220.0 * display.coordinate_scale).round() as i32;
        let bh = (geometry::bubble_height(text) * display.coordinate_scale).round() as i32;
        let bx = (x + side / 2 - bw / 2).clamp(
            display.work.left,
            (display.work.right - bw).max(display.work.left),
        );
        platform::position(&bubble, bx, (y - bh).max(display.work.top), bw, bh)?;
        if !bubble.is_visible().map_err(|e| e.to_string())? {
            bubble.show().map_err(|e| e.to_string())?;
        }
    } else if bubble.is_visible().map_err(|e| e.to_string())? {
        bubble.hide().map_err(|e| e.to_string())?;
    }
    let hover = platform::sync_input(&window, x, y, side, &frame.rows, !s.hidden, frame.grid)?;
    // Startup is fully click-through until a valid native silhouette is installed.
    #[cfg(windows)]
    if s.last_frame.is_none() {
        window
            .set_ignore_cursor_events(false)
            .map_err(|e| e.to_string())?;
    }
    s.last_frame = Some(Instant::now());
    s.pet_error = None;
    Ok(hover)
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
        "drinking",
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
    platform::clear_input();
    window.hide().map_err(|e| e.to_string())?;
    if let Some(bubble) = app.get_webview_window("bubble") {
        let _ = bubble.hide();
    }
    app.state::<Shared>()
        .lock()
        .map_err(|e| e.to_string())?
        .pet_error = Some(message.chars().take(500).collect());
    let _ = app.emit_to("settings", "native-error", message);
    show_settings(&app);
    Ok(())
}
#[tauri::command]
fn input_status(window: WebviewWindow) -> Result<bool, String> {
    allowed(&window, &["settings"])?;
    Ok(platform::input_status())
}
#[tauri::command]
fn request_input_permission(window: WebviewWindow) -> Result<bool, String> {
    allowed(&window, &["settings"])?;
    Ok(platform::request_input_permission())
}
/// Show a harmless overlay from native startup, without waiting for its first JS frame.
fn warm_pet(app: &tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("pet").ok_or("Pet window missing")?;
    window
        .set_ignore_cursor_events(true)
        .map_err(|e| e.to_string())?;
    platform::clear_input();
    let displays = platform::displays(app)?;
    let settings = app
        .state::<Shared>()
        .lock()
        .map_err(|e| e.to_string())?
        .settings
        .clone();
    let display = displays
        .iter()
        .find(|d| d.id == settings.monitor)
        .or_else(|| displays.iter().find(|d| d.primary))
        .or_else(|| displays.first())
        .ok_or("No desktop monitor is available")?;
    let (left, right) = geometry::walking_bounds(display, &settings);
    let home = if settings.home_side == "right" {
        right
    } else {
        left
    };
    let (x, y, side) = geometry::placement(display, home, settings.size, 0.0);
    platform::position(&window, x, y, side, side)?;
    window.show().map_err(|e| e.to_string())
}
#[tauri::command]
fn desktop_status(window: WebviewWindow, state: tauri::State<Shared>) -> Result<String, String> {
    allowed(&window, &["settings"])?;
    let s = state.lock().map_err(|e| e.to_string())?;
    Ok(if let Some(error) = &s.pet_error {
        error.clone()
    } else if s.hidden {
        "Pet is hidden. Select Show / restart pet to bring it back.".into()
    } else if s
        .last_frame
        .is_some_and(|t| t.elapsed() < Duration::from_secs(5))
    {
        "Pet animation is running.".into()
    } else if s.started.elapsed() < Duration::from_secs(10) {
        "Starting the desktop pet…".into()
    } else {
        "Pet animation has not responded. Select Show / restart pet to retry.".into()
    })
}
#[tauri::command]
fn restart_pet(
    window: WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<Shared>,
) -> Result<(), String> {
    allowed(&window, &["settings"])?;
    {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.hidden = false;
        s.pet_error = None;
        s.last_frame = None;
        s.started = Instant::now();
        s.shape.clear();
    }
    if let Some(bubble) = app.get_webview_window("bubble") {
        bubble.hide().map_err(|e| e.to_string())?;
    }
    warm_pet(&app)?;
    app.get_webview_window("pet")
        .ok_or("Pet window missing")?
        .reload()
        .map_err(|e| e.to_string())
}
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            show_settings(app)
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("Miso") // Keep the original per-user startup key across upgrades.
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
            // Refresh the existing user startup entry if the installed path changed on upgrade.
            if app.autolaunch().is_enabled().unwrap_or(false) {
                if let Err(e) = app.autolaunch().enable() {
                    warning = Some(format!("Could not refresh login startup: {e}"));
                }
            }
            let show_on_start =
                warning.is_some() || (first_run && !std::env::args().any(|a| a == "--autostart"));
            let displays = platform::displays(app.handle()).unwrap_or_default();
            app.manage(Mutex::new(DesktopState {
                settings,
                warning,
                path,
                displays,
                refreshed: Instant::now(),
                hidden: false,
                shape: vec![],
                grid: 32,
                side: 0,
                message: None,
                started: Instant::now(),
                last_frame: None,
                pet_error: None,
            }));
            WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
                .title("MiniMates · a little company")
                .inner_size(1080.0, 780.0)
                .min_inner_size(760.0, 600.0)
                .center()
                .visible(show_on_start)
                .build()?;
            WebviewWindowBuilder::new(app, "pet", WebviewUrl::App("index.html".into()))
                .title("MiniMates")
                .inner_size(128.0, 128.0)
                .decorations(false)
                .transparent(true)
                .background_color(tauri::webview::Color(0, 0, 0, 0))
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .focused(false)
                .focusable(false)
                .visible(false)
                .build()?;
            let bubble =
                WebviewWindowBuilder::new(app, "bubble", WebviewUrl::App("index.html".into()))
                    .title("MiniMates says")
                    .inner_size(220.0, 72.0)
                    .decorations(false)
                    .transparent(true)
                    .background_color(tauri::webview::Color(0, 0, 0, 0))
                    .shadow(false)
                    .always_on_top(true)
                    .skip_taskbar(true)
                    .resizable(false)
                    .focused(false)
                    .focusable(false)
                    .visible(false)
                    .build()?;
            bubble.set_ignore_cursor_events(true)?;
            platform::initialize(app.handle())?;
            if let Err(error) = warm_pet(app.handle()) {
                app.state::<Shared>()
                    .lock()
                    .map_err(|e| e.to_string())?
                    .pet_error = Some(error);
                show_settings(app.handle());
            }
            use tauri::{
                menu::{Menu, MenuItem, PredefinedMenuItem},
                tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
            };
            let settings_item = MenuItem::with_id(
                app,
                "settings",
                "Open MiniMates settings",
                true,
                None::<&str>,
            )?;
            let visible = MenuItem::with_id(app, "visible", "Hide / show pet", true, None::<&str>)?;
            let sleep =
                MenuItem::with_id(app, "sleeping", "Let MiniMates sleep", true, None::<&str>)?;
            let wake = MenuItem::with_id(app, "wake", "Wake MiniMates", true, None::<&str>)?;
            let snooze = MenuItem::with_id(
                app,
                "snooze",
                "Snooze reminders for 15 minutes",
                true,
                None::<&str>,
            )?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit MiniMates", true, None::<&str>)?;
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
                .tooltip("MiniMates · a little company")
                .menu(&menu)
                .show_menu_on_left_click(cfg!(target_os = "macos"))
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "settings" => show_settings(app),
                    "quit" => app.exit(0),
                    "visible" => {
                        let state = app.state::<Shared>();
                        if let Ok(mut s) = state.lock() {
                            s.hidden = !s.hidden;
                            if s.hidden {
                                platform::clear_input();
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
            report_pet_error,
            input_status,
            request_input_permission,
            desktop_status,
            restart_pet
        ])
        .run(tauri::generate_context!())
        .expect("MiniMates could not start");
}

use crate::geometry::Display;
#[cfg(windows)]
mod win {
    use super::*;
    use crate::geometry::Rect;
    use std::{mem::size_of, ptr::null_mut};
    use windows_sys::core::BOOL;
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM, RECT},
        Graphics::Gdi::*,
        UI::{HiDpi::*, Shell::*, WindowsAndMessaging::*},
    };
    fn rect(r: RECT) -> Rect {
        Rect {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
        }
    }
    unsafe extern "system" fn collect(
        monitor: HMONITOR,
        _: HDC,
        _: *mut RECT,
        data: LPARAM,
    ) -> BOOL {
        let mut info: MONITORINFOEXW = unsafe { std::mem::zeroed() };
        info.monitorInfo.cbSize = size_of::<MONITORINFOEXW>() as u32;
        if unsafe { GetMonitorInfoW(monitor, &mut info.monitorInfo) } == 0 {
            return 1;
        }
        let mut dx = 96;
        let mut dy = 96;
        unsafe {
            GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut dx, &mut dy);
        }
        let id = String::from_utf16_lossy(&info.szDevice)
            .trim_end_matches('\0')
            .to_owned();
        let bounds = info.monitorInfo.rcMonitor;
        let mut work = info.monitorInfo.rcWork;
        let mut taskbar = "none".to_owned();
        let mut auto_hide = false;
        // Query every monitor, not just the primary taskbar. Auto-hide taskbars may not reduce rcWork.
        for (edge, name) in [
            (ABE_LEFT, "left"),
            (ABE_TOP, "top"),
            (ABE_RIGHT, "right"),
            (ABE_BOTTOM, "bottom"),
        ] {
            let mut data: APPBARDATA = unsafe { std::mem::zeroed() };
            data.cbSize = size_of::<APPBARDATA>() as u32;
            data.uEdge = edge;
            data.rc = bounds;
            if unsafe { SHAppBarMessage(ABM_GETAUTOHIDEBAREX, &mut data) } != 0 {
                taskbar = name.into();
                auto_hide = true;
                let reveal = (8.0 * dx as f64 / 96.0).ceil() as i32;
                match edge {
                    ABE_LEFT => work.left = work.left.max(bounds.left + reveal),
                    ABE_TOP => work.top = work.top.max(bounds.top + reveal),
                    ABE_RIGHT => work.right = work.right.min(bounds.right - reveal),
                    _ => work.bottom = work.bottom.min(bounds.bottom - reveal),
                }
            }
        }
        // Explorer taskbar windows identify the actual edge, independent of other docked app bars.
        let mut context = TaskbarSearch {
            monitor,
            bounds,
            edge: String::new(),
        };
        unsafe {
            EnumWindows(Some(find_taskbar), &mut context as *mut _ as LPARAM);
        }
        if !auto_hide && !context.edge.is_empty() {
            taskbar = context.edge;
        }
        let displays = unsafe { &mut *(data as *mut Vec<Display>) };
        displays.push(Display {
            name: id.replace("\\\\.\\", ""),
            id,
            primary: info.monitorInfo.dwFlags & 1 != 0,
            scale: dx as f64 / 96.0,
            coordinate_scale: dx as f64 / 96.0,
            bounds: rect(bounds),
            work: rect(work),
            taskbar,
            auto_hide,
        });
        1
    }
    struct TaskbarSearch {
        monitor: HMONITOR,
        bounds: RECT,
        edge: String,
    }
    unsafe extern "system" fn find_taskbar(hwnd: HWND, data: LPARAM) -> BOOL {
        let context = unsafe { &mut *(data as *mut TaskbarSearch) };
        let mut class = [0u16; 80];
        let length = unsafe { GetClassNameW(hwnd, class.as_mut_ptr(), class.len() as i32) };
        let name = String::from_utf16_lossy(&class[..length.max(0) as usize]);
        if name != "Shell_TrayWnd" && name != "Shell_SecondaryTrayWnd" {
            return 1;
        }
        if unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) } != context.monitor {
            return 1;
        }
        let mut r: RECT = unsafe { std::mem::zeroed() };
        if unsafe { GetWindowRect(hwnd, &mut r) } == 0 {
            return 1;
        }
        context.edge = if r.right - r.left > r.bottom - r.top {
            if (r.top - context.bounds.top).abs() < (r.bottom - context.bounds.bottom).abs() {
                "top"
            } else {
                "bottom"
            }
        } else if (r.left - context.bounds.left).abs() < (r.right - context.bounds.right).abs() {
            "left"
        } else {
            "right"
        }
        .into();
        1
    }
    pub fn displays() -> Result<Vec<Display>, String> {
        let mut output = Vec::new();
        if unsafe {
            EnumDisplayMonitors(
                null_mut(),
                std::ptr::null(),
                Some(collect),
                &mut output as *mut _ as LPARAM,
            )
        } == 0
        {
            return Err("Windows monitor enumeration failed".into());
        }
        if output.is_empty() {
            return Err("No desktop monitors available".into());
        }
        Ok(output)
    }
    pub fn shape(
        window: &tauri::WebviewWindow,
        rows: &[[i32; 3]],
        side: i32,
    ) -> Result<(), String> {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?.0;
        unsafe {
            let region = CreateRectRgn(0, 0, 0, 0);
            if region.is_null() {
                return Err("Could not create pet hit region".into());
            }
            for [x, y, w] in rows {
                // Round shared boundaries identically, including fractional DPI scales.
                let px = |v: i32| (v as f64 * side as f64 / 32.0).round() as i32;
                let run = CreateRectRgn(px(*x), px(*y), px(x + w), px(y + 1));
                if run.is_null() {
                    DeleteObject(region);
                    return Err("Could not create sprite row".into());
                }
                let result = CombineRgn(region, region, run, RGN_OR);
                DeleteObject(run);
                if result == 0 {
                    DeleteObject(region);
                    return Err("Could not combine sprite rows".into());
                }
            }
            // Windows owns the region only on success. Pixels outside it do not belong to this HWND.
            if SetWindowRgn(hwnd, region, 1) == 0 {
                DeleteObject(region);
                return Err("Could not apply pet hit region".into());
            }
        }
        Ok(())
    }
}
#[cfg(windows)]
pub use win::shape;
#[cfg(target_os = "macos")]
#[path = "platform_macos.rs"]
mod mac;
#[cfg(target_os = "macos")]
pub use mac::{
    clear_input, displays, initialize, input_status, position, request_input_permission, sync_input,
};

#[cfg(not(target_os = "macos"))]
pub fn displays(_: &tauri::AppHandle) -> Result<Vec<Display>, String> {
    #[cfg(windows)]
    {
        win::displays()
    }
    #[cfg(not(windows))]
    {
        Err("Miso currently supports Windows and macOS.".into())
    }
}
#[cfg(not(target_os = "macos"))]
pub fn position(
    window: &tauri::WebviewWindow,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<bool, String> {
    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    let size = tauri::PhysicalSize::new(width as u32, height as u32);
    let resized = window.inner_size().map_err(|e| e.to_string())? != size;
    if resized {
        window.set_size(size).map_err(|e| e.to_string())?;
    }
    Ok(resized)
}
#[cfg(not(target_os = "macos"))]
pub fn initialize(_: &tauri::AppHandle) -> Result<(), String> {
    Ok(())
}
#[cfg(not(target_os = "macos"))]
pub fn clear_input() {}
#[cfg(not(target_os = "macos"))]
pub fn input_status() -> bool {
    true
}
#[cfg(not(target_os = "macos"))]
pub fn request_input_permission() -> bool {
    true
}
#[cfg(not(target_os = "macos"))]
pub fn sync_input(
    _: &tauri::WebviewWindow,
    _: i32,
    _: i32,
    _: i32,
    _: &[[i32; 3]],
    _: bool,
) -> Result<Option<bool>, String> {
    Ok(None)
}

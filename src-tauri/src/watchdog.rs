use std::time::{Duration, Instant};

/// Check native time so a hung JavaScript renderer cannot keep an old input region alive.
pub fn expired(started: Instant, last_frame: Option<Instant>, now: Instant) -> bool {
    match last_frame {
        Some(last) => now.saturating_duration_since(last) >= Duration::from_secs(5),
        None => now.saturating_duration_since(started) >= Duration::from_secs(10),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn allows_startup_but_expires_missing_and_stalled_frames() {
        let start = Instant::now();
        assert!(!expired(start, None, start + Duration::from_secs(9)));
        assert!(expired(start, None, start + Duration::from_secs(10)));
        let frame = start + Duration::from_secs(15);
        assert!(!expired(
            start,
            Some(frame),
            frame + Duration::from_millis(4999)
        ));
        assert!(expired(start, Some(frame), frame + Duration::from_secs(5)));
        // A fresh valid frame starts a new deadline after recovery.
        let recovered = frame + Duration::from_secs(20);
        assert!(!expired(start, Some(recovered), recovered));
    }
}

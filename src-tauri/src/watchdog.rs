use std::time::{Duration, Instant};

/// Check native time so a hung JavaScript renderer cannot keep an old input region alive.
pub fn expired(started: Instant, last_frame: Option<Instant>, now: Instant) -> bool {
    match last_frame {
        Some(last) => now.saturating_duration_since(last) >= Duration::from_secs(5),
        None => now.saturating_duration_since(started) >= Duration::from_secs(30),
    }
}

pub fn retry_startup(started: Instant, retries: Option<u8>, now: Instant) -> bool {
    retries.is_some_and(|attempt| attempt < 3) && expired(started, None, now)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn allows_startup_but_expires_missing_and_stalled_frames() {
        let start = Instant::now();
        assert!(!expired(start, None, start + Duration::from_secs(29)));
        assert!(expired(start, None, start + Duration::from_secs(30)));
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
    #[test]
    fn startup_retries_are_bounded_and_stop_after_a_successful_frame() {
        let start = Instant::now();
        assert!(!retry_startup(start, Some(0), start + Duration::from_secs(29)));
        for attempt in 0..3 {
            assert!(retry_startup(
                start,
                Some(attempt),
                start + Duration::from_secs(30)
            ));
        }
        assert!(!retry_startup(start, Some(3), start + Duration::from_secs(30)));
        assert!(!retry_startup(start, None, start + Duration::from_secs(30)));
    }
}

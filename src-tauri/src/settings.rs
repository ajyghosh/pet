use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, io::Write, path::Path};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Reminder {
    pub enabled: bool,
    pub minutes: u32,
    pub message: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub version: u32,
    pub name: String,
    pub coat: String,
    pub size: u32,
    pub speed: u32,
    pub monitor: String,
    pub autostart: bool,
    pub roaming: bool,
    pub bubbles: bool,
    pub reminders: BTreeMap<String, Reminder>,
}
impl Default for Settings {
    fn default() -> Self {
        let reminders = [
            ("water", 45, "A little sip? Your water is waiting."),
            ("stretch", 60, "Reach up, roll your shoulders, breathe."),
            (
                "break",
                90,
                "Time for a tiny break. Look somewhere far away.",
            ),
        ]
        .into_iter()
        .map(|(k, minutes, message)| {
            (
                k.into(),
                Reminder {
                    enabled: true,
                    minutes,
                    message: message.into(),
                },
            )
        })
        .collect();
        Self {
            version: 1,
            name: "Miso".into(),
            coat: "ginger".into(),
            size: 128,
            speed: 45,
            monitor: "primary".into(),
            autostart: false,
            roaming: true,
            bubbles: true,
            reminders,
        }
    }
}
impl Settings {
    pub fn validate(&self) -> Result<(), String> {
        if self.version != 1 || self.name.trim().is_empty() || self.name.chars().count() > 24 {
            return Err("Invalid settings version or pet name".into());
        }
        if !["ginger", "cream", "slate"].contains(&self.coat.as_str())
            || ![96, 128, 160].contains(&self.size)
            || !(10..=100).contains(&self.speed)
        {
            return Err("Invalid appearance settings".into());
        }
        if self.monitor.is_empty() || self.monitor.len() > 128 {
            return Err("Invalid monitor".into());
        }
        if self.reminders.len() != 3 {
            return Err("Expected three reminder types".into());
        }
        for kind in ["water", "stretch", "break"] {
            let r = self.reminders.get(kind).ok_or("Missing reminder")?;
            if !(1..=240).contains(&r.minutes)
                || r.message.trim().is_empty()
                || r.message.chars().count() > 120
            {
                return Err(
                    "Reminder must be 1–240 minutes with a message up to 120 characters".into(),
                );
            }
        }
        Ok(())
    }
}
pub fn load(path: &Path) -> Result<Settings, String> {
    if !path.exists() {
        return Ok(Settings::default());
    }
    let data = std::fs::read(path).map_err(|e| e.to_string())?;
    let settings: Settings =
        serde_json::from_slice(&data).map_err(|e| format!("Settings could not be read: {e}"))?;
    settings.validate()?;
    Ok(settings)
}
pub fn save(path: &Path, settings: &Settings) -> Result<(), String> {
    settings.validate()?;
    let dir = path.parent().ok_or("Settings directory missing")?;
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let mut temp = tempfile::NamedTempFile::new_in(dir).map_err(|e| e.to_string())?;
    temp.write_all(&serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    temp.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_and_roundtrips() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let mut s = Settings::default();
        save(&path, &s).unwrap();
        s.name = "Bean".into();
        save(&path, &s).unwrap();
        assert_eq!(load(&path).unwrap().name, "Bean");
        s.reminders.get_mut("water").unwrap().minutes = 0;
        assert!(save(&path, &s).is_err());
        assert_eq!(load(&path).unwrap().reminders["water"].minutes, 45);
    }
    #[test]
    fn corrupted_file_is_not_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        std::fs::write(&path, b"broken").unwrap();
        assert!(load(&path).is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"broken");
    }
}

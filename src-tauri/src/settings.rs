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
    #[serde(default = "default_character")]
    pub character: String,
    #[serde(default, rename = "customCharacters")]
    pub custom_characters: Vec<serde_json::Value>,
    pub coat: String,
    pub size: u32,
    pub speed: u32,
    pub monitor: String,
    pub autostart: bool,
    pub roaming: bool,
    #[serde(default, rename = "alertsOnly")]
    pub alerts_only: bool,
    #[serde(default = "default_side", rename = "homeSide")]
    pub home_side: String,
    #[serde(default, rename = "walkStart")]
    pub walk_start: u32,
    #[serde(default = "default_end", rename = "walkEnd")]
    pub walk_end: u32,
    pub bubbles: bool,
    pub reminders: BTreeMap<String, Reminder>,
}
fn default_character() -> String {
    "alex".into()
}
fn default_side() -> String {
    "left".into()
}
fn default_end() -> u32 {
    100
}
fn valid_character(id: &str) -> bool {
    if [
        "alex", "nova", "sage", "cat", "corgi", "fox", "rabbit", "panda", "penguin", "frog",
        "robot", "dragon",
    ]
    .contains(&id)
    {
        return true;
    }
    static IDS: std::sync::OnceLock<Vec<String>> = std::sync::OnceLock::new();
    IDS.get_or_init(|| {
        serde_json::from_str(include_str!("../../src/core/ready-characters.json"))
            .expect("validated bundled character IDs")
    })
    .iter()
    .any(|candidate| candidate == id)
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
            name: "Alex".into(),
            character: default_character(),
            custom_characters: vec![],
            coat: "slate".into(),
            size: 80,
            speed: 45,
            monitor: "primary".into(),
            autostart: false,
            roaming: true,
            alerts_only: false,
            home_side: default_side(),
            walk_start: 0,
            walk_end: 100,
            bubbles: true,
            reminders,
        }
    }
}
impl Settings {
    pub fn validate(&self) -> Result<(), String> {
        if self.version != 1 || self.name.trim().is_empty() || self.name.chars().count() > 80 {
            return Err("Invalid settings version or pet name".into());
        }
        crate::custom_characters::validate(&self.custom_characters)?;
        if !valid_character(&self.character)
            && !self
                .custom_characters
                .iter()
                .any(|c| c["id"] == self.character)
        {
            return Err("Unknown or reference-only companion".into());
        }
        if !["left", "right"].contains(&self.home_side.as_str())
            || self.walk_start > 90
            || self.walk_end > 100
            || self.walk_end < self.walk_start + 10
        {
            return Err(
                "Walking area must be at least 10% wide with a left or right home side".into(),
            );
        }
        if !["ginger", "cream", "slate"].contains(&self.coat.as_str())
            || ![64, 80, 96, 128, 160].contains(&self.size)
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
    fn old_settings_migrate_and_new_choices_roundtrip() {
        let mut old = serde_json::to_value(Settings::default()).unwrap();
        for key in [
            "character",
            "homeSide",
            "walkStart",
            "walkEnd",
            "alertsOnly",
        ] {
            old.as_object_mut().unwrap().remove(key);
        }
        old["name"] = "My Miso".into();
        old["roaming"] = false.into();
        let mut s: Settings = serde_json::from_value(old).unwrap();
        assert_eq!(s.character, "alex");
        assert_eq!(s.name, "My Miso");
        assert!(!s.roaming);
        assert_eq!((s.walk_start, s.walk_end), (0, 100));
        s.validate().unwrap();
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        for character in [
            "alex", "nova", "sage", "cat", "corgi", "fox", "rabbit", "panda", "penguin", "frog",
            "robot", "dragon",
        ] {
            s.character = character.into();
            s.home_side = "right".into();
            s.walk_start = 30;
            s.walk_end = 70;
            s.alerts_only = true;
            save(&path, &s).unwrap();
            let loaded = load(&path).unwrap();
            assert_eq!(loaded.character, character);
            assert_eq!(loaded.walk_start, 30);
            assert_eq!(loaded.home_side, "right");
            assert!(loaded.alerts_only);
        }
        s.character = "../missing".into();
        assert!(s.validate().is_err());
        s.character = "cat".into();
        s.walk_end = 20;
        assert!(s.validate().is_err());
        s.walk_end = 70;
        s.home_side = "top".into();
        assert!(s.validate().is_err());
    }
    #[test]
    fn collection_ids_validate_but_reference_entries_are_not_playable() {
        let catalog: serde_json::Value = serde_json::from_str(include_str!(
            "../../assets/characters/collections/characters.json"
        ))
        .unwrap();
        let entries = catalog["characters"].as_array().unwrap();
        assert_eq!(entries.len(), 140);
        for entry in entries {
            let id = entry["id"].as_str().unwrap();
            assert_eq!(
                valid_character(id),
                entry["asset_status"] == "planned",
                "{id}"
            );
        }
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

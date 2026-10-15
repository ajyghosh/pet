use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    io::Write,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ScheduledReminder {
    pub id: String,
    pub title: String,
    pub message: String,
    pub due_at: i64,
    pub repeat_minutes: u32,
    pub enabled: bool,
    pub bubble: bool,
    pub system_notification: bool,
    #[serde(default)]
    pub last_fired_at: Option<i64>,
}
impl ScheduledReminder {
    pub fn validate(&self) -> Result<(), String> {
        if !self.id.starts_with("reminder-")
            || !(10..=64).contains(&self.id.len())
            || !self
                .id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
        {
            return Err("Invalid reminder ID".into());
        }
        if self.title.trim().is_empty()
            || self.title.chars().count() > 80
            || self.message.trim().is_empty()
            || self.message.chars().count() > 120
        {
            return Err("Enter a title (up to 80 characters) and message (up to 120)".into());
        }
        if !(1..=4_102_444_800_000).contains(&self.due_at)
            || self.repeat_minutes > 525_600
            || (!self.bubble && !self.system_notification)
            || self
                .last_fired_at
                .is_some_and(|t| !(1..=4_102_444_800_000).contains(&t))
        {
            return Err("Invalid reminder time, repeat interval or alert method".into());
        }
        Ok(())
    }
}
fn validate(records: &[ScheduledReminder]) -> Result<(), String> {
    if records.len() > 100 {
        return Err("You can save up to 100 custom reminders".into());
    }
    let mut ids = HashSet::new();
    for r in records {
        r.validate()?;
        if !ids.insert(&r.id) {
            return Err("Duplicate reminder IDs".into());
        }
    }
    Ok(())
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct File {
    version: u32,
    reminders: Vec<ScheduledReminder>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub reminders: Vec<ScheduledReminder>,
    pub warning: Option<String>,
    pub snoozed_until: i64,
}
pub struct Store {
    pub records: Vec<ScheduledReminder>,
    pub path: PathBuf,
    pub warning: Option<String>,
    pub snoozed_until: i64,
    pub open_editor: bool,
}
impl Store {
    pub fn load(path: PathBuf) -> Self {
        let mut store = Self {
            records: vec![],
            path,
            warning: None,
            snoozed_until: 0,
            open_editor: false,
        };
        if store.path.exists() {
            let result: Result<Vec<ScheduledReminder>, String> = (|| {
                if std::fs::metadata(&store.path)
                    .map_err(|e| e.to_string())?
                    .len()
                    > 256_000
                {
                    return Err("Reminder file is too large".into());
                }
                let file: File =
                    serde_json::from_slice(&std::fs::read(&store.path).map_err(|e| e.to_string())?)
                        .map_err(|e| e.to_string())?;
                if file.version != 1 {
                    return Err("Unsupported reminder version".into());
                }
                validate(&file.reminders)?;
                Ok(file.reminders)
            })();
            match result { Ok(records) => store.records = records, Err(error) => store.warning = Some(format!("{error}. Original reminders preserved; explicitly saving a reminder will replace the file.")) }
        }
        store
    }
    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            reminders: self.records.clone(),
            warning: self.warning.clone(),
            snoozed_until: self.snoozed_until,
        }
    }
    fn commit(&mut self, records: Vec<ScheduledReminder>) -> Result<(), String> {
        validate(&records)?;
        let dir = self.path.parent().ok_or("Missing reminders directory")?;
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        let mut temp = tempfile::NamedTempFile::new_in(dir).map_err(|e| e.to_string())?;
        temp.write_all(
            &serde_json::to_vec_pretty(&File {
                version: 1,
                reminders: records.clone(),
            })
            .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        temp.as_file().sync_all().map_err(|e| e.to_string())?;
        temp.persist(&self.path).map_err(|e| e.to_string())?;
        self.records = records;
        self.warning = None;
        Ok(())
    }
    pub fn upsert(&mut self, mut reminder: ScheduledReminder, now: i64) -> Result<(), String> {
        reminder.validate()?;
        if reminder.enabled && reminder.due_at <= now {
            return Err("Choose a future reminder time".into());
        }
        let mut records = self.records.clone();
        if let Some(existing) = records.iter_mut().find(|r| r.id == reminder.id) {
            reminder.last_fired_at = existing.last_fired_at;
            *existing = reminder;
        } else {
            reminder.last_fired_at = None;
            records.push(reminder);
        }
        self.commit(records)
    }
    pub fn delete(&mut self, id: &str) -> Result<(), String> {
        self.commit(
            self.records
                .iter()
                .filter(|r| r.id != id)
                .cloned()
                .collect(),
        )
    }
    /// Persist claims before dispatch. Missed repeat intervals coalesce into one attempt.
    pub fn take_due(&mut self, now: i64) -> Result<Vec<ScheduledReminder>, String> {
        if now < self.snoozed_until {
            return Ok(vec![]);
        }
        let mut records = self.records.clone();
        let mut due = vec![];
        for r in &mut records {
            if !r.enabled || r.due_at > now {
                continue;
            }
            due.push(r.clone());
            r.last_fired_at = Some(now);
            if r.repeat_minutes == 0 {
                r.enabled = false;
            } else {
                let interval = i64::from(r.repeat_minutes) * 60_000;
                let next = r.due_at + ((now - r.due_at) / interval + 1) * interval;
                if next > 4_102_444_800_000 {
                    r.enabled = false;
                } else {
                    r.due_at = next;
                }
            }
        }
        if !due.is_empty() {
            self.commit(records)?;
        }
        Ok(due)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn reminder() -> ScheduledReminder {
        ScheduledReminder {
            id: "reminder-test".into(),
            title: "Call".into(),
            message: "Call the team".into(),
            due_at: 120_000,
            repeat_minutes: 0,
            enabled: true,
            bubble: true,
            system_notification: true,
            last_fired_at: None,
        }
    }
    #[test]
    fn one_off_persists_and_does_not_redeliver_after_restart() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("reminders.json");
        let mut s = Store::load(path.clone());
        s.upsert(reminder(), 60_000).unwrap();
        assert!(s.take_due(119_999).unwrap().is_empty());
        assert_eq!(s.take_due(120_000).unwrap().len(), 1);
        let mut restored = Store::load(path);
        assert!(!restored.records[0].enabled);
        assert!(restored.take_due(900_000).unwrap().is_empty());
        restored.delete("reminder-test").unwrap();
        assert!(restored.records.is_empty());
    }
    #[test]
    fn repeats_coalesce_snooze_and_failed_writes_do_not_claim() {
        let dir = tempfile::tempdir().unwrap();
        let mut s = Store::load(dir.path().join("reminders.json"));
        let mut r = reminder();
        r.repeat_minutes = 1;
        s.upsert(r, 60_000).unwrap();
        s.snoozed_until = 600_000;
        assert!(s.take_due(500_000).unwrap().is_empty());
        assert_eq!(s.take_due(600_000).unwrap().len(), 1);
        assert_eq!(s.records[0].due_at, 660_000);
        assert!(s.take_due(600_001).unwrap().is_empty());
        s.path = dir.path().to_owned();
        assert!(s.take_due(660_000).is_err());
        assert_eq!(s.records[0].due_at, 660_000);
    }
    #[test]
    fn corrupt_files_and_invalid_inputs_are_preserved() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("reminders.json");
        std::fs::write(&path, "broken").unwrap();
        let mut s = Store::load(path.clone());
        assert!(s.warning.is_some());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "broken");
        let mut r = reminder();
        r.id = "../escape".into();
        assert!(s.upsert(r, 60_000).is_err());
        assert!(s.upsert(reminder(), 120_000).is_err());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "broken");
    }
}

use serde_json::Value;
use std::collections::HashSet;

fn text(value: Option<&Value>, max: usize, optional: bool) -> bool {
    match value {
        None => optional,
        Some(Value::String(s)) => (optional || !s.trim().is_empty()) && s.chars().count() <= max,
        _ => false,
    }
}
fn keys(value: &Value, allowed: &[&str]) -> bool {
    value
        .as_object()
        .is_some_and(|o| o.keys().all(|k| allowed.contains(&k.as_str())))
}
/// Appearance-only presets cannot reference files, URLs, scripts, or animation assets.
pub fn validate(records: &[Value]) -> Result<(), String> {
    if records.len() > 50 {
        return Err("You can save up to 50 custom characters".into());
    }
    let options: Value = serde_json::from_str(include_str!("../../src/core/creator-options.json"))
        .expect("bundled creator choices");
    let mut ids = HashSet::new();
    for c in records {
        let id = c["id"].as_str().ok_or("Missing custom character ID")?;
        if !keys(
            c,
            &[
                "schemaVersion",
                "id",
                "name",
                "style",
                "source",
                "appearance",
                "animations",
                "personality",
                "license",
            ],
        ) || c["schemaVersion"] != 1
            || c["style"] != "cute-3d"
            || c["source"] != "manual"
            || !id.starts_with("custom-")
            || !(8..=64).contains(&id.len())
            || !id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
            || !ids.insert(id)
            || !text(c.get("name"), 80, false)
            || !text(c.get("personality"), 100, true)
            || !text(c.get("license"), 100, c.get("license").is_none())
            || !c["animations"].as_object().is_some_and(|o| o.is_empty())
        {
            return Err("Invalid custom character metadata".into());
        }
        let a = &c["appearance"];
        if !keys(
            a,
            &[
                "base",
                "skinTone",
                "faceShape",
                "eyeStyle",
                "browStyle",
                "facialHair",
                "hairStyle",
                "hairColor",
                "outfit",
                "outfitColor",
                "shoes",
                "accessories",
            ],
        ) || ["base", "skinTone", "hairStyle", "hairColor", "outfit"]
            .iter()
            .any(|k| a.get(k).is_none())
        {
            return Err("Invalid custom appearance".into());
        }
        for (key, choices) in options.as_object().unwrap() {
            if key == "accessories" {
                continue;
            }
            if let Some(choice) = a.get(key) {
                if !choices.as_array().unwrap().contains(choice) {
                    return Err(format!("Unsupported custom {key}"));
                }
            }
        }
        if let Some(value) = a.get("outfitColor") {
            let color = value.as_str().ok_or("Invalid clothing color")?;
            if color.len() != 7
                || !color.starts_with('#')
                || !color.bytes().skip(1).all(|b| b.is_ascii_hexdigit())
            {
                return Err("Invalid clothing color".into());
            }
        }
        if let Some(value) = a.get("accessories") {
            let accessories = value.as_array().ok_or("Invalid accessories")?;
            let mut seen = HashSet::new();
            if accessories.len() > 4
                || accessories.iter().any(|item| {
                    !options["accessories"].as_array().unwrap().contains(item)
                        || !seen.insert(item.as_str())
                })
            {
                return Err("Invalid or duplicate accessory".into());
            }
        }
    }
    Ok(())
}

/// Export a validated preset without replacing an existing download.
pub fn export(
    directory: &std::path::Path,
    character: &Value,
) -> Result<std::path::PathBuf, String> {
    use std::io::Write;
    validate(std::slice::from_ref(character))?;
    std::fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let mut temp = tempfile::NamedTempFile::new_in(directory).map_err(|e| e.to_string())?;
    temp.write_all(&serde_json::to_vec_pretty(character).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    let id = character["id"].as_str().ok_or("Missing character ID")?;
    for suffix in 0..1000 {
        let filename = if suffix == 0 {
            format!("MiniMates-{id}.json")
        } else {
            format!("MiniMates-{id}-{suffix}.json")
        };
        let path = directory.join(filename);
        match temp.persist_noclobber(&path) {
            Ok(_) => return Ok(path),
            Err(error) => {
                if error.error.kind() != std::io::ErrorKind::AlreadyExists {
                    return Err(error.to_string());
                }
                temp = error.file;
            }
        }
    }
    Err("Too many exports with the same name in Downloads".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::{load, save, Settings};
    fn sample() -> Value {
        serde_json::from_str(include_str!(
            "../../assets/characters/creator/examples/sample-character.json"
        ))
        .unwrap()
    }
    #[test]
    fn unicode_duplicate_deserializes_and_roundtrips() {
        let copy: Value =
            serde_json::from_str(include_str!("../../tests/fixtures/unicode-duplicate.json"))
                .unwrap();
        validate(std::slice::from_ref(&copy)).unwrap();
        assert_eq!(
            copy["name"].as_str().unwrap(),
            format!("{}🙂 copy", "a".repeat(73))
        );
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let settings = Settings {
            character: copy["id"].as_str().unwrap().into(),
            custom_characters: vec![copy.clone()],
            ..Default::default()
        };
        save(&path, &settings).unwrap();
        assert_eq!(load(&path).unwrap().custom_characters[0], copy);
        assert!(serde_json::from_str::<Value>(r#"{"name":"\ud83d copy"}"#).is_err());
    }
    #[test]
    fn presets_persist_and_old_settings_migrate() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let mut old = serde_json::to_value(Settings::default()).unwrap();
        old.as_object_mut().unwrap().remove("customCharacters");
        let mut settings: Settings = serde_json::from_value(old).unwrap();
        assert!(settings.custom_characters.is_empty());
        settings.custom_characters.push(sample());
        settings.character = "custom-office-001".into();
        settings.name = "🙂".repeat(80);
        save(&path, &settings).unwrap();
        let loaded = load(&path).unwrap();
        assert_eq!(loaded.custom_characters, settings.custom_characters);
        assert_eq!(loaded.name, settings.name);
        settings.custom_characters.clear();
        assert!(save(&path, &settings).is_err());
        assert_eq!(load(&path).unwrap().character, "custom-office-001");
    }
    #[test]
    fn exports_validated_presets_without_overwriting() {
        let dir = tempfile::tempdir().unwrap();
        let first = export(dir.path(), &sample()).unwrap();
        let second = export(dir.path(), &sample()).unwrap();
        assert_ne!(first, second);
        let contents = std::fs::read(&first).unwrap();
        assert_eq!(
            serde_json::from_slice::<Value>(&contents).unwrap(),
            sample()
        );
        let mut invalid = sample();
        invalid["id"] = "../escape".into();
        assert!(export(dir.path(), &invalid).is_err());
        assert_eq!(std::fs::read(&first).unwrap(), contents);
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 2);
    }
    #[test]
    fn rejects_unsafe_and_unsupported_presets() {
        for (key, value) in [
            ("id", serde_json::json!("../alex")),
            ("id", serde_json::json!("alex")),
            ("name", serde_json::json!(" ")),
            ("source", serde_json::json!("photo-local-ai")),
            ("animations", serde_json::json!({"idle":"../../file"})),
            ("extra", serde_json::json!(true)),
        ] {
            let mut c = sample();
            c[key] = value;
            assert!(validate(&[c]).is_err(), "{key}");
        }
        for (key, value) in [
            ("hairStyle", serde_json::json!("unknown")),
            ("outfitColor", serde_json::json!("#zzzzzz")),
            ("accessories", serde_json::json!(["hat", "hat"])),
            ("path", serde_json::json!("/tmp/file")),
        ] {
            let mut c = sample();
            c["appearance"][key] = value;
            assert!(validate(&[c]).is_err(), "{key}");
        }
        assert!(validate(&[sample(), sample()]).is_err());
        assert!(validate(&vec![sample(); 51]).is_err());
    }
}

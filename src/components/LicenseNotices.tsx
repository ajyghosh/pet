import { useState } from "react";
import noticesUrl from "../../THIRD_PARTY_LICENSES.txt?url";

export function LicenseNotices() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <details
      className="license-notices"
      onToggle={(event) => {
        if (event.currentTarget.open && !text && !loading) {
          setLoading(true);
          void fetch(noticesUrl)
            .then((response) => {
              if (!response.ok) throw Error("Notices unavailable");
              return response.text();
            })
            .then(setText)
            .catch(() =>
              setError(
                "Could not load notices. A copy is included with the installed app.",
              ),
            )
            .finally(() => setLoading(false));
        }
      }}
    >
      <summary>Third-party licenses and notices</summary>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <pre tabIndex={0} aria-label="Third-party license texts">
          {text || "Loading notices…"}
        </pre>
      )}
    </details>
  );
}

/** JSON sent to Rust cannot contain unpaired UTF-16 surrogates. */
export function assertUnicodeText(value: unknown): void {
  if (typeof value === "string") {
    for (const character of value) {
      const point = character.codePointAt(0)!;
      if (point >= 0xd800 && point <= 0xdfff)
        throw Error(
          "Text contains an incomplete Unicode character. Please re-enter it.",
        );
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) assertUnicodeText(item);
  }
}

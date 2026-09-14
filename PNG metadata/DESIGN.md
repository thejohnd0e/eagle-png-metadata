# Eagle PNG Parameters Inspector Design

## 1. Purpose

Show PNG prompt metadata inside Eagle's right-side inspector without changing the asset. The panel is quiet, compact, and optimized for repeated scanning while browsing an image library.

## 2. Tokens

- Font family: system sans-serif.
- Font size: 11px base, 12px labels, 13px value text.
- Spacing: 4px base unit.
- Radius: 6px for the panel, 4px for controls and metadata chips.
- Light colors: text `#202124`, muted `#6b7280`, border `#d9dce3`, panel `#ffffff`, subtle `#f5f6f8`, accent `#2563eb`.
- Dark colors: text `#f3f4f6`, muted `#a7adb8`, border `#3b414c`, panel `#1f232b`, subtle `#2a2f38`, accent `#7aa2ff`.

## 3. Layout

The panel uses a single-column app-shell layout: a compact header, one scrollable prompt area, and an optional diagnostic list of duplicate metadata fields. It must fit Eagle's inspector width and avoid horizontal overflow.

## 4. States

- Loading: short muted status line.
- Empty: "Parameters not found" plus found textual keys when useful.
- Error: readable error text, no stack trace by default.
- Success: preferred Parameters value plus source chunk type.

## 5. Primitives

- Status line: small muted text.
- Prompt block: pre-wrapped text with selectable content.
- Metadata chip: compact inline source marker.
- Duplicate row: keyword, chunk type, and decoded text preview.

## 6. Accessibility

Use semantic text, selectable prompt content, focus-visible outlines for buttons, and contrast-safe theme palettes. No animation is required.

# PNG metadata

`PNG metadata` is a small Eagle inspector plugin for PNG files.

It reads PNG textual metadata directly from the selected image and shows the prompt stored in `Parameters` / `parameters`, including prompts saved as UTF-8 `iTXt`.

## What It Does

- Shows `Parameters` from PNG metadata in Eagle's right inspector panel.
- Correctly reads Cyrillic text from `iTXt`.
- Handles duplicate `Parameters` fields and prefers the clean UTF-8 `iTXt` value.
- Reads `Source` / `Sourse` / `URL` / `Website` fields.
- Copies a source URL into Eagle's standard URL field when that field is empty.
- Does not overwrite an existing Eagle URL.
- Lets you copy the prompt by clicking the prompt text.

## Install

1. Open Eagle.
2. Open **Plugin**.
3. Open **Developer Options**.
4. Import this local project folder:

   ```text
   C:\Users\la\Documents\PNG metadata
   ```

5. Select one PNG file.
6. Open the right inspector panel.
7. Find the **PNG metadata** section.

## Notes

This plugin only reads image metadata and updates Eagle's URL field when it is empty. It does not modify the PNG file itself.

If Eagle does not refresh the plugin after an update, switch to another image and back, or restart Eagle.

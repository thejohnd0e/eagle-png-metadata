# PNG metadata

Minimal Eagle inspector plugin that reads PNG textual metadata from the selected local file and shows Stable Diffusion-style `Parameters` / `parameters` prompts, including UTF-8 Cyrillic stored in `iTXt`.

## What it reads

- `tEXt`
- `zTXt`
- `iTXt` with UTF-8 text
- duplicate `Parameters` fields
- `Source`, `Sourse`, `URL`, and `Website` textual fields

When duplicates exist, the panel chooses the best display value in this order:

1. `iTXt` entry with keyword `Parameters` / `parameters`
2. the last readable duplicate
3. the first readable duplicate

All duplicates remain visible in the diagnostics section so it is clear when an older broken `tEXt` value is still present.

If a valid `Source` URL is found and Eagle's own URL field is empty, the plugin copies that URL into the Eagle item and saves it. Existing Eagle URLs are left unchanged. The URL is not duplicated inside the plugin panel.

Click the prompt text in the plugin panel to copy it to the system clipboard.

## Install in Eagle

1. Open Eagle.
2. Click **Plugin** in the toolbar.
3. Open **Developer Options**.
4. Choose **Import Local Project** or the equivalent local plugin import option.
5. Select this folder: `PNG metadata`.
6. Select a PNG image in Eagle.
7. Open the right info panel. The section **PNG metadata** should appear for PNG files.

Inspector plugins require Eagle 4.0 Beta 17 or newer.

## Test with a PNG containing Cyrillic iTXt

1. Add a PNG that contains an `iTXt` chunk with keyword `Parameters`.
2. Select the PNG in Eagle.
3. Confirm the panel shows the Cyrillic text normally, for example `В осеннем лесу...`.
4. If the file also contains an older broken `tEXt Parameters`, expand **All Parameters fields** and confirm both entries are listed.
5. If the PNG contains `Source`, confirm that it is copied to Eagle's URL field when that field was empty.

## Development checks

Run:

```bash
npm test
```

The tests build synthetic PNG buffers and verify `tEXt`, `zTXt`, uncompressed `iTXt`, compressed `iTXt`, duplicate handling, and UTF-8 Cyrillic decoding.

## Eagle API notes

The plugin uses:

- `eagle.item.getSelected()` to get the active item.
- Node's `fs.promises.readFile()` to read the selected file.
- tolerant path detection across common Eagle item fields: `filePath`, `path`, `url`, and `fileURL`.

It updates an Eagle item's URL field only when that field is empty and a valid
source URL is present in the PNG. It does not modify image files.

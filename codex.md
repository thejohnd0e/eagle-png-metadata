# Codex Notes

This plugin was built for Eagle as a PNG metadata inspector.

## Goal

Read PNG textual metadata directly from the selected local image in Eagle, including UTF-8 `iTXt`, because the existing Stable Diffusion Metadata plugin did not see `Parameters` stored in `iTXt`.

## Eagle API Findings

- Eagle inspector plugins are declared through `manifest.json` under `preview`.
- The PNG inspector entry is `preview.png.inspector`.
- The plugin runs as an Eagle Chromium page with Node.js access.
- Local files can be read with Node `fs`.
- The selected image is retrieved through `eagle.item.getSelected()`.
- Clipboard copy is available through `eagle.clipboard.writeText()`.

## Implemented

- Created an inspector plugin named `PNG metadata`.
- Added a tolerant PNG textual metadata parser for:
  - `tEXt`
  - `zTXt`
  - uncompressed `iTXt`
  - compressed `iTXt`
- Added UTF-8 decoding for `iTXt`, including Cyrillic prompts.
- Added duplicate `Parameters` handling:
  - prefer readable `iTXt`;
  - otherwise use the latest readable duplicate;
  - keep duplicate diagnostics available when needed.
- Added support for source URL keys:
  - `Source`
  - `Sourse`
  - `URL`
  - `Website`
- If a valid source URL is found and Eagle's URL field is empty, the plugin writes it into the Eagle item URL field.
- Existing Eagle URLs are not overwritten.
- Source URL is not shown in the plugin panel because Eagle already shows it in the standard URL field.
- Clicking the prompt text copies the full prompt to the system clipboard.
- Removed the duplicate internal `PNG metadata` title so Eagle's section title is the only title.
- Moved the chunk type badge, for example `iTXt`, onto the same line as `Parameters`.
- Styled the panel to fit Eagle's dark inspector UI.

## Important Files

- `manifest.json`: Eagle plugin metadata and inspector registration.
- `index.html`: inspector panel layout and styling.
- `js/png-text.js`: PNG chunk parser and metadata selection logic.
- `js/inspector.js`: Eagle integration, file reading, URL sync, and copy behavior.
- `tests/png-text.test.js`: parser tests with synthetic PNG buffers.

## Current Version

`1.4.0`

## Install Folder Used During Development

`C:\Users\la\Documents\PNG metadata`

## Verification

Local checks passed:

- JavaScript syntax check for `js/png-text.js`.
- JavaScript syntax check for `js/inspector.js`.
- Parser tests for `tEXt`, `zTXt`, UTF-8 `iTXt`, compressed `iTXt`, duplicate `Parameters`, `Source`, and `Sourse`.

Manual checks in Eagle:

- Plugin appears in the PNG inspector panel.
- `Parameters` is shown for PNG files.
- Cyrillic prompt text displays correctly.
- Source URL is copied to Eagle's standard URL field.
- Prompt text can be copied by clicking the prompt block.

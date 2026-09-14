(function startInspector() {
  "use strict";

  const fs = require("fs");
  const { fileURLToPath } = require("url");
  const content = document.getElementById("content");

  function setTheme(theme) {
    document.body.setAttribute("theme", theme || "LIGHT");
  }

  function setStatus(message, type) {
    content.innerHTML = "";
    const status = document.createElement("p");
    status.className = type === "error" ? "status error" : "status";
    status.textContent = message;
    content.appendChild(status);
  }

  function appendText(parent, className, text) {
    const node = document.createElement("pre");
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function appendField(parent, label, value, badgeText) {
    const field = document.createElement("section");
    field.className = "field";

    const labelNode = document.createElement("p");
    labelNode.className = "label";
    const labelText = document.createElement("span");
    labelText.textContent = label;
    labelNode.appendChild(labelText);
    if (badgeText) {
      const badge = document.createElement("span");
      badge.className = "chip";
      badge.textContent = badgeText;
      labelNode.appendChild(badge);
    }
    field.appendChild(labelNode);

    appendText(field, "prompt", value);
    parent.appendChild(field);
  }

  function appendCopyableField(parent, label, value, badgeText) {
    const field = document.createElement("section");
    field.className = "field";

    const labelNode = document.createElement("p");
    labelNode.className = "label";
    const labelText = document.createElement("span");
    labelText.textContent = label;
    labelNode.appendChild(labelText);
    if (badgeText) {
      const badge = document.createElement("span");
      badge.className = "chip";
      badge.textContent = badgeText;
      labelNode.appendChild(badge);
    }
    field.appendChild(labelNode);

    const prompt = appendText(field, "prompt copyable", value);
    prompt.tabIndex = 0;
    prompt.title = "Click to copy";
    prompt.setAttribute("role", "button");
    prompt.setAttribute("aria-label", `Copy ${label}`);

    const status = document.createElement("p");
    status.className = "copy-status";
    field.appendChild(status);

    const copy = async () => {
      await eagle.clipboard.writeText(value);
      status.textContent = "Copied";
      window.setTimeout(() => {
        status.textContent = "";
      }, 1200);
    };

    prompt.addEventListener("click", () => {
      copy().catch(() => {
        status.textContent = "Copy failed";
      });
    });
    prompt.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        copy().catch(() => {
          status.textContent = "Copy failed";
        });
      }
    });

    parent.appendChild(field);
  }

  function itemPath(item) {
    const candidates = [item.filePath, item.path, item.url, item.fileURL];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.length > 0) {
        return candidate.startsWith("file://") ? fileURLToPath(candidate) : candidate;
      }
    }
    return "";
  }

  function itemUrl(item) {
    const candidates = [item.website, item.url];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return "";
  }

  function isEmptyEagleUrl(value) {
    return value === "" || value === "http://" || value === "https://";
  }

  function normalizedUrl(value) {
    const text = value.trim();
    if (/^https?:\/\//i.test(text)) {
      return text;
    }
    return "";
  }

  function appendSyncStatus(parent, syncStatus) {
    if (!syncStatus) {
      return;
    }
    const note = document.createElement("p");
    note.className = "sync";
    note.textContent = syncStatus;
    parent.appendChild(note);
  }

  async function syncSourceToEagleUrl(item, sourceEntry) {
    if (!sourceEntry) {
      return "";
    }

    const sourceUrl = normalizedUrl(sourceEntry.text);
    if (!sourceUrl) {
      return "";
    }

    const currentUrl = itemUrl(item);
    if (!isEmptyEagleUrl(currentUrl)) {
      return "";
    }

    item.url = sourceUrl;
    item.website = sourceUrl;
    await item.save();
    return "Copied to Eagle URL.";
  }

  function renderEmpty(entries) {
    content.innerHTML = "";
    const status = document.createElement("p");
    status.className = "status";
    const keys = entries.map((entry) => entry.keyword).filter(Boolean);
    status.textContent = keys.length > 0
      ? `Parameters not found. Text keys: ${keys.join(", ")}`
      : "Parameters not found. This PNG has no textual metadata chunks.";
    content.appendChild(status);
  }

  function renderResult(parametersEntry, entries, syncStatus) {
    const duplicates = entries.filter((entry) => entry.keyword.trim().toLowerCase() === "parameters");
    if (!parametersEntry) {
      renderEmpty(entries);
      return;
    }

    content.innerHTML = "";
    appendSyncStatus(content, syncStatus);
    if (parametersEntry) {
      const chunkLabel = `${parametersEntry.chunkType}${parametersEntry.compressed ? " compressed" : ""}`;
      appendCopyableField(content, "Parameters", parametersEntry.text, chunkLabel);
    }

    if (duplicates.length > 1) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = `All Parameters fields (${duplicates.length})`;
      details.appendChild(summary);

      for (const entry of duplicates) {
        const row = document.createElement("section");
        row.className = "duplicate";

        const meta = document.createElement("div");
        meta.className = "duplicate-meta";
        meta.textContent = `${entry.chunkType}${entry.compressed ? " compressed" : ""} · chunk #${entry.index}`;
        row.appendChild(meta);

        appendText(row, "duplicate-text", entry.text);
        details.appendChild(row);
      }
      content.appendChild(details);
    }
  }

  async function refresh() {
    setStatus("Reading selected PNG metadata...", "loading");
    const selectedItems = await eagle.item.getSelected();
    const item = selectedItems[0];
    if (!item) {
      setStatus("No PNG selected.", "empty");
      return;
    }

    const path = itemPath(item);
    if (!path) {
      setStatus("Eagle did not expose a local file path for this item.", "error");
      return;
    }

    const data = await fs.promises.readFile(path);
    const entries = window.PngTextMetadata.parsePngTextChunks(data);
    const sourceEntry = window.PngTextMetadata.chooseSource(entries);
    let syncStatus = "";
    try {
      syncStatus = await syncSourceToEagleUrl(item, sourceEntry);
    } catch (error) {
      syncStatus = "Could not copy to Eagle URL.";
    }
    renderResult(window.PngTextMetadata.chooseParameters(entries), entries, syncStatus);
  }

  eagle.onPluginCreate(async () => {
    setTheme(await eagle.app.theme);
    refresh().catch((error) => {
      setStatus(error && error.message ? error.message : String(error), "error");
    });
  });

  eagle.onThemeChanged(setTheme);
})();

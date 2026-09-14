(function attachPngText(root) {
  "use strict";

  const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
  const TEXT_DECODER_LATIN1 = new TextDecoder("latin1");
  const TEXT_DECODER_UTF8 = new TextDecoder("utf-8", { fatal: false });

  class PngMetadataError extends Error {
    constructor(message) {
      super(message);
      this.name = "PngMetadataError";
    }
  }

  function toUint8Array(input) {
    if (input instanceof Uint8Array) {
      return input;
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }
    throw new PngMetadataError("Expected PNG data as Buffer, Uint8Array, or ArrayBuffer.");
  }

  function readUInt32(bytes, offset) {
    return ((bytes[offset] * 0x1000000) + ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])) >>> 0;
  }

  function readAscii(bytes, start, end) {
    let output = "";
    for (let index = start; index < end; index += 1) {
      output += String.fromCharCode(bytes[index]);
    }
    return output;
  }

  function assertPng(bytes) {
    if (bytes.length < PNG_SIGNATURE.length) {
      throw new PngMetadataError("File is too small to be a PNG.");
    }
    for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
      if (bytes[index] !== PNG_SIGNATURE[index]) {
        throw new PngMetadataError("Selected file is not a PNG.");
      }
    }
  }

  function findNull(bytes, start) {
    for (let index = start; index < bytes.length; index += 1) {
      if (bytes[index] === 0) {
        return index;
      }
    }
    return -1;
  }

  function decodeLatin1(bytes) {
    return TEXT_DECODER_LATIN1.decode(bytes);
  }

  function decodeUtf8(bytes) {
    return TEXT_DECODER_UTF8.decode(bytes);
  }

  function inflate(bytes) {
    if (typeof require !== "function") {
      throw new PngMetadataError("Compressed PNG text needs Node zlib, but require() is unavailable.");
    }
    const zlib = require("zlib");
    return new Uint8Array(zlib.inflateSync(Buffer.from(bytes)));
  }

  function parseTextChunk(data, index) {
    const separator = findNull(data, 0);
    if (separator < 1) {
      return null;
    }
    return {
      chunkType: "tEXt",
      index,
      keyword: decodeLatin1(data.subarray(0, separator)),
      text: decodeLatin1(data.subarray(separator + 1)),
      compressed: false,
      language: "",
      translatedKeyword: ""
    };
  }

  function parseZtxtChunk(data, index) {
    const separator = findNull(data, 0);
    if (separator < 1 || separator + 2 > data.length) {
      return null;
    }
    const compressionMethod = data[separator + 1];
    if (compressionMethod !== 0) {
      return null;
    }
    return {
      chunkType: "zTXt",
      index,
      keyword: decodeLatin1(data.subarray(0, separator)),
      text: decodeLatin1(inflate(data.subarray(separator + 2))),
      compressed: true,
      language: "",
      translatedKeyword: ""
    };
  }

  function parseItxtChunk(data, index) {
    const keywordEnd = findNull(data, 0);
    if (keywordEnd < 1 || keywordEnd + 3 > data.length) {
      return null;
    }

    const compressionFlag = data[keywordEnd + 1];
    const compressionMethod = data[keywordEnd + 2];
    if ((compressionFlag !== 0 && compressionFlag !== 1) || compressionMethod !== 0) {
      return null;
    }

    const languageStart = keywordEnd + 3;
    const languageEnd = findNull(data, languageStart);
    if (languageEnd < 0) {
      return null;
    }
    const translatedStart = languageEnd + 1;
    const translatedEnd = findNull(data, translatedStart);
    if (translatedEnd < 0) {
      return null;
    }

    const rawText = data.subarray(translatedEnd + 1);
    const textBytes = compressionFlag === 1 ? inflate(rawText) : rawText;
    return {
      chunkType: "iTXt",
      index,
      keyword: decodeLatin1(data.subarray(0, keywordEnd)),
      text: decodeUtf8(textBytes),
      compressed: compressionFlag === 1,
      language: decodeLatin1(data.subarray(languageStart, languageEnd)),
      translatedKeyword: decodeUtf8(data.subarray(translatedStart, translatedEnd))
    };
  }

  function parsePngTextChunks(input) {
    const bytes = toUint8Array(input);
    assertPng(bytes);

    const entries = [];
    let offset = PNG_SIGNATURE.length;
    let chunkIndex = 0;

    while (offset + 12 <= bytes.length) {
      const length = readUInt32(bytes, offset);
      const type = readAscii(bytes, offset + 4, offset + 8);
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      const nextOffset = dataEnd + 4;

      if (dataEnd > bytes.length || nextOffset > bytes.length) {
        throw new PngMetadataError("PNG chunk length exceeds file size.");
      }

      const data = bytes.subarray(dataStart, dataEnd);
      const entry = type === "tEXt"
        ? parseTextChunk(data, chunkIndex)
        : type === "zTXt"
          ? parseZtxtChunk(data, chunkIndex)
          : type === "iTXt"
            ? parseItxtChunk(data, chunkIndex)
            : null;

      if (entry) {
        entries.push(entry);
      }
      if (type === "IEND") {
        break;
      }
      offset = nextOffset;
      chunkIndex += 1;
    }

    return entries;
  }

  function isParameters(entry) {
    return entry.keyword.trim().toLowerCase() === "parameters";
  }

  function isNamedEntry(entry, names) {
    const keyword = entry.keyword.trim().toLowerCase();
    return names.includes(keyword);
  }

  function chooseTextEntry(entries, names) {
    const matches = entries
      .filter((entry) => isNamedEntry(entry, names))
      .filter((entry) => entry.text.trim().length > 0);
    if (matches.length === 0) {
      return null;
    }
    const itxtMatches = matches.filter((entry) => entry.chunkType === "iTXt");
    if (itxtMatches.length > 0) {
      return itxtMatches[itxtMatches.length - 1];
    }
    return matches[matches.length - 1];
  }

  function chooseParameters(entries) {
    return chooseTextEntry(entries, ["parameters"]);
  }

  function chooseSource(entries) {
    return chooseTextEntry(entries, ["source", "sourse", "url", "website"]);
  }

  const api = {
    PngMetadataError,
    chooseParameters,
    chooseSource,
    parsePngTextChunks
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.PngTextMetadata = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

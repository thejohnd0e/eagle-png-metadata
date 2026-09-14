"use strict";

const assert = require("assert");
const zlib = require("zlib");
const { chooseParameters, chooseSource, parsePngTextChunks } = require("../js/png-text");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  return Buffer.concat([length, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
}

function png(chunks) {
  return Buffer.concat([PNG_SIGNATURE, chunk("IHDR", Buffer.alloc(13)), ...chunks, chunk("IEND", Buffer.alloc(0))]);
}

function textChunk(keyword, text) {
  return chunk("tEXt", Buffer.concat([Buffer.from(keyword, "latin1"), Buffer.from([0]), Buffer.from(text, "latin1")]));
}

function ztxtChunk(keyword, text) {
  return chunk("zTXt", Buffer.concat([
    Buffer.from(keyword, "latin1"),
    Buffer.from([0, 0]),
    zlib.deflateSync(Buffer.from(text, "latin1"))
  ]));
}

function itxtChunk(keyword, text, compressed = false) {
  const textBytes = Buffer.from(text, "utf8");
  return chunk("iTXt", Buffer.concat([
    Buffer.from(keyword, "latin1"),
    Buffer.from([0, compressed ? 1 : 0, 0]),
    Buffer.from("ru", "latin1"),
    Buffer.from([0]),
    Buffer.from("Параметры", "utf8"),
    Buffer.from([0]),
    compressed ? zlib.deflateSync(textBytes) : textBytes
  ]));
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("reads latin1 tEXt Parameters", () => {
  const entries = parsePngTextChunks(png([textChunk("Parameters", "simple prompt")]));
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].chunkType, "tEXt");
  assert.strictEqual(chooseParameters(entries).text, "simple prompt");
});

test("reads compressed zTXt Parameters", () => {
  const entries = parsePngTextChunks(png([ztxtChunk("parameters", "compressed prompt")]));
  assert.strictEqual(entries[0].chunkType, "zTXt");
  assert.strictEqual(entries[0].compressed, true);
  assert.strictEqual(chooseParameters(entries).text, "compressed prompt");
});

test("reads UTF-8 Cyrillic iTXt Parameters", () => {
  const prompt = "В осеннем лесу, мягкий свет";
  const entries = parsePngTextChunks(png([itxtChunk("Parameters", prompt)]));
  assert.strictEqual(entries[0].chunkType, "iTXt");
  assert.strictEqual(chooseParameters(entries).text, prompt);
});

test("reads compressed UTF-8 iTXt Parameters", () => {
  const prompt = "В осеннем лесу, compressed";
  const entries = parsePngTextChunks(png([itxtChunk("Parameters", prompt, true)]));
  assert.strictEqual(entries[0].compressed, true);
  assert.strictEqual(chooseParameters(entries).text, prompt);
});

test("prefers iTXt over earlier broken duplicate tEXt", () => {
  const entries = parsePngTextChunks(png([
    textChunk("Parameters", "Ð’ Ð¾ÑÐµÐ½Ð½ÐµÐ¼"),
    itxtChunk("Parameters", "В осеннем лесу")
  ]));
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(chooseParameters(entries).chunkType, "iTXt");
  assert.strictEqual(chooseParameters(entries).text, "В осеннем лесу");
});

test("uses last readable duplicate when no iTXt exists", () => {
  const entries = parsePngTextChunks(png([
    textChunk("Parameters", "first"),
    ztxtChunk("Parameters", "second")
  ]));
  assert.strictEqual(chooseParameters(entries).text, "second");
});

test("reads Source URL metadata", () => {
  const entries = parsePngTextChunks(png([
    itxtChunk("Source", "https://chatgpt.com/g/example")
  ]));
  assert.strictEqual(chooseSource(entries).text, "https://chatgpt.com/g/example");
});

test("supports misspelled Sourse URL metadata", () => {
  const entries = parsePngTextChunks(png([
    textChunk("Sourse", "https://chatgpt.com/g/misspelled")
  ]));
  assert.strictEqual(chooseSource(entries).text, "https://chatgpt.com/g/misspelled");
});

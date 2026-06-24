// Tests for fail-soft JSON parsing of model replies. Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFindings } from "../src/util/parseFindings.js";

test("parses a clean findings object", () => {
  const out = parseFindings('{"findings":[{"severity":"high","title":"X","detail":"d"}]}', "correctness");
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, "high");
  assert.equal(out[0].title, "X");
});

test("tolerates ```json fences and surrounding prose", () => {
  const text = 'Here you go:\n```json\n{"findings":[{"severity":"low","title":"Y","detail":"d"}]}\n```';
  const out = parseFindings(text, "tests");
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "Y");
});

test("accepts a bare array of findings", () => {
  const out = parseFindings('[{"severity":"medium","title":"Z","detail":"d"}]', "security");
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, "medium");
});

test("unknown severity falls back to info", () => {
  const out = parseFindings('{"findings":[{"severity":"spicy","title":"Q","detail":"d"}]}', "x");
  assert.equal(out[0].severity, "info");
});

test("unparseable text yields a single info parse-failure finding (no throw)", () => {
  const out = parseFindings("not json at all", "correctness");
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, "info");
  assert.equal(out[0].evidence, "parse-failure");
});

test("empty findings list -> empty array", () => {
  const out = parseFindings('{"findings":[]}', "tests");
  assert.deepEqual(out, []);
});

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");
const { assertNoirDepth5Vector, parseNoirDepth5Vector } = require("./noir-merkle-depth5-vector");

const source = readFileSync(resolve(__dirname, "../../noir/merkle-membership-depth5/src/main.nr"), "utf8");
const vector = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/merkle-membership-bn254-depth5.json"),
  "utf8",
));

function editDepth5Test(edit) {
  const marker = "fn matches_shared_merkle_membership_bn254_depth5_vector()";
  const start = source.indexOf(marker);
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n}", open);
  assert.notEqual(start, -1);
  assert.notEqual(open, -1);
  assert.notEqual(close, -1);
  return source.slice(0, open + 1) + edit(source.slice(open + 1, close)) + source.slice(close);
}

function editOriginalRootHelper(edit) {
  const marker = "fn assert_original_depth5_root(";
  const start = source.indexOf(marker);
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n}", open);
  assert.notEqual(start, -1);
  assert.notEqual(open, -1);
  assert.notEqual(close, -1);
  return source.slice(0, open + 1) + edit(source.slice(open + 1, close)) + source.slice(close);
}

test("keeps Noir depth-5 leaf, siblings, and directions aligned with the shared vector", () => {
  assert.deepEqual(assertNoirDepth5Vector(source, vector), {
    leaf: 11n,
    pathElements: [22n, 33n, 44n, 55n, 66n],
    pathIndices: [0, 1, 0, 1, 0],
    root: "12136329308075030584248930526969017718885956596408610026085681360932685199210",
  });
});

test("rejects a depth-5 Noir leaf that drifts from the shared vector", () => {
  const changed = editDepth5Test((body) => body.replace("let leaf = 11;", "let leaf = 12;"));
  assert.throws(() => assertNoirDepth5Vector(changed, vector), /leaf does not match/);
});

test("rejects depth-5 Noir sibling values that drift from the shared vector", () => {
  const changed = editDepth5Test((body) => body.replace(
    "[22, 33, 44, 55, 66]",
    "[22, 33, 44, 55, 67]",
  ));
  assert.throws(() => assertNoirDepth5Vector(changed, vector), /path elements do not match/);
});

test("rejects depth-5 Noir directions that drift from the shared vector", () => {
  const changed = editDepth5Test((body) => body.replace(
    "[false, true, false, true, false]",
    "[false, true, false, true, true]",
  ));
  assert.throws(() => assertNoirDepth5Vector(changed, vector), /path indices do not match/);
});

test("rejects a depth-5 Noir test that bypasses its shared-vector inputs", () => {
  const changed = editDepth5Test((body) => body.replace(
    "main(leaf, path_elements, path_indices, expected_root);",
    "main(12, path_elements, path_indices, expected_root);",
  ));
  assert.throws(() => parseNoirDepth5Vector(changed), /pass its declared values to main exactly once/);
});

test("rejects a depth-5 Noir root that drifts from the shared known-answer vector", () => {
  const changed = editDepth5Test((body) => body.replace(
    "12136329308075030584248930526969017718885956596408610026085681360932685199210",
    "12136329308075030584248930526969017718885956596408610026085681360932685199211",
  ));
  assert.throws(() => assertNoirDepth5Vector(changed, vector), /root does not match the shared vector/);
});

test("rejects a depth-5 adversarial helper root that drifts from the shared vector", () => {
  const changed = editOriginalRootHelper((body) => body.replace(
    "12136329308075030584248930526969017718885956596408610026085681360932685199210",
    "12136329308075030584248930526969017718885956596408610026085681360932685199211",
  ));
  assert.throws(() => assertNoirDepth5Vector(changed, vector), /adversarial root does not match/);
});

test("rejects a non-decimal depth-5 Noir expected root", () => {
  const changed = editDepth5Test((body) => body.replace(
    "let expected_root = 12136329308075030584248930526969017718885956596408610026085681360932685199210;",
    "let expected_root = h3;",
  ));
  assert.throws(() => parseNoirDepth5Vector(changed), /canonical unsigned decimal string/);
});

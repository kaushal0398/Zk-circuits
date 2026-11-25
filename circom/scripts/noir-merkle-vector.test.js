const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");
const { assertNoirMerkleVector, parseNoirMerkleVector } = require("./noir-merkle-vector");

const source = readFileSync(resolve(__dirname, "../../noir/merkle-membership/src/main.nr"), "utf8");
const vector = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/merkle-membership-bn254.json"),
  "utf8",
));

function editSharedVectorBody(edit) {
  const marker = "fn matches_shared_merkle_membership_bn254_vector()";
  const start = source.indexOf(marker);
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n}", open);
  assert.notEqual(start, -1);
  assert.notEqual(open, -1);
  assert.notEqual(close, -1);
  return source.slice(0, open + 1) + edit(source.slice(open + 1, close)) + source.slice(close);
}

function wrapSharedVectorTestInBlockComment() {
  const match = source.match(/fn matches_shared_merkle_membership_bn254_vector\(\)[\s\S]*?^\}/m);
  assert.ok(match);
  return source.replace(match[0], "/*\n" + match[0] + "\n*/");
}

test("keeps Noir's depth-4 constants aligned with the checked-in BN254 vector", () => {
  assert.deepEqual(assertNoirMerkleVector(source, vector), {
    leaf: 11n,
    pathElements: [22n, 33n, 44n, 55n],
    pathIndices: [0, 1, 0, 1],
    root: "15279200565368274915541710634944179633805310769512106586104924638980105011859",
  });
});

test("rejects a Noir leaf that drifts from the shared vector", () => {
  const changed = editSharedVectorBody((body) => body.replace("let leaf = 11;", "let leaf = 12;"));
  assert.throws(() => assertNoirMerkleVector(changed, vector), /leaf does not match/);
});

test("rejects Noir sibling values that drift from the shared vector", () => {
  const changed = editSharedVectorBody((body) => body.replace("[22, 33, 44, 55]", "[23, 33, 44, 55]"));
  assert.throws(() => assertNoirMerkleVector(changed, vector), /path elements do not match/);
});

test("rejects Noir directions that drift from the shared vector", () => {
  const changed = editSharedVectorBody((body) => body.replace(
    "[false, true, false, true]",
    "[true, true, false, true]",
  ));
  assert.throws(() => assertNoirMerkleVector(changed, vector), /path indices do not match/);
});

test("rejects a Noir root that drifts from the shared vector", () => {
  const changed = editSharedVectorBody((body) => body.replace(vector.root, "123456"));
  assert.throws(() => assertNoirMerkleVector(changed, vector), /root does not match/);
});

test("rejects duplicate declarations in the Noir shared-vector test", () => {
  const changed = editSharedVectorBody((body) => body.replace(
    "let leaf = 11;",
    "let leaf = 11;\n    let leaf = 11;",
  ));
  assert.throws(() => parseNoirMerkleVector(changed), /declare leaf exactly once/);
});

test("rejects a shared-vector test that bypasses its declared values", () => {
  const changed = editSharedVectorBody((body) => body.replace(
    "main(leaf, path_elements, path_indices, expected_root);",
    "main(12, path_elements, path_indices, expected_root);",
  ));
  assert.throws(() => assertNoirMerkleVector(changed, vector), /pass its declared values to main exactly once/);
});

test("rejects a missing shared-vector test", () => {
  const changed = source.replace(/fn matches_shared_merkle_membership_bn254_vector\(\)[\s\S]*?^\}/m, "");
  assert.throws(() => parseNoirMerkleVector(changed), /define the shared-vector test exactly once/);
});

test("rejects non-boolean direction literals in Noir", () => {
  const changed = editSharedVectorBody((body) => body.replace(
    "[false, true, false, true]",
    "[false, 2, false, true]",
  ));
  assert.throws(() => parseNoirMerkleVector(changed), /must be true or false/);
});

test("ignores a commented-out copy of the shared-vector test", () => {
  assert.throws(
    () => parseNoirMerkleVector(wrapSharedVectorTestInBlockComment()),
    /define the shared-vector test exactly once/,
  );
});

test("ignores commented-out declarations inside the active shared-vector test", () => {
  const changed = editSharedVectorBody((body) => body.replace(
    "let leaf = 11;",
    "let leaf = 11; /* let leaf = 12; */",
  ));
  assert.doesNotThrow(() => assertNoirMerkleVector(changed, vector));
});

test("ignores a commented-out main call when checking the active invocation", () => {
  const changed = editSharedVectorBody((body) => body.replace(
    "main(leaf, path_elements, path_indices, expected_root);",
    "/* main(12, path_elements, path_indices, expected_root); */\n    main(leaf, path_elements, path_indices, expected_root);",
  ));
  assert.doesNotThrow(() => assertNoirMerkleVector(changed, vector));
});

test("handles nested Noir block comments without treating their contents as code", () => {
  const changed = "/* outer /* inner fn matches_shared_merkle_membership_bn254_vector() {} */ still comment */\n" + source;
  assert.deepEqual(parseNoirMerkleVector(changed).leaf, 11n);
});

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");
const { parseMerkleVector, parseMerkleVectorAtDepth } = require("./merkle-vector");

const vectorPath = resolve(__dirname, "../../test-vectors/merkle-membership-bn254.json");
const vector = JSON.parse(readFileSync(vectorPath, "utf8"));
const depth5Vector = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/merkle-membership-bn254-depth5.json"),
  "utf8",
));
const fieldModulus = "21888242871839275222246405745257275088548364400416034343698204186575808495617";

function validVector(overrides = {}) {
  return {
    leaf: "11",
    pathElements: ["22", "33", "44", "55"],
    pathIndices: [0, 1, 0, 1],
    root: "15279200565368274915541710634944179633805310769512106586104924638980105011859",
    ...overrides,
  };
}

test("parses the checked-in depth-4 BN254 Merkle vector", () => {
  assert.deepEqual(parseMerkleVector(vector), {
    leaf: 11n,
    pathElements: [22n, 33n, 44n, 55n],
    pathIndices: [0, 1, 0, 1],
    root: "15279200565368274915541710634944179633805310769512106586104924638980105011859",
  });
});

test("rejects non-object vector input", () => {
  assert.throws(() => parseMerkleVector(null), /must be a JSON object/);
  assert.throws(() => parseMerkleVector([]), /must be a JSON object/);
});

test("rejects a path with the wrong number of siblings", () => {
  assert.throws(() => parseMerkleVector(validVector({ pathElements: ["22", "33", "44"] })), /pathElements must contain exactly 4 values/);
});

test("rejects a direction vector with the wrong depth", () => {
  assert.throws(() => parseMerkleVector(validVector({ pathIndices: [0, 1, 0] })), /pathIndices must contain exactly 4 values/);
});

test("rejects sparse Merkle sibling and direction arrays", () => {
  const sparsePathElements = ["22", "33", "44", "55"];
  delete sparsePathElements[2];
  assert.throws(
    () => parseMerkleVector(validVector({ pathElements: sparsePathElements })),
    /pathElements\\[2\\] must be a canonical unsigned decimal string/,
  );

  const sparsePathIndices = [0, 1, 0, 1];
  delete sparsePathIndices[3];
  assert.throws(
    () => parseMerkleVector(validVector({ pathIndices: sparsePathIndices })),
    /pathIndices\\[3\\] must be 0 or 1/,
  );
});

test("rejects direction values outside the boolean domain", () => {
  assert.throws(() => parseMerkleVector(validVector({ pathIndices: [0, 2, 0, 1] })), /pathIndices\[1\] must be 0 or 1/);
  assert.throws(() => parseMerkleVector(validVector({ pathIndices: [0, -1, 0, 1] })), /pathIndices\[1\] must be 0 or 1/);
});

test("rejects fractional and string direction values", () => {
  assert.throws(() => parseMerkleVector(validVector({ pathIndices: [0, 0.5, 0, 1] })), /pathIndices\[1\] must be 0 or 1/);
  assert.throws(() => parseMerkleVector(validVector({ pathIndices: [0, "1", 0, 1] })), /pathIndices\[1\] must be 0 or 1/);
});

test("rejects numeric field values instead of decimal strings", () => {
  assert.throws(() => parseMerkleVector(validVector({ leaf: 11 })), /leaf must be a canonical unsigned decimal string/);
});

test("rejects non-canonical or negative field encodings", () => {
  assert.throws(() => parseMerkleVector(validVector({ leaf: "01" })), /leaf must be a canonical unsigned decimal string/);
  assert.throws(() => parseMerkleVector(validVector({ root: "-1" })), /root must be a canonical unsigned decimal string/);
});

test("rejects field values outside the BN254 scalar field", () => {
  assert.throws(() => parseMerkleVector(validVector({ leaf: fieldModulus })), /leaf must be smaller than the BN254 scalar modulus/);
  assert.throws(() => parseMerkleVector(validVector({ pathElements: [ "22", "33", fieldModulus, "55" ] })), /pathElements\[2\] must be smaller than the BN254 scalar modulus/);
  assert.throws(() => parseMerkleVector(validVector({ root: fieldModulus })), /root must be smaller than the BN254 scalar modulus/);
});

test("parses the checked-in depth-5 BN254 Merkle shared-input vector", () => {
  assert.deepEqual(parseMerkleVectorAtDepth(depth5Vector, 5), {
    leaf: 11n,
    pathElements: [22n, 33n, 44n, 55n, 66n],
    pathIndices: [0, 1, 0, 1, 0],
    root: "12136329308075030584248930526969017718885956596408610026085681360932685199210",
  });
});


test("requires a positive safe integer Merkle depth", () => {
  for (const depth of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, "5"]) {
    assert.throws(
      () => parseMerkleVectorAtDepth(depth5Vector, depth),
      /depth must be a positive safe integer/,
    );
  }
});

test("requires a boolean root requirement option", () => {
  for (const requireRoot of [0, 1, "false", null]) {
    assert.throws(
      () => parseMerkleVectorAtDepth(depth5Vector, 5, requireRoot),
      /requireRoot must be a boolean/,
    );
  }
});

test("allows an omitted root only when explicitly optional and validates a supplied root", () => {
  const vectorWithoutRoot = { ...depth5Vector };
  delete vectorWithoutRoot.root;

  assert.deepEqual(parseMerkleVectorAtDepth(vectorWithoutRoot, 5, false), {
    leaf: 11n,
    pathElements: [22n, 33n, 44n, 55n, 66n],
    pathIndices: [0, 1, 0, 1, 0],
  });
  assert.throws(
    () => parseMerkleVectorAtDepth({ ...vectorWithoutRoot, root: "01" }, 5, false),
    /root must be a canonical unsigned decimal string/,
  );
});

test("rejects a depth-5 vector without a fixed known-answer root", () => {
  assert.throws(
    () => parseMerkleVectorAtDepth({ ...depth5Vector, root: undefined }, 5),
    /root must be a canonical unsigned decimal string/,
  );
});

test("rejects a depth-5 vector with only four siblings", () => {
  assert.throws(
    () => parseMerkleVectorAtDepth({ ...depth5Vector, pathElements: ["22", "33", "44", "55"] }, 5, false),
    /pathElements must contain exactly 5 values/,
  );
});

test("rejects a depth-5 vector with a direction count mismatch", () => {
  assert.throws(
    () => parseMerkleVectorAtDepth({ ...depth5Vector, pathIndices: [0, 1, 0, 1] }, 5, false),
    /pathIndices must contain exactly 5 values/,
  );
});

test("rejects non-canonical depth-5 field values and invalid directions", () => {
  assert.throws(
    () => parseMerkleVectorAtDepth({ ...depth5Vector, pathElements: ["22", "33", "044", "55", "66"] }, 5, false),
    /pathElements\[2\] must be a canonical unsigned decimal string/,
  );
  assert.throws(
    () => parseMerkleVectorAtDepth({ ...depth5Vector, pathIndices: [0, 1, 2, 1, 0] }, 5, false),
    /pathIndices\[2\] must be 0 or 1/,
  );
});

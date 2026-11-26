const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");
const { parsePoseidonVector } = require("./poseidon-vector");

const repositoryRoot = resolve(__dirname, "../..");
const hash1Vector = JSON.parse(readFileSync(
  resolve(repositoryRoot, "test-vectors/poseidon-hash-1-bn254.json"),
  "utf8",
));
const hash2Vector = JSON.parse(readFileSync(
  resolve(repositoryRoot, "test-vectors/poseidon-bn254.json"),
  "utf8",
));
const fieldModulus = "21888242871839275222246405745257275088548364400416034343698204186575808495617";
const largestFieldElement = (BigInt(fieldModulus) - 1n).toString();

function validVector(overrides = {}) {
  return {
    inputs: ["1"],
    output: "2",
    ...overrides,
  };
}

test("parses the checked-in one-input BN254 Poseidon vector", () => {
  assert.deepEqual(parsePoseidonVector(hash1Vector, 1), {
    inputs: [1n],
    output: BigInt(hash1Vector.output),
  });
});

test("parses the checked-in two-input BN254 Poseidon vector", () => {
  assert.deepEqual(parsePoseidonVector(hash2Vector, 2), {
    inputs: [1n, 2n],
    output: BigInt(hash2Vector.output),
  });
});

test("rejects non-object vector input", () => {
  assert.throws(() => parsePoseidonVector(null, 1), /must be a JSON object/);
  assert.throws(() => parsePoseidonVector([], 1), /must be a JSON object/);
});

test("requires a positive integer expected arity", () => {
  assert.throws(() => parsePoseidonVector(validVector(), 0), /expectedArity must be a positive integer/);
  assert.throws(() => parsePoseidonVector(validVector(), 1.5), /expectedArity must be a positive integer/);
});

test("requires an input array with the exact hash arity", () => {
  assert.throws(() => parsePoseidonVector(validVector({ inputs: "1" }), 1), /inputs must contain exactly 1 values/);
  assert.throws(() => parsePoseidonVector(validVector({ inputs: [] }), 1), /inputs must contain exactly 1 values/);
  assert.throws(() => parsePoseidonVector(validVector({ inputs: ["1", "2"] }), 1), /inputs must contain exactly 1 values/);
});

test("rejects sparse Poseidon input arrays", () => {
  const inputs = ["1", "2"];
  delete inputs[1];
  assert.throws(
    () => parsePoseidonVector(validVector({ inputs }), 2),
    /inputs\[1\] must be a canonical unsigned decimal string/,
  );
});

test("rejects numeric and non-canonical input encodings", () => {
  assert.throws(() => parsePoseidonVector(validVector({ inputs: [1] }), 1), /inputs\[0\] must be a canonical unsigned decimal string/);
  assert.throws(() => parsePoseidonVector(validVector({ inputs: ["01"] }), 1), /inputs\[0\] must be a canonical unsigned decimal string/);
  assert.throws(() => parsePoseidonVector(validVector({ inputs: ["-1"] }), 1), /inputs\[0\] must be a canonical unsigned decimal string/);
  assert.throws(() => parsePoseidonVector(validVector({ inputs: ["0x10"] }), 1), /inputs\[0\] must be a canonical unsigned decimal string/);
});

test("rejects inputs outside the BN254 scalar field", () => {
  assert.throws(() => parsePoseidonVector(validVector({ inputs: [fieldModulus] }), 1), /inputs\[0\] must be smaller than the BN254 scalar modulus/);
});

test("rejects numeric and non-canonical output encodings", () => {
  assert.throws(() => parsePoseidonVector(validVector({ output: 2 }), 1), /output must be a canonical unsigned decimal string/);
  assert.throws(() => parsePoseidonVector(validVector({ output: "02" }), 1), /output must be a canonical unsigned decimal string/);
  assert.throws(() => parsePoseidonVector(validVector({ output: "-1" }), 1), /output must be a canonical unsigned decimal string/);
});

test("rejects outputs outside the BN254 scalar field", () => {
  assert.throws(() => parsePoseidonVector(validVector({ output: fieldModulus }), 1), /output must be smaller than the BN254 scalar modulus/);
});

test("accepts the largest canonical BN254 field element", () => {
  assert.deepEqual(parsePoseidonVector(validVector({
    inputs: [largestFieldElement],
    output: largestFieldElement,
  }), 1), {
    inputs: [BigInt(largestFieldElement)],
    output: BigInt(largestFieldElement),
  });
});

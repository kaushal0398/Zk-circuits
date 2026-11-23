const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { buildPoseidon } = require("circomlibjs");
const { assertWitnessResult } = require("./witness-result");
const { parseMerkleVector } = require("./merkle-vector");
const { parsePoseidonVector } = require("./poseidon-vector");
const { parseWtns } = require("./wtns-format");

const buildRoot = resolve(tmpdir(), "zk-circuits-build");
const tempRoot = mkdtempSync(join(tmpdir(), "zk-circuits-witness-"));
const poseidonVectorData = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/poseidon-bn254.json"),
  "utf8",
));
const poseidonHash1VectorData = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/poseidon-hash-1-bn254.json"),
  "utf8",
));
const merkleVectorData = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/merkle-membership-bn254.json"),
  "utf8",
));

function runWitness(name, directory, circuitName, inputs, shouldPass) {
  const generated = resolve(buildRoot, directory, `${circuitName}_js`);
  const wasm = join(generated, `${circuitName}.wasm`);
  const calculator = join(generated, "generate_witness.js");
  const inputPath = join(tempRoot, `${name}.json`);
  const witnessPath = join(tempRoot, `${name}.wtns`);
  writeFileSync(inputPath, JSON.stringify(inputs));

  const result = spawnSync(process.execPath, [calculator, wasm, inputPath, witnessPath], {
    encoding: "utf8",
    timeout: 60_000,
  });
  assertWitnessResult(name, result, shouldPass);

  if (shouldPass) {
    parseWtns(readFileSync(witnessPath));
  }
  console.log(`PASS ${name}${shouldPass ? "" : " (rejected as expected)"}`);
}

async function main() {
  try {
    const poseidonVector = parsePoseidonVector(poseidonVectorData, 2, "Poseidon hash_2 vector");
    const poseidonHash1Vector = parsePoseidonVector(poseidonHash1VectorData, 1, "Poseidon hash_1 vector");
    const merkleVector = parseMerkleVector(merkleVectorData);

    runWitness("multiplier-valid", "multiplier", "multiplier", { a: "7", b: "9" }, true);
    runWitness("range-check-valid-zero", "range-check", "range_check", { value: "0" }, true);
    runWitness("range-check-valid-boundary", "range-check", "range_check", { value: "255" }, true);
    runWitness("range-check-rejects-256", "range-check", "range_check", { value: "256" }, false);

    const poseidon = await buildPoseidon();
    const fieldToString = (value) => poseidon.F.toString(value);
    const sharedVectorOutput = fieldToString(poseidon(poseidonVector.inputs));
    if (sharedVectorOutput !== poseidonVector.output.toString()) {
      throw new Error(
        `Poseidon BN254 shared vector mismatch: expected ${poseidonVector.output}, received ${sharedVectorOutput}`,
      );
    }
    console.log("PASS poseidon-bn254-shared-vector");

    const hash1VectorOutput = fieldToString(poseidon(poseidonHash1Vector.inputs));
    if (hash1VectorOutput !== poseidonHash1Vector.output.toString()) {
      throw new Error(
        `Poseidon BN254 hash_1 shared vector mismatch: expected ${poseidonHash1Vector.output}, received ${hash1VectorOutput}`,
      );
    }
    console.log("PASS poseidon-hash-1-bn254-shared-vector");
    runWitness("hash-preimage-shared-vector", "hash-preimage", "hash_preimage", {
      preimage: poseidonHash1Vector.inputs[0].toString(),
      digest: poseidonHash1Vector.output.toString(),
    }, true);

    const incrementField = (value) => (BigInt(fieldToString(value)) + 1n).toString();
    const preimage = 42n;
    const hash = poseidon([preimage]);
    const digest = fieldToString(hash);
    runWitness("hash-preimage-valid", "hash-preimage", "hash_preimage", {
      preimage: preimage.toString(), digest,
    }, true);
    runWitness("hash-preimage-rejects-wrong-digest", "hash-preimage", "hash_preimage", {
      preimage: preimage.toString(), digest: incrementField(hash),
    }, false);

    const leaf = merkleVector.leaf;
    const pathElements = merkleVector.pathElements;
    const pathIndices = merkleVector.pathIndices;
    let current = leaf;
    for (let i = 0; i < pathElements.length; i += 1) {
      const pair = pathIndices[i] === 0
        ? [current, pathElements[i]]
        : [pathElements[i], current];
      current = poseidon(pair);
    }
    const calculatedRoot = fieldToString(current);
    if (calculatedRoot !== merkleVector.root) {
      throw new Error(
        `Merkle membership BN254 shared vector mismatch: expected ${merkleVector.root}, received ${calculatedRoot}`,
      );
    }
    console.log("PASS merkle-membership-bn254-shared-vector");

    const merkleInputs = {
      leaf: leaf.toString(),
      pathElements: pathElements.map(String),
      pathIndices: pathIndices.map(String),
      root: merkleVector.root,
    };
    runWitness("merkle-membership-valid", "merkle-membership", "merkle_membership", merkleInputs, true);
    runWitness("merkle-membership-rejects-wrong-root", "merkle-membership", "merkle_membership", {
      ...merkleInputs,
      root: incrementField(current),
    }, false);
    runWitness("merkle-membership-rejects-non-boolean-index", "merkle-membership", "merkle_membership", {
      ...merkleInputs,
      pathIndices: ["2", "1", "0", "1"],
    }, false);
    runWitness("merkle-membership-rejects-negative-index", "merkle-membership", "merkle_membership", {
      ...merkleInputs,
      pathIndices: ["-1", "1", "0", "1"],
    }, false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

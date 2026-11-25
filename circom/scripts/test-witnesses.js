const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { buildPoseidon } = require("circomlibjs");
const { assertWitnessResult } = require("./witness-result");
const { assertR1csWitnessResult } = require("./r1cs-witness");
const { assertR1csPublicInterface } = require("./r1cs-info");
const { assertPublicWitnessOrder, assertWitnessSignals } = require("./witness-symbols");
const { BN254_SCALAR_FIELD, parseMerkleVector } = require("./merkle-vector");
const { parsePoseidonVector } = require("./poseidon-vector");
const { parseWtns } = require("./wtns-format");

const buildRoot = resolve(tmpdir(), "zk-circuits-build");
const checkedR1csInterfaces = new Set();
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

function runWitness(name, directory, circuitName, inputs, shouldPass, expectedSignals, expectedInterface) {
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
    const witness = parseWtns(readFileSync(witnessPath), {
      expectedPrimeField: BN254_SCALAR_FIELD,
      includeWitnessValues: expectedSignals !== undefined,
    });
    const r1csPath = resolve(buildRoot, directory, `${circuitName}.r1cs`);
    if (expectedSignals !== undefined) {
      if (!expectedInterface || !Array.isArray(expectedInterface.publicSignals)) {
        throw new TypeError(`${name}: expected R1CS public interface must be provided`);
      }
      const symbolsPath = resolve(buildRoot, directory, `${circuitName}.sym`);
      const symbolContent = readFileSync(symbolsPath, "utf8");
      assertPublicWitnessOrder(name, witness.witnessCount, symbolContent, expectedInterface.publicSignals);
      assertWitnessSignals(name, witness.witnessValues, symbolContent, expectedSignals);

      if (!checkedR1csInterfaces.has(r1csPath)) {
        const info = spawnSync("snarkjs", ["r1cs", "info", r1csPath], {
          encoding: "utf8",
          timeout: 60_000,
        });
        assertR1csPublicInterface(name, info, expectedInterface);
        checkedR1csInterfaces.add(r1csPath);
        console.log(`PASS ${name}-r1cs-public-interface`);
      }
    }
    const check = spawnSync("snarkjs", [
      "wtns", "check", r1csPath, witnessPath,
    ], {
      encoding: "utf8",
      timeout: 60_000,
    });
    assertR1csWitnessResult(name, check);
    console.log(`PASS ${name}-r1cs-constraints`);
  }
  console.log(`PASS ${name}${shouldPass ? "" : " (rejected as expected)"}`);
}

async function main() {
  try {
    const poseidonVector = parsePoseidonVector(poseidonVectorData, 2, "Poseidon hash_2 vector");
    const poseidonHash1Vector = parsePoseidonVector(poseidonHash1VectorData, 1, "Poseidon hash_1 vector");
    const merkleVector = parseMerkleVector(merkleVectorData);

    runWitness("multiplier-valid", "multiplier", "multiplier", { a: "7", b: "9" }, true, {
      "main.a": "7",
      "main.b": "9",
      "main.product": "63",
    }, { publicOutputs: 1, publicInputs: 0, publicSignals: ["main.product", "main.a", "main.b"] });
    runWitness("range-check-valid-zero", "range-check", "range_check", { value: "0" }, true, { "main.value": "0" }, { publicOutputs: 0, publicInputs: 1, publicSignals: ["main.value"] });
    runWitness("range-check-valid-boundary", "range-check", "range_check", { value: "255" }, true, { "main.value": "255" }, { publicOutputs: 0, publicInputs: 1, publicSignals: ["main.value"] });
    runWitness("range-check-rejects-256", "range-check", "range_check", { value: "256" }, false);
    runWitness("range-check-rejects-bn254-modulus-minus-one", "range-check", "range_check", {
      value: (BN254_SCALAR_FIELD - 1n).toString(),
    }, false);

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
    }, true, { "main.digest": poseidonHash1Vector.output.toString() }, { publicOutputs: 0, publicInputs: 1, publicSignals: ["main.digest"] });

    const incrementField = (value) => (BigInt(fieldToString(value)) + 1n).toString();
    const preimage = 42n;
    const hash = poseidon([preimage]);
    const digest = fieldToString(hash);
    runWitness("hash-preimage-valid", "hash-preimage", "hash_preimage", {
      preimage: preimage.toString(), digest,
    }, true, { "main.digest": digest }, { publicOutputs: 0, publicInputs: 1, publicSignals: ["main.digest"] });
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
    runWitness("merkle-membership-valid", "merkle-membership", "merkle_membership", merkleInputs, true, { "main.root": merkleVector.root }, { publicOutputs: 0, publicInputs: 1, publicSignals: ["main.root"] });
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

    runWitness("merkle-membership-rejects-tampered-leaf", "merkle-membership", "merkle_membership", {
      ...merkleInputs,
      leaf: (leaf + 1n).toString(),
    }, false);

    for (let index = 0; index < pathElements.length; index += 1) {
      const tamperedPathElements = pathElements.map((element, elementIndex) =>
        elementIndex === index ? (element + 1n).toString() : element.toString());
      runWitness(`merkle-membership-rejects-tampered-sibling-${index}`, "merkle-membership", "merkle_membership", {
        ...merkleInputs,
        pathElements: tamperedPathElements,
      }, false);

      const flippedPathIndices = pathIndices.map((direction, directionIndex) =>
        directionIndex === index ? 1 - direction : direction);
      runWitness(`merkle-membership-rejects-flipped-direction-${index}`, "merkle-membership", "merkle_membership", {
        ...merkleInputs,
        pathIndices: flippedPathIndices.map(String),
      }, false);
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

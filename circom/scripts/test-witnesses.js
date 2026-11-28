const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { buildPoseidon } = require("circomlibjs");
const { assertWitnessResult } = require("./witness-result");
const { assertR1csWitnessResult } = require("./r1cs-witness");
const { assertR1csPublicInterface } = require("./r1cs-info");
const { assertPublicWitnessOrder, assertWitnessSignals } = require("./witness-symbols");
const { BN254_SCALAR_FIELD, parseMerkleVector, parseMerkleVectorAtDepth } = require("./merkle-vector");
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
const merkleDepth5VectorData = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/merkle-membership-bn254-depth5.json"),
  "utf8",
));
const merkleDepth5PatternVectorData = JSON.parse(readFileSync(
  resolve(__dirname, "../../test-vectors/merkle-membership-bn254-depth5-path-patterns.json"),
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

    const merkleDepth5Vector = parseMerkleVectorAtDepth(merkleDepth5VectorData, 5);
    let depth5Root = merkleDepth5Vector.leaf;
    for (let i = 0; i < merkleDepth5Vector.pathElements.length; i += 1) {
      const pair = merkleDepth5Vector.pathIndices[i] === 0
        ? [depth5Root, merkleDepth5Vector.pathElements[i]]
        : [merkleDepth5Vector.pathElements[i], depth5Root];
      depth5Root = poseidon(pair);
    }
    const depth5RootString = fieldToString(depth5Root);
    if (depth5RootString !== merkleDepth5Vector.root) {
      throw new Error(
        `Merkle membership BN254 depth-5 shared vector mismatch: expected ${merkleDepth5Vector.root}, received ${depth5RootString}`,
      );
    }
    console.log("PASS merkle-membership-bn254-depth5-shared-vector");

    const merkleDepth5Inputs = {
      leaf: merkleDepth5Vector.leaf.toString(),
      pathElements: merkleDepth5Vector.pathElements.map(String),
      pathIndices: merkleDepth5Vector.pathIndices.map(String),
      root: merkleDepth5Vector.root,
    };
    runWitness(
      "merkle-membership-depth5-valid",
      "merkle-membership-depth5",
      "merkle_membership_depth5",
      merkleDepth5Inputs,
      true,
      { "main.root": depth5RootString },
      { publicOutputs: 0, publicInputs: 1, publicSignals: ["main.root"] },
    );
    const expectedDepth5PatternNames = ["all-left", "all-right", "reverse-alternating"];
    if (!Array.isArray(merkleDepth5PatternVectorData.patterns)
      || merkleDepth5PatternVectorData.patterns.length !== expectedDepth5PatternNames.length) {
      throw new Error("Depth-5 Merkle orientation vectors must contain exactly the supported path patterns");
    }
    const seenDepth5PatternNames = new Set();
    for (const pattern of merkleDepth5PatternVectorData.patterns) {
      if (!expectedDepth5PatternNames.includes(pattern.name) || seenDepth5PatternNames.has(pattern.name)) {
        throw new Error(\`Unexpected or duplicate depth-5 Merkle path pattern: \${pattern.name}\`);
      }
      seenDepth5PatternNames.add(pattern.name);
      const patternVector = parseMerkleVectorAtDepth({
        leaf: merkleDepth5VectorData.leaf,
        pathElements: merkleDepth5VectorData.pathElements,
        pathIndices: pattern.pathIndices,
        root: pattern.root,
      }, 5);
      let patternRoot = patternVector.leaf;
      for (let index = 0; index < patternVector.pathElements.length; index += 1) {
        const pair = patternVector.pathIndices[index] === 0
          ? [patternRoot, patternVector.pathElements[index]]
          : [patternVector.pathElements[index], patternRoot];
        patternRoot = poseidon(pair);
      }
      const patternRootString = fieldToString(patternRoot);
      if (patternRootString !== patternVector.root) {
        throw new Error(
          \`Depth-5 Merkle \${pattern.name} known-answer root mismatch: expected \${patternVector.root}, received \${patternRootString}\`,
        );
      }
      const patternInputs = {
        leaf: patternVector.leaf.toString(),
        pathElements: patternVector.pathElements.map(String),
        pathIndices: patternVector.pathIndices.map(String),
        root: patternVector.root,
      };
      runWitness(
        \`merkle-membership-depth5-\${pattern.name}-valid\`,
        "merkle-membership-depth5",
        "merkle_membership_depth5",
        patternInputs,
        true,
        { "main.root": patternVector.root },
        { publicOutputs: 0, publicInputs: 1, publicSignals: ["main.root"] },
      );
    }
    if (seenDepth5PatternNames.size !== expectedDepth5PatternNames.length) {
      throw new Error("Depth-5 Merkle orientation vectors are missing a required path pattern");
    }

    runWitness(
      "merkle-membership-depth5-rejects-wrong-root",
      "merkle-membership-depth5",
      "merkle_membership_depth5",
      { ...merkleDepth5Inputs, root: incrementField(depth5Root) },
      false,
    );

    runWitness("merkle-membership-depth5-rejects-non-boolean-index", "merkle-membership-depth5", "merkle_membership_depth5", {
      ...merkleDepth5Inputs,
      pathIndices: ["2", "1", "0", "1", "0"],
    }, false);
    runWitness("merkle-membership-depth5-rejects-negative-index", "merkle-membership-depth5", "merkle_membership_depth5", {
      ...merkleDepth5Inputs,
      pathIndices: ["-1", "1", "0", "1", "0"],
    }, false);
    runWitness("merkle-membership-depth5-rejects-tampered-leaf", "merkle-membership-depth5", "merkle_membership_depth5", {
      ...merkleDepth5Inputs,
      leaf: (merkleDepth5Vector.leaf + 1n).toString(),
    }, false);

    for (let index = 0; index < merkleDepth5Vector.pathElements.length; index += 1) {
      const tamperedPathElements = merkleDepth5Vector.pathElements.map((element, elementIndex) =>
        elementIndex === index ? (element + 1n).toString() : element.toString());
      runWitness(`merkle-membership-depth5-rejects-tampered-sibling-${index}`, "merkle-membership-depth5", "merkle_membership_depth5", {
        ...merkleDepth5Inputs,
        pathElements: tamperedPathElements,
      }, false);

      const flippedPathIndices = merkleDepth5Vector.pathIndices.map((direction, directionIndex) =>
        directionIndex === index ? 1 - direction : direction);
      runWitness(`merkle-membership-depth5-rejects-flipped-direction-${index}`, "merkle-membership-depth5", "merkle_membership_depth5", {
        ...merkleDepth5Inputs,
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

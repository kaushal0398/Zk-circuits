const { execFileSync } = require("node:child_process");
const { mkdirSync, statSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const buildRoot = resolve(tmpdir(), "zk-circuits-build");
const circuits = [
  ["multiplier", "multiplier.circom", "multiplier"],
  ["range-check", "range_check.circom", "range_check"],
  ["merkle-membership", "merkle_membership.circom", "merkle_membership"],
  ["hash-preimage", "hash_preimage.circom", "hash_preimage"],
];

for (const [directory, file, circuitName] of circuits) {
  const source = resolve(root, directory, file);
  const output = resolve(buildRoot, directory);
  mkdirSync(output, { recursive: true });
  execFileSync("npx", [
    "circom2", source, "--r1cs", "--wasm", "--sym",
    "-l", resolve(root, "node_modules"), "-o", output,
  ], { stdio: "inherit" });

  const artifacts = [
    resolve(output, `${circuitName}.r1cs`),
    resolve(output, `${circuitName}.sym`),
    resolve(output, `${circuitName}_js`, `${circuitName}.wasm`),
    resolve(output, `${circuitName}_js`, "generate_witness.js"),
  ];

  for (const artifact of artifacts) {
    let size;
    try {
      size = statSync(artifact).size;
    } catch (error) {
      throw new Error(`Missing compiled artifact for ${directory}: ${artifact}`, { cause: error });
    }
    if (size === 0) {
      throw new Error(`Compiled artifact is empty for ${directory}: ${artifact}`);
    }
  }
  console.log(`Verified compiled artifacts for ${directory}`);
}

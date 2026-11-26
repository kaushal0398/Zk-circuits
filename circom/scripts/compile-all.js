const { execFileSync } = require("node:child_process");
const { lstatSync, mkdirSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const buildRoot = resolve(tmpdir(), "zk-circuits-build");
const circuits = [
  ["multiplier", "multiplier.circom", "multiplier", "multiplier"],
  ["range-check", "range_check.circom", "range-check", "range_check"],
  ["merkle-membership", "merkle_membership.circom", "merkle-membership", "merkle_membership"],
  ["merkle-membership", "merkle_membership_depth5.circom", "merkle-membership-depth5", "merkle_membership_depth5"],
  ["hash-preimage", "hash_preimage.circom", "hash-preimage", "hash_preimage"],
];

for (const [sourceDirectory, file, outputDirectory, circuitName] of circuits) {
  const source = resolve(root, sourceDirectory, file);
  const output = resolve(buildRoot, outputDirectory);
  // Remove artifacts from previous runs so a partial or skipped output cannot pass validation.
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  execFileSync("npx", [
    "circom2", source, "--prime", "bn128", "--r1cs", "--wasm", "--sym",
    "-l", resolve(root, "node_modules"), "-o", output,
  ], { stdio: "inherit" });

  const artifacts = [
    resolve(output, `${circuitName}.r1cs`),
    resolve(output, `${circuitName}.sym`),
    resolve(output, `${circuitName}_js`, `${circuitName}.wasm`),
    resolve(output, `${circuitName}_js`, "generate_witness.js"),
  ];

  for (const artifact of artifacts) {
    let metadata;
    try {
      metadata = lstatSync(artifact);
    } catch (error) {
      throw new Error(`Missing compiled artifact for ${outputDirectory}: ${artifact}`, { cause: error });
    }
    if (!metadata.isFile()) {
      throw new Error(`Compiled artifact is not a regular file for ${outputDirectory}: ${artifact}`);
    }
    if (metadata.size === 0) {
      throw new Error(`Compiled artifact is empty for ${outputDirectory}: ${artifact}`);
    }
  }
  console.log(`Verified compiled artifacts for ${outputDirectory}`);
}

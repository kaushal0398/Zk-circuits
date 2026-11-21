const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const buildRoot = resolve(tmpdir(), "zk-circuits-build");
const circuits = [
  ["multiplier", "multiplier.circom"],
  ["range-check", "range_check.circom"],
  ["merkle-membership", "merkle_membership.circom"],
  ["hash-preimage", "hash_preimage.circom"],
];

for (const [directory, file] of circuits) {
  const source = resolve(root, directory, file);
  const output = resolve(buildRoot, directory);
  mkdirSync(output, { recursive: true });
  execFileSync("npx", [
    "circom2", source, "--r1cs", "--wasm", "--sym",
    "-l", resolve(root, "node_modules"), "-o", output,
  ], { stdio: "inherit" });

  const artifacts = [
    resolve(output, `${directory === "range-check" ? "range_check" : directory.replace(/-/g, "_")}.r1cs`),
    resolve(output, `${directory === "range-check" ? "range_check" : directory.replace(/-/g, "_")}.sym`),
    resolve(output, `${directory === "range-check" ? "range_check" : directory.replace(/-/g, "_")}_js`, `${directory === "range-check" ? "range_check" : directory.replace(/-/g, "_")}.wasm`),
    resolve(output, `${directory === "range-check" ? "range_check" : directory.replace(/-/g, "_")}_js`, "generate_witness.js"),
  ];

  for (const artifact of artifacts) {
    let size;
    try {
      size = require("node:fs").statSync(artifact).size;
    } catch (error) {
      throw new Error(`Missing compiled artifact for ${directory}: ${artifact}`, { cause: error });
    }
    if (size === 0) {
      throw new Error(`Compiled artifact is empty for ${directory}: ${artifact}`);
    }
  }
  console.log(`Verified compiled artifacts for ${directory}`);
}

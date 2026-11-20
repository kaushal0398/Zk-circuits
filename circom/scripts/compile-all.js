const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const circuits = [
  ["multiplier", "multiplier.circom"],
  ["range-check", "range_check.circom"],
  ["merkle-membership", "merkle_membership.circom"],
  ["hash-preimage", "hash_preimage.circom"],
];

for (const [directory, file] of circuits) {
  const source = resolve(root, directory, file);
  const output = resolve("/tmp/zk-circuits-build", directory);
  mkdirSync(output, { recursive: true });
  execFileSync("npx", [
    "circom2", source, "--r1cs", "--wasm", "--sym",
    "-l", resolve(root, "node_modules"), "-o", output,
  ], { stdio: "inherit" });
}

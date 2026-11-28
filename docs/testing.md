# Testing and local checks

## Noir

Install Nargo using the pinned version in `.github/workflows/circuits.yml`, then run each package:

```bash
for package in noir/*; do
  if [ -f "$package/Nargo.toml" ]; then
    (cd "$package" && nargo check && nargo test)
  fi
done
```

The Noir packages cover multiplication, an 8-bit range check, Poseidon hash preimages, and depth-4 and depth-5 Poseidon Merkle membership. Both depth-4 and depth-5 packages include adversarial tests for changed leaves, every sibling, and every direction bit. The depth-5 package checks its five-level path against the shared depth-5 known-answer root, accepts all-left, all-right, and reverse-alternating paths against three additional fixed roots shared with Circom, and rejects a mismatched public root. Circom additionally rejects a changed depth-5 leaf, each changed sibling, each flipped direction bit, and non-boolean or negative direction indices.

## Circom

Install Node.js 22, then run:

```bash
cd circom
npm install
npm test
```

The test command compiles every Circom circuit into a `zk-circuits-build` directory under Node.js's platform-specific temporary directory (`os.tmpdir()`), then calculates witnesses with the generated WebAssembly calculators. The same resolved directory is used by both scripts, so the workflow does not depend on a POSIX-only `/tmp` path.

Circom compilation explicitly selects `--prime bn128`, which is the BN254 scalar field used by these circuits. Every successful witness is parsed as a WTNS v2 file with that exact expected modulus; a file declaring a different prime field is rejected before its witness values are trusted. The parser also validates the file header, section boundaries, field width, witness count, and exact witness payload length, and requires witness slot 0 to contain the constant one from Circom's witness layout. Successful witnesses are decoded and their public signal values are checked against the compiler-generated `.sym` mapping, so tests verify actual public values at their compiled witness positions rather than only accepting a structurally valid WTNS file. The witness runner also verifies that each circuit's declared public outputs and public inputs occupy the expected contiguous witness slots after the constant-one slot, preserving Circom's output-then-public-input ordering. It also runs `snarkjs r1cs info` for each compiled circuit and checks that the compiled R1CS curve is `bn-128` (BN254), and that its output and public-input counts match the declared public interface. Each successful witness is also checked against its compiled R1CS with pinned `snarkjs` 0.7.6 (`snarkjs wtns check <circuit.r1cs> <witness.wtns>`), verifying that every witness satisfies the circuit constraints. The field width must match the 64-bit word-rounded modulus size used by snarkjs: `ceil(bitLength(modulus) / 64) * 8` bytes. It rejects witness values greater than or equal to the expected modulus, ensuring each encoded value is a canonical field element, and checks that the declared modulus is prime using Node.js's built-in primality test. See the [snarkjs WTNS writer](https://github.com/iden3/snarkjs/blob/master/src/wtns_utils.js) for the width encoding.

The Circom unit suite validates the checked-in depth-4 known-answer vector and the depth-5 shared-input vector before witness generation. Both require exactly the configured number of siblings and direction bits, accept only numeric direction bits `0` and `1`, and require leaf and sibling values to be canonical unsigned decimal strings inside the BN254 scalar field. Both depth-4 and depth-5 vectors contain fixed expected roots; the depth-5 root is recomputed by the pinned Poseidon implementation and compared with its checked-in known-answer value during witness testing.

The unit suite checks the depth-4 Noir constants and `main(...)` invocation against the checked-in known-answer vector. It also checks the depth-5 Noir leaf, five siblings, five direction bits, and fixed expected root against the depth-5 shared known-answer vector, plus all three orientation-specific roots and their corresponding Noir test inputs against the shared path-pattern vector file. The source validator removes line and nested block comments before parsing, so commented-out declarations or calls cannot satisfy these synchronization checks.

Witness tests cover:
- A valid multiplication witness whose compiled public `product` value is checked against 63.
- The lower and upper valid 8-bit boundaries (0 and 255), with their compiled public values checked, and rejection of 256.
- Rejection of the BN254 scalar-field maximum (`p - 1`) as an unsigned 8-bit value.
- A Poseidon hash preimage whose compiled public digest is checked against the expected value, and rejection of a mismatched digest.
- A depth-4 Poseidon Merkle path whose compiled public root is checked against the fixed shared known-answer vector, and rejection of a mismatched root.
- A depth-5 Poseidon Merkle path using five shared siblings, direction bits, and a fixed known-answer root; circomlibjs recomputes the root and the compiled depth-5 R1CS checks the witness, with rejection of a mismatched root.
- Valid depth-5 all-left, all-right, and reverse-alternating paths; each root is pinned in `merkle-membership-bn254-depth5-path-patterns.json`, independently recomputed with pinned circomlibjs, and checked against the compiled depth-5 R1CS. Noir uses the same fixed roots, and the Circom unit suite checks that its test literals match the shared vectors.
- Rejection when the private leaf or any one of the four depth-4 sibling nodes is changed while the original root is retained; depth-5 Circom tests repeat this for the leaf and all five siblings.
- Rejection when any one of the four depth-4 valid direction bits is flipped while the original root is retained; depth-5 Circom tests repeat this for all five direction bits.
- Rejection of non-boolean and negative Merkle direction indices at both Circom depths.

Poseidon `hash_1([1])`, `hash_2([1, 2])`, and the depth-4 Merkle membership case use checked-in BN254 known-answer vectors. Circom checks them through the pinned `circomlibjs` implementation, while Noir checks the same expected values in its package tests. The depth-5 case extends path-length coverage with a checked-in BN254 known-answer root. The value was computed with the pinned circomlibjs Poseidon implementation, then checked by Circom during witness testing and by Noir against the same literal root. Both implementations use the same leaf, siblings, directions, and expected root. These tests do not establish equivalence for all inputs or generate a proof.

## Continuous integration

The GitHub Actions workflow compiles and exercises Circom witnesses and runs `nargo check` plus `nargo test` for every Noir package on pushes and pull requests targeting `main`.

A successful compile or witness calculation is not a security review. Before relying on a circuit, review its constraints, field semantics, public/private input declarations, trusted setup, and verifier integration.

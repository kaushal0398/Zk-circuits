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

The Noir packages cover multiplication, an 8-bit range check, Poseidon hash preimages, and depth-4 Poseidon Merkle membership. Their tests include successful statements and deliberately failing assertions. The Merkle package rejects a changed leaf, each sibling changed independently, and each valid direction bit flipped independently while retaining the original public root, matching the Circom adversarial cases.

## Circom

Install Node.js 22, then run:

```bash
cd circom
npm install
npm test
```

The test command compiles every Circom circuit into a `zk-circuits-build` directory under Node.js's platform-specific temporary directory (`os.tmpdir()`), then calculates witnesses with the generated WebAssembly calculators. The same resolved directory is used by both scripts, so the workflow does not depend on a POSIX-only `/tmp` path.

Circom compilation explicitly selects `--prime bn128`, which is the BN254 scalar field used by these circuits. Every successful witness is parsed as a WTNS v2 file with that exact expected modulus; a file declaring a different prime field is rejected before its witness values are trusted. The parser also validates the file header, section boundaries, field width, witness count, and exact witness payload length, and requires witness slot 0 to contain the constant one from Circom's witness layout. Successful witnesses are decoded and their public signal values are checked against the compiler-generated `.sym` mapping, so tests verify actual public values at their compiled witness positions rather than only accepting a structurally valid WTNS file. The witness runner also verifies that each circuit's declared public outputs and public inputs occupy the expected contiguous witness slots after the constant-one slot, preserving Circom's output-then-public-input ordering. It also runs `snarkjs r1cs info` for each compiled circuit and checks that the compiled R1CS curve is `bn-128` (BN254), and that its output and public-input counts match the declared public interface. Each successful witness is also checked against its compiled R1CS with pinned `snarkjs` 0.7.6 (`snarkjs wtns check <circuit.r1cs> <witness.wtns>`), verifying that every witness satisfies the circuit constraints. The field width must match the 64-bit word-rounded modulus size used by snarkjs: `ceil(bitLength(modulus) / 64) * 8` bytes. It rejects witness values greater than or equal to the expected modulus, ensuring each encoded value is a canonical field element, and checks that the declared modulus is prime using Node.js's built-in primality test. See the [snarkjs WTNS writer](https://github.com/iden3/snarkjs/blob/master/src/wtns_utils.js) for the width encoding.

The Circom unit suite also validates the checked-in depth-4 Merkle vector before it is used for witness generation. It requires exactly four siblings and direction bits, accepts only numeric direction bits `0` and `1`, and requires leaf, sibling, and root values to be canonical unsigned decimal strings inside the BN254 scalar field. This prevents malformed vector data from being silently interpreted by the reference-root calculation.

Witness tests cover:
- A valid multiplication witness whose compiled public `product` value is checked against 63.
- The lower and upper valid 8-bit boundaries (0 and 255), with their compiled public values checked, and rejection of 256.
- Rejection of the BN254 scalar-field maximum (`p - 1`) as an unsigned 8-bit value.
- A Poseidon hash preimage whose compiled public digest is checked against the expected value, and rejection of a mismatched digest.
- A depth-4 Poseidon Merkle path whose compiled public root is checked against the shared vector, and rejection of a mismatched root.
- Rejection when the private leaf or any one of the four sibling nodes is changed while the original root is retained.
- Rejection when any one of the four valid direction bits is flipped while the original root is retained.
- Rejection of non-boolean and negative Merkle direction indices.

Poseidon `hash_1([1])`, `hash_2([1, 2])`, and the depth-4 Merkle membership case use checked-in BN254 known-answer vectors. Circom checks them through the pinned `circomlibjs` implementation, while Noir checks the same expected values in its package tests. The one-input hash vector is based on the `circomlibjs` Poseidon test vector. This covers the selected hash inputs and Merkle path only; it does not establish equivalence for all inputs or generate a proof.

## Continuous integration

The GitHub Actions workflow compiles and exercises Circom witnesses and runs `nargo check` plus `nargo test` for every Noir package on pushes and pull requests targeting `main`.

A successful compile or witness calculation is not a security review. Before relying on a circuit, review its constraints, field semantics, public/private input declarations, trusted setup, and verifier integration.

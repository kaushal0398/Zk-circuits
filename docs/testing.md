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

The Noir packages cover multiplication, an 8-bit range check, Poseidon hash preimages, and depth-4 Poseidon Merkle membership. Their tests include successful statements and deliberately failing assertions.

## Circom

Install Node.js 22, then run:

```bash
cd circom
npm install
npm test
```

The test command compiles every Circom circuit into a `zk-circuits-build` directory under Node.js's platform-specific temporary directory (`os.tmpdir()`), then calculates witnesses with the generated WebAssembly calculators. The same resolved directory is used by both scripts, so the workflow does not depend on a POSIX-only `/tmp` path.

Successful witness outputs are parsed as WTNS v2 files. The harness validates the file header, section boundaries, field width, witness count, and exact witness payload length. The field width must match the 64-bit word-rounded modulus size used by snarkjs: `ceil(bitLength(modulus) / 64) * 8` bytes. It also reads the prime-field modulus from the WTNS header and rejects witness values greater than or equal to that modulus, ensuring each encoded value is a canonical field element. The parser also checks that the declared modulus is prime using Node.js's built-in primality test. See the [snarkjs WTNS writer](https://github.com/iden3/snarkjs/blob/master/src/wtns_utils.js) for the width encoding.

Witness tests cover:
- A valid multiplication witness.
- The upper valid 8-bit boundary (255) and rejection of 256.
- A Poseidon hash preimage and rejection of a mismatched public digest.
- A depth-4 Poseidon Merkle path and rejection of a mismatched public root.

Poseidon inputs and expected outputs for the Circom witness cases are calculated with the pinned `circomlibjs` implementation. The tests check witness calculation only; they do not generate a proof or establish cross-language equivalence with Noir.

## Continuous integration

The GitHub Actions workflow compiles and exercises Circom witnesses and runs `nargo check` plus `nargo test` for every Noir package on pushes and pull requests targeting `main`.

A successful compile or witness calculation is not a security review. Before relying on a circuit, review its constraints, field semantics, public/private input declarations, trusted setup, and verifier integration.

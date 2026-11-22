# Poseidon interoperability checklist

Matching hash names do not guarantee matching outputs across Noir and Circom.

Before sharing roots or digests between implementations, verify:

1. The same finite field and modulus.
2. The same Poseidon parameter set and width.
3. The same number and order of input elements.
4. The same byte-to-field encoding convention.
5. The same domain-separation rules.
6. Shared test vectors computed independently by both implementations.

## Shared BN254 hash_2 vector

The repository now checks one known-answer vector for the BN254 Poseidon hash with two inputs:

- Inputs: `[1, 2]`
- Expected output (decimal): `7853200120776062878684798364095072458815029376092732009249414926327459813530`

The vector is stored in [test-vectors/poseidon-bn254.json](../test-vectors/poseidon-bn254.json). The Circom test harness checks the pinned `circomlibjs` implementation against it, and the Noir Merkle-membership package checks its `hash_2` implementation against the same output.

The expected value is also present in the upstream `circomlibjs` v0.1.7 Poseidon test and the Noir Poseidon v0.1.1 reference permutation test. The Circom Merkle witness tests additionally exercise the compiled circuit against roots calculated by `circomlibjs`.

This is one shared known-answer vector, not proof of complete cross-language compatibility. Add vectors for other arities, input boundaries, and complete Merkle paths before relying on broader interoperability.

The current Merkle JSON example remains illustrative, not a validated shared vector.

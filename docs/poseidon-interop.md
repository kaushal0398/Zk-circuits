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

The repository checks one known-answer vector for the BN254 Poseidon hash with two inputs:

- Inputs: `[1, 2]`
- Expected output (decimal): `7853200120776062878684798364095072458815029376092732009249414926327459813530`

The vector is stored in [test-vectors/poseidon-bn254.json](../test-vectors/poseidon-bn254.json). The Circom test harness checks the pinned `circomlibjs` implementation against it, and the Noir Merkle-membership package checks its `hash_2` implementation against the same output.

The expected value is also present in the upstream `circomlibjs` v0.1.7 Poseidon test and the Noir Poseidon v0.1.1 reference permutation test. The Circom Merkle witness tests additionally exercise the compiled circuit against roots calculated by `circomlibjs`.

## Shared depth-4 Merkle membership vector

The checked-in [test-vectors/merkle-membership-bn254.json](../test-vectors/merkle-membership-bn254.json) vector fixes the leaf, four siblings, direction bits, and expected root:

- Leaf: `11`
- Siblings: `[22, 33, 44, 55]`
- Direction bits: `[0, 1, 0, 1]`
- Expected root (decimal): `15279200565368274915541710634944179633805310769512106586104924638980105011859`

The Circom harness validates the vector's depth, direction-bit domain, decimal encoding, and BN254 field bounds before independently recomputing its root with `circomlibjs`. Noir checks the same fixed inputs and expected root through `compute_root`.

These are selected known-answer checks, not proof of complete cross-language compatibility. Add vectors for other hash arities, input boundaries, and Merkle paths before relying on broader interoperability.

# Merkle membership circuits

The repository includes binary Merkle membership examples at depths four and five in both Noir and Circom.

## Statement

The prover knows a leaf, a fixed-length sibling path, and direction bits. The circuit hashes the leaf with each sibling in order and constrains the final value to equal the public Merkle root.

- `pathIndices[i] = 0`: current node is the left child.
- `pathIndices[i] = 1`: current node is the right child.
- The Merkle root is public; the leaf and path are private witnesses.

Both implementations use the BN254 Poseidon hash family. The Noir packages import the `noir-lang/poseidon` library. The Circom circuits import Poseidon from `circomlib`.

## Compatibility warning

Poseidon implementations must use matching parameters, field, and input ordering across the prover, tree builder, and verifier. Do not substitute Poseidon2 or another hash and assume the roots will match.

## Testing

The depth-4 examples retain the checked-in BN254 known-answer vector with its fixed expected root. Both Noir and Circom validate that vector and reject a mismatched public root.

The depth-5 examples use the shared input vector in `test-vectors/merkle-membership-bn254-depth5.json`. It contains five siblings and five direction bits. Circom derives the expected root with the pinned `circomlibjs` Poseidon implementation and checks a valid witness against the compiled depth-5 R1CS. Noir independently unrolls the five Poseidon levels as a reference and passes that root to its depth-5 entrypoint. Both test suites reject a wrong root. The depth-5 vector deliberately does not claim a separately precomputed known-answer root.

These are witness/constraint tests, not proof-generation tests or a complete interoperability proof. The shared depth-5 inputs extend path-length coverage; they do not establish equivalence for all inputs.

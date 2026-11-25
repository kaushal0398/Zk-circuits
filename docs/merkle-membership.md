# Merkle membership circuits

The Noir and Circom examples implement a binary Merkle membership statement with a fixed depth of four.

## Statement

The prover knows a leaf, four sibling nodes, and four direction bits. The circuit hashes the leaf with each sibling in order and constrains the final value to equal the public Merkle root.

- `pathIndices[i] = 0`: current node is the left child.
- `pathIndices[i] = 1`: current node is the right child.
- The Merkle root is public; the leaf and path are private witnesses.

Both implementations use the BN254 Poseidon hash family. The Noir package imports the `noir-lang/poseidon` library. The Circom package imports Poseidon from `circomlib`.

## Compatibility warning

Poseidon implementations must use matching parameters, field, and input ordering across the prover, tree builder, and verifier. Do not substitute Poseidon2 or another hash and assume the roots will match.

## Testing

Both Noir and Circom include a positive depth-4 known-answer vector and reject a mismatched public root. Their adversarial tests also retain the original public root while changing the private leaf, each sibling independently, and each valid direction bit independently. This checks that every private path component contributes to the claimed membership statement in both implementations. Circom additionally rejects non-boolean and negative direction indices; Noir represents directions as booleans at the type level.

These are witness/constraint tests, not proof-generation tests or a verified interoperability proof. The shared vector establishes agreement for the selected input only; it does not establish equivalence for all inputs.

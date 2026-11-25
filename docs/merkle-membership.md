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

The Noir package includes a positive membership test and a negative wrong-root test. The Circom witness test derives its root at runtime using the pinned circomlibjs Poseidon implementation. It checks a valid path, a mismatched public root, a changed leaf, each sibling changed independently, each valid direction bit flipped independently, and rejection of both positive (`2`) and negative (`-1`) non-boolean direction indices. These adversarial cases retain the original public root, so each mutation must be rejected by the circuit constraints. This is a witness-calculation test, not a proof-generation test or a verified Noir/Circom interoperability vector.

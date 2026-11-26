pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

/// Proves membership in a depth-5 binary Merkle tree.
template MerkleMembership(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal input root;

    signal intermediate[depth + 1];
    signal left[depth];
    signal right[depth];

    intermediate[0] <== leaf;

    component hashes[depth];

    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        left[i] <== intermediate[i] + pathIndices[i] * (pathElements[i] - intermediate[i]);
        right[i] <== pathElements[i] + pathIndices[i] * (intermediate[i] - pathElements[i]);

        hashes[i] = Poseidon(2);
        hashes[i].inputs[0] <== left[i];
        hashes[i].inputs[1] <== right[i];
        intermediate[i + 1] <== hashes[i].out;
    }

    intermediate[depth] === root;
}

component main {public [root]} = MerkleMembership(5);

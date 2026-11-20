pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

/// Proves knowledge of a private preimage for a public Poseidon digest.
template HashPreimage() {
    signal input preimage;
    signal input digest;

    component hash = Poseidon(1);
    hash.inputs[0] <== preimage;
    hash.out === digest;
}

component main {public [digest]} = HashPreimage();

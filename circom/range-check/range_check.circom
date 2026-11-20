pragma circom 2.1.6;
include "circomlib/circuits/bitify.circom";

/// Constrains value to an unsigned n-bit integer.
template RangeCheck(n) {
    signal input value;
    component decomposition = Num2Bits(n);
    decomposition.in <== value;
}

component main {public [value]} = RangeCheck(8);

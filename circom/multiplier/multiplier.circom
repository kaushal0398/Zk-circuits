pragma circom 2.1.6;

/// Proves knowledge of a and b such that a * b = product.
template Multiplier() {
    signal input a;
    signal input b;
    signal output product;

    product <== a * b;
}

component main = Multiplier();

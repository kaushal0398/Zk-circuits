pragma circom 2.1.6;

/// Constrains value to an unsigned n-bit integer.
template RangeCheck(n) {
    signal input value;
    signal input bits[n];

    var reconstructed = 0;
    for (var i = 0; i < n; i++) {
        bits[i] * (bits[i] - 1) === 0;
        reconstructed += bits[i] * (2 ** i);
    }

    value === reconstructed;
}

component main {public [value]} = RangeCheck(8);

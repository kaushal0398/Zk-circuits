/// Reconstructs an unsigned 8-bit value from its boolean decomposition.
fn reconstruct(bits: [bool; 8]) -> Field {
    let mut reconstructed: Field = 0;
    if bits[0] {
        reconstructed = reconstructed + 1;
    }
    if bits[1] {
        reconstructed = reconstructed + 2;
    }
    if bits[2] {
        reconstructed = reconstructed + 4;
    }
    if bits[3] {
        reconstructed = reconstructed + 8;
    }
    if bits[4] {
        reconstructed = reconstructed + 16;
    }
    if bits[5] {
        reconstructed = reconstructed + 32;
    }
    if bits[6] {
        reconstructed = reconstructed + 64;
    }
    if bits[7] {
        reconstructed = reconstructed + 128;
    }
    reconstructed
}

/// Proves that a public field element is an unsigned 8-bit integer.
fn main(value: pub Field, bits: [bool; 8]) {
    assert(value == reconstruct(bits));
}

#[test]
fn accepts_zero() {
    main(0, [false; 8]);
}

#[test]
fn accepts_173() {
    let bits = [true, false, true, true, false, true, false, true];
    main(173, bits);
}

#[test]
fn accepts_maximum_8_bit_value() {
    main(255, [true; 8]);
}

#[test(should_fail)]
fn rejects_value_outside_8_bits() {
    let bits = [false; 8];
    main(256, bits);
}

#[test(should_fail)]
fn rejects_bn254_modulus_minus_one() {
    let bits = [false; 8];
    let value: Field = 21888242871839275222246405745257275088548364400416034343698204186575808495616;
    main(value, bits);
}

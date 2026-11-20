/// Proves that a private field element is an unsigned 8-bit integer.
fn main(value: Field, bits: [bool; 8]) {
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
    assert(value == reconstructed);
}

#[test]
fn accepts_173() {
    let bits = [true, false, true, true, false, true, false, true];
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
    assert(reconstructed == 173);
}

#[test(should_fail)]
fn rejects_value_outside_8_bits() {
    let bits = [false; 8];
    let value: Field = 256;
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
    assert(value == reconstructed);
}

/// Proves that a private field element is an unsigned 8-bit integer.
fn main(value: Field, bits: [bool; 8]) {
    let mut reconstructed = 0;
    for i in 0..8 {
        if bits[i] {
            reconstructed += 2 ** i;
        }
    }
    assert(value == reconstructed);
}

#[test]
fn accepts_173() {
    let bits = [true, false, true, true, false, true, false, true];
    let mut reconstructed = 0;
    for i in 0..8 {
        if bits[i] {
            reconstructed += 2 ** i;
        }
    }
    assert(reconstructed == 173);
}

#[test(should_fail)]
fn rejects_value_outside_8_bits() {
    let bits = [false; 8];
    let value = 256;
    let mut reconstructed = 0;
    for i in 0..8 {
        if bits[i] {
            reconstructed += 2 ** i;
        }
    }
    assert(value == reconstructed);
}

/// Proves knowledge of private factors a and b whose product is public.
fn main(a: Field, b: Field, product: pub Field) {
    assert(a * b == product);
}

#[test]
fn accepts_valid_product() {
    let a = 7;
    let b = 9;
    let product = 63;
    assert(a * b == product);
}

#[test(should_fail)]
fn rejects_invalid_product() {
    let a = 7;
    let b = 9;
    let product = 64;
    assert(a * b == product);
}

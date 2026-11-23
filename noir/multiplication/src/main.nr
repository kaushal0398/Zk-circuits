/// Proves knowledge of private factors a and b whose product is public.
fn main(a: Field, b: Field, product: pub Field) {
    assert(a * b == product);
}

#[test]
fn accepts_valid_product() {
    main(7, 9, 63);
}

#[test(should_fail)]
fn rejects_invalid_product() {
    main(7, 9, 64);
}

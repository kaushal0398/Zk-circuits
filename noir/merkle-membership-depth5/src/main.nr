use poseidon::poseidon::bn254::hash_2;

/// Reconstructs a depth-5 binary Merkle root from a leaf and its authentication path.
fn compute_root(
    leaf: Field,
    path_elements: [Field; 5],
    path_indices: [bool; 5],
) -> Field {
    let mut current = leaf;

    for i in 0..5 {
        if !path_indices[i] {
            current = hash_2([current, path_elements[i]]);
        } else {
            current = hash_2([path_elements[i], current]);
        }
    }

    current
}

/// Proves that a private leaf belongs to a public depth-5 Merkle root.
fn main(
    leaf: Field,
    path_elements: [Field; 5],
    path_indices: [bool; 5],
    merkle_root: pub Field,
) {
    assert(compute_root(leaf, path_elements, path_indices) == merkle_root);
}

fn assert_original_depth5_root(
    leaf: Field,
    path_elements: [Field; 5],
    path_indices: [bool; 5],
) {
    // Fixed BN254 known-answer root from the shared depth-5 vector.
    let expected_root = 12136329308075030584248930526969017718885956596408610026085681360932685199210;

    main(leaf, path_elements, path_indices, expected_root);
}

#[test]
fn matches_shared_merkle_membership_bn254_depth5_vector() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55, 66];
    let path_indices = [false, true, false, true, false];

    // Fixed BN254 known-answer root shared with Circom.
    let expected_root = 12136329308075030584248930526969017718885956596408610026085681360932685199210;

    main(leaf, path_elements, path_indices, expected_root);
}

#[test(should_fail)]
fn rejects_wrong_depth5_root() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55, 66];
    let path_indices = [false, true, false, true, false];

    main(leaf, path_elements, path_indices, 123456);
}

#[test(should_fail)]
fn rejects_tampered_depth5_leaf() {
    assert_original_depth5_root(
        12,
        [22, 33, 44, 55, 66],
        [false, true, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_tampered_depth5_first_sibling() {
    assert_original_depth5_root(
        11,
        [23, 33, 44, 55, 66],
        [false, true, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_tampered_depth5_second_sibling() {
    assert_original_depth5_root(
        11,
        [22, 34, 44, 55, 66],
        [false, true, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_tampered_depth5_third_sibling() {
    assert_original_depth5_root(
        11,
        [22, 33, 45, 55, 66],
        [false, true, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_tampered_depth5_fourth_sibling() {
    assert_original_depth5_root(
        11,
        [22, 33, 44, 56, 66],
        [false, true, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_tampered_depth5_fifth_sibling() {
    assert_original_depth5_root(
        11,
        [22, 33, 44, 55, 67],
        [false, true, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_flipped_depth5_first_direction() {
    assert_original_depth5_root(
        11,
        [22, 33, 44, 55, 66],
        [true, true, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_flipped_depth5_second_direction() {
    assert_original_depth5_root(
        11,
        [22, 33, 44, 55, 66],
        [false, false, false, true, false],
    );
}

#[test(should_fail)]
fn rejects_flipped_depth5_third_direction() {
    assert_original_depth5_root(
        11,
        [22, 33, 44, 55, 66],
        [false, true, true, true, false],
    );
}

#[test(should_fail)]
fn rejects_flipped_depth5_fourth_direction() {
    assert_original_depth5_root(
        11,
        [22, 33, 44, 55, 66],
        [false, true, false, false, false],
    );
}

#[test(should_fail)]
fn rejects_flipped_depth5_fifth_direction() {
    assert_original_depth5_root(
        11,
        [22, 33, 44, 55, 66],
        [false, true, false, true, true],
    );
}

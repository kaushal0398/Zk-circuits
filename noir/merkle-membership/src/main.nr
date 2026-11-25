use poseidon::poseidon::bn254::hash_2;

/// Reconstructs a depth-4 binary Merkle root from a leaf and its authentication path.
fn compute_root(
    leaf: Field,
    path_elements: [Field; 4],
    path_indices: [bool; 4],
) -> Field {
    let mut current = leaf;

    for i in 0..4 {
        if !path_indices[i] {
            current = hash_2([current, path_elements[i]]);
        } else {
            current = hash_2([path_elements[i], current]);
        }
    }

    current
}

/// Proves that a private leaf belongs to a public depth-4 Merkle root.
fn main(
    leaf: Field,
    path_elements: [Field; 4],
    path_indices: [bool; 4],
    merkle_root: pub Field,
) {
    assert(compute_root(leaf, path_elements, path_indices) == merkle_root);
}

fn assert_original_merkle_root(
    leaf: Field,
    path_elements: [Field; 4],
    path_indices: [bool; 4],
) {
    let expected_root = 15279200565368274915541710634944179633805310769512106586104924638980105011859;
    main(leaf, path_elements, path_indices, expected_root);
}

#[test]
fn accepts_leaf_with_correct_path() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55];
    let path_indices = [false, true, false, true];

    let h0 = hash_2([leaf, path_elements[0]]);
    let h1 = hash_2([path_elements[1], h0]);
    let h2 = hash_2([h1, path_elements[2]]);
    let expected_root = hash_2([path_elements[3], h2]);

    main(leaf, path_elements, path_indices, expected_root);
}

#[test(should_fail)]
fn rejects_wrong_root() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55];
    let path_indices = [false, true, false, true];
    let wrong_root = 123456;

    main(leaf, path_elements, path_indices, wrong_root);
}

#[test]
fn matches_shared_poseidon_bn254_hash_2_vector() {
    // Keep this known-answer value aligned with test-vectors/poseidon-bn254.json.
    assert(hash_2([1, 2]) == 7853200120776062878684798364095072458815029376092732009249414926327459813530);
}

#[test]
fn matches_shared_merkle_membership_bn254_vector() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55];
    let path_indices = [false, true, false, true];
    let expected_root = 15279200565368274915541710634944179633805310769512106586104924638980105011859;

    main(leaf, path_elements, path_indices, expected_root);
}

#[test(should_fail)]
fn rejects_tampered_leaf() {
    assert_original_merkle_root(12, [22, 33, 44, 55], [false, true, false, true]);
}

#[test(should_fail)]
fn rejects_tampered_first_sibling() {
    assert_original_merkle_root(11, [23, 33, 44, 55], [false, true, false, true]);
}

#[test(should_fail)]
fn rejects_tampered_second_sibling() {
    assert_original_merkle_root(11, [22, 34, 44, 55], [false, true, false, true]);
}

#[test(should_fail)]
fn rejects_tampered_third_sibling() {
    assert_original_merkle_root(11, [22, 33, 45, 55], [false, true, false, true]);
}

#[test(should_fail)]
fn rejects_tampered_fourth_sibling() {
    assert_original_merkle_root(11, [22, 33, 44, 56], [false, true, false, true]);
}

#[test(should_fail)]
fn rejects_flipped_first_direction() {
    assert_original_merkle_root(11, [22, 33, 44, 55], [true, true, false, true]);
}

#[test(should_fail)]
fn rejects_flipped_second_direction() {
    assert_original_merkle_root(11, [22, 33, 44, 55], [false, false, false, true]);
}

#[test(should_fail)]
fn rejects_flipped_third_direction() {
    assert_original_merkle_root(11, [22, 33, 44, 55], [false, true, true, true]);
}

#[test(should_fail)]
fn rejects_flipped_fourth_direction() {
    assert_original_merkle_root(11, [22, 33, 44, 55], [false, true, false, false]);
}

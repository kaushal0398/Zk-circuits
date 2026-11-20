# Range check

The Circom range-check circuit uses circomlib's `Num2Bits(n)` component to constrain the input to an unsigned n-bit decomposition. Each bit is boolean and the decomposition reconstructs the original value.

For n = 8, the accepted integer range is 0 through 255. Field arithmetic alone does not establish this bound; the bit decomposition does.


# test-strings

This is a simple template-based string generator. I wanted to generate
random strings that met specific criteria for tests.

It's early in development so not bulletproof, but it works.

## Installing

You know the routine.

`$ npm install --save-dev @bmacnaughton/test-strings`

## Usage

```js
const gen = require('@bmacnaughton/test-strings');

gen('${[A-F0-9]}');   // one random hex character
gen('${=hex}');       // one random lowercase hex character
gen('${=HEX<10>}');   // 10 random uppercase hex characters
gen('${=hex<4>}:${=hex<6>}:${=hex<2>}'); // dead:beefca:fe (random)
gen('${[ab]<10>}');   // 'abbbaabbba' (random)
gen('${(this|that|else)<2>}');  // 'thiselse'
gen('${literal<2>}'); // 'literalliteral'
```

## reference (from the original inline code spec)
```js
/**
 * format:
 * '${pattern}${pattern}literal'
 *
 * pattern:
 * substitution-spec<count-spec>   // count-spec is optional
 *
 * substitution-spec:
 * [range-spec]
 * =code-word
 * (choice-spec)
 * literal
 *
 * count-spec:
 * min, max=min  // default when not present <1, 1>
 *
 * range-spec
 * a-zA-Z0       // if - is desired must be first character
 *
 * code-word:
 * base58
 * alpha 'A-Za-z'
 * numeric '0-9'
 * alphanumeric 'A-Za-z0-9'
 * hex 'a-f0-9'
 * HEX 'A-F0-9'
 *
 * choice-spec:
 * this|that...
 *
 * literal-spec:
 * literal characters    // mostly useful for repeating
 *
 * characters not in a ${pattern} group are literal.
 */
```

## todos

- add base64 (convert given string to base64)
- allow <n|m|o> syntax on count spec to choose one of the given lengths
- test suite
- options like supplying random number generator? others?

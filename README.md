
# string-generator

![build status](https://github.com/bmacnaughton/string-generator/actions/workflows/on-new-code.yml/badge.svg?branch=master)

This is a simple template-based string generator. I wanted to generate
random strings that met specific criteria for tests.

Why not use an existing package that does everything, like [faker](https://github.com/Marak/Faker.js)?
If you need the complexity that comes with `faker` then by all means use
it. But if you want to work with a very simple, template-driven API, then
this might be helpful. It's simple, small, flexible and, time permitting,
will be extensible.

## Installing

You know the routine.

`$ npm install --save-dev @bmacnaughton/string-generator`

## Usage

```js
const gen = require('@bmacnaughton/string-generator');

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
- ~~test suite~~
- options like supplying random number generator?
- function with argument? '@func(argument)'?
- others?
- extend code-words (requires `new gen.Gen()` i think)

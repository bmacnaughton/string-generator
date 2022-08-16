
# string-generator

![build status](https://github.com/bmacnaughton/string-generator/actions/workflows/on-new-code.yml/badge.svg?branch=master) [![codecov](https://codecov.io/gh/bmacnaughton/string-generator/branch/master/graph/badge.svg?token=MUWZJSTWPJ)](https://codecov.io/gh/bmacnaughton/string-generator)

This is a simple template-based string generator. I wanted to generate
random strings that met specific criteria for tests.

Why not use an existing package that does everything, like [faker](https://github.com/Marak/Faker.js)?
If you need the complexity that comes with `faker` then by all means use
it. But if you want to work with a very simple, template-driven API with
no dependencies, then this might be helpful. It's simple, small, flexible,
and moderately extensible.

Version 3 has [major breaking changes](#breaking-changes-from-version-2).

## Installing

You know the routine.

`$ npm install --save-dev @bmacnaughton/string-generator@3`

## Usage

Here is documentation by example usage.

```js
import Generator from '@bmacnaughton/string-generator';
const g = new Generator();
// get the tagFunction (bound to `g`) for template literals.
const gen = g.tagFunction();

gen`${'[A-F0-9]'}`;             // one random hex character
gen`${'=hex'}`;                 // one random lowercase hex character
gen`${'=HEX<10>'}`;             // 10 random uppercase hex characters
gen`${'=hex<4>}:${=hex<6>}:${=hex<2>'}`; // dead:beefca:fe (random)
gen`${'[ab]<10>'}`;             // 'abbbaabbba' (random)
gen`${'(this|that|else)<2>'}`;  // 'thiselse'
gen`${'"literal"<2>'}`;           // 'literalliteral'
gen`${'=hex<2:8>'}`;            // between 2 and 8 hex characters (inclusive)
gen`${'=hex<2|5|9>'}`;          // 2, 5, or 9 hex characters
gen`${`\` + someFunc()}`;
```

In all the above cases, the `g.decode()` function can be used on the
string value with the `${..}` construct, e.g., `g.decode('=hex<2:8>')`
to convert the value directly. This can be useful if your code already
uses a tag function.

```js
import Generator from '@bmacnaughton/string-generator';
const g = new Generator();
// get the decode function (bound to `g`) for decoding literals
const decode = g.decodeFunction();

g.decode('[A-F0-9]');   // one random hex character
// or
decode('[A-F0-9]');
```

## Options

The `Generator` constructor takes an options object.

- `random` - replace `Math.random` with this function that must have the same signature.
- `codeWords` - an object of `word: function()` pairs. code words are referenced using `=word`. if
a code word is the same as a built-in code word (`hex`, `HEX`, etc.) then the built-in word is
replaced. `function()` must return an indexable value, e.g., string or array.

## Breaking changes from version 2

Version 3 uses ES modules. You must use an `import` statement or the `import()` function.
There is only a default export, the `Generator` class.

Version 3 takes string-generator in a new direction. Version 2 embedded string-template-like
patterns in a string. Version 3 embeds string patterns within string-templates that are executed
by a tag-function (or by calling a decode function directly).

- v2: `gen('${=alpha<20>}')`
- v3: ``gen`${'=alpha<20>'}` `` or `decode('=alpha<20>')`

There are a number of other less significant changes.
- literal-specs use `"` or `'`
- it is possible to quote the first interpolated character with `\` to avoid it
being interpreted by `string-generator`.
- repeat-specs ranges use `:` instead of `,`. Now `<1:5>` means the range 1 to 5.


## Historical napkin scrawlings

I wanted a simple string generator. These are my original working notes.

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
 * count-range | count-oneof
 *
 * count-range:
 * min, max=min  // default when not present <1, 1>
 *
 * count-oneof:
 * n(|m)*
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

- ~~test suite~~
- ~~allow <n|m|o> syntax on count spec to choose one of the given lengths~~
- ~~convert to class~~
- ~~supply random number generator~~
- ~~options to supply own code-words~~
- ~~make basics.test iterate using optional random function.~~
- allow code-word functions to have arguments (wip)
- add base64 (convert given string to base64) like what syntax? @b64(arg)?

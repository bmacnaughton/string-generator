'use strict';

const {Generator} = require('..');
const generate = new Generator();
const gen = (p) => generate.generate(p);

const expect = require('chai').expect;
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
 * base64 (nyi)
 * alpha 'A-Za-z'
 * numeric '0-9'
 * alphanumeric 'A-Za-z0-9'
 * hex 'ABCDEFabcdef0123456789'
 *
 * choice-spec:
 * this|that...
 *
 * literal-spec:
 * literal characters    // mostly useful for repeating
 *
 * characters not in a ${pattern} group are literal.
 */
const maxTests = 10;


describe('basic tests', function() {
  describe('count-specs', function() {
    it('should default the count-spec to 1', function() {
      const string = gen('${(bruce)}');
      expect(string).equal('bruce', 'no range should act as <1>');
    });

    it('a single number should be used', function() {
      const string = gen('${(bruce)<2>}');
      expect(string).equal('brucebruce', 'a single range number works correctly');
    });

    it('a random range should be used', function() {
      const target = 1 << 2 | 1 << 3 | 1 << 4;
      let generated = 0;
      // 100 is an arbitrary limit just so this won't loop forever
      // if there is a problem.
      for (let i = 0; i < 100; i++) {
        const string = gen('${bruce<2,4>}');
        expect(string).match(/^(bruce){2,4}$/);
        generated |= 1 << string.length / 5;
        if (generated === target) {
          break;
        }
      }
      expect(generated).equal(target, 'not all values in range were generated');
    });

    it('reversing min and max should have no effect', function () {
      const target = 1 << 2 | 1 << 3 | 1 << 4;
      let generated = 0;
      // 100 is an arbitrary limit just so this won't loop forever
      // if there is a problem.
      for (let i = 0; i < 100; i++) {
        const string = gen('${bruce<4,2>}');
        expect(string).match(/^(bruce){2,4}$/);
        generated |= 1 << string.length / 5;
        if (generated === target) {
          break;
        }
      }
      expect(generated).equal(target, 'not all values in range were generated');
    });


    it('should allow a zero value', function () {
      const string = gen('${bruce<0>}');
      expect(string).equal('');
    });

    it('should handle oneofs correctly', function() {
      const target = 1 << 0 | 1 << 2 | 1 << 4 | 1 << 7;
      let generated = 0;

      for (let i = 0; i < 100; i++) {
        const string = gen('${(bruce)<0|2|4|7>}');
        expect(string).match(/^|(bruce){2}|(bruce){4}|(bruce){7}$/);
        generated |= 1 << string.length / 5;
        if (generated === target) {
          break;
        }
      }
      expect(generated).equal(target, 'not all values in oneof were generated');
    });

    it('invalid specs should be treated as part of the pattern', function() {
      const tests = [
        {bad: '${bruce<>}'},
        {bad: '${bruce<}'},
        {bad: '${bruce>}'},
        {bad: '${bruce<-1>}'},
        {bad: '${bruce<9,>}'},
        {bad: '${bruce<9 10>}'},
      ];
      for (const test of tests) {
        const string = gen(test.bad);
        expect(string).equal(test.bad.slice(2, -1));
      }
    });
  });

  describe('code-words', function() {
    const codeWordTests = {
      alpha: /^[A-Za-z]{1,20}$/,
      numeric: /^[0-9]{1,20}$/,
      alphanumeric: /^[0-9A-Za-z]{1,20}$/,
      hex: /^[0-9a-f]{1,20}$/,
      HEX: /^[0-9A-F]{1,20}$/,
      base58: /^[A-HJ-NP-Za-km-z1-9]{1,20}$/,
    };

    it('generate strings correctly', function() {
      const codeWords = Object.keys(codeWordTests);
      for (let i = 0; i < maxTests; i++) {
        for (let j = 0; j < codeWords.length; j++) {
          const string = gen(`\${=${codeWords[j]}<1,20>}`);
          expect(string).match(codeWordTests[codeWords[j]], `${codeWords[i]} failed`);
        }
      }
    });

    it('handles bad code-word by throwing', function() {
      const thrower = () => gen('${=bad-word}');
      expect(thrower).throws('bad code-word: bad-word');
    });
  });

  describe('range-specs', function() {
    it('generate strings correctly', function() {
      const loCode = 'A'.charCodeAt(0);
      for (let i = 0; i < maxTests; i++) {
        const hiCode = loCode + random(1, 25);
        const loChar = String.fromCharCode(loCode);
        let hiChar = String.fromCharCode(hiCode);
        const max = random(1, 20);
        const genTemplate = `\${[${loChar}-${hiChar}]<1,${max}>}`;
        if (hiChar === '\\' || hiChar === '-') {
          hiChar = `\\${hiChar}`;
        }
        const re = new RegExp(`^[${loChar}-${hiChar}]{1,${max}}$`);

        const string = gen(genTemplate);
        expect(string).match(re, `${genTemplate} didn't match ${re}`);
      }
    });

    it('handles dash in range string', function() {
      const string = gen('${[-a]<5>}');
      expect(string).match(/^(a|-){5}$/);
    });
  });

  describe('choice-specs', function() {
    it('generate strings correctly', function() {
      for (let i = 0; i < maxTests; i++) {
        const words = ['cat', 'dog', 'pig', 'rat', 'sparrow'];
        const nWords = random(1, words.length - 1);
        const choices = [];
        for (let j = nWords - 1; j >= 0; j--) {
          const ix = random(0, words.length - 1);
          const word = words.splice(ix, 1)[0];
          choices.push(word);
        }
        const max = random(1, 10);
        const genTemplate = `\${(${choices.join('|')})<1,${max}>}`;
        const re = new RegExp(`^(${choices.join('|')}){1,${max}}$`);
        const string = gen(genTemplate);
        expect(string).match(re, `${genTemplate} didn't match ${re}`);
      }
    });

    it('should generate each possible choice', function() {
      const choices = ['bruce', 'wendy', 'grace'];
      const target = choices.reduce((acc, v, ix) => acc | 1 << ix, 0);
      let generated = 0;
      // 100 is an arbitrary limit just so this won't loop forever
      // if there is a problem.
      for (let i = 0; i < 100; i++) {
        const string = gen('${(bruce|wendy|grace)}');
        expect(string).match(/^(bruce|wendy|grace)$/);
        generated |= 1 << choices.indexOf(string);
        if (generated === target) {
          break;
        }
      }
      expect(generated).equal(target, 'not all values in range were generated');
    });
  });

  describe('literals', function() {
    it('should handle literal replacements', function() {
      let string = gen('${literal}');
      expect(string).equal('literal');
      string = gen('${literal<2>}');
      expect(string).equal('literalliteral');
    });

    it('should treat characters outside a pattern as literal', function() {
      let string = gen('bruce ${says} hi.');
      expect(string).equal('bruce says hi.');
      string = gen('${=hex<4>}-${=hex<20>}-2');
      expect(string).match(/[0-9a-f]{4}-[0-9a-f]{20}-2/);
    });
  });
});

//
// helpers
//
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

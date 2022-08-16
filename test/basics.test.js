'use strict';

import {expect} from 'chai';

import Generator from '../dist/index.js';
const generate = new Generator();
const gen = generate.tagFunction();

const maxTests = 10;

describe('basic tests', function() {
  describe('function tests', function() {
    it('should use the unbound tag function', function() {
      const string = generate.gen`${'literal'}`;
      expect(string).equal('literal');
    });

    it('should use the bound tag function', function() {
      const string = gen`${'literal'}`;
      expect(string).equal('literal');
    });

    it('should use the unbound decode function', function() {
      const string = generate.decode('"literal"');
      expect(string).equal('literal');
    });

    it('should use the bound decode function', function() {
      const decode = generate.decodeFunction();
      const string = decode('"literal"');
      expect(string).equal('literal');
    });
  });

  describe('count-specs', function() {
    it('should default the count-spec to 1', function() {
      let string = gen`${'(bruce)'}`;
      expect(string).equal('bruce', 'no range should act as <1>');
      string = generate.decode('(bruce)');
      expect(string).equal('bruce', 'no range for decode should act as <1>');

    });

    it('a single number should be used', function() {
      let string = gen`${'(bruce)<2>'}`;
      expect(string).equal('brucebruce', 'a single range number works correctly');
      string = generate.decode('(bruce)<2>');
      expect(string).equal('brucebruce', 'a single range number works with decode');
    });

    it('a random range should be used', function() {
      const target = 1 << 2 | 1 << 3 | 1 << 4;
      let generated = 0;
      // 100 is an arbitrary limit just so this won't loop forever
      // if there is a problem.
      for (let i = 0; i < 100; i++) {
        const string = gen`${'"bruce"<2:4>'}`;
        expect(string).match(/^(bruce){2,4}$/);
        generated |= 1 << string.length / 5;
        if (generated === target) {
          break;
        }
      }
      expect(generated).equal(target, 'not all values in range were generated');
    });

    it('reversing min and max should have no effect', function() {
      const target = 1 << 2 | 1 << 3 | 1 << 4;
      let generated = 0;
      // 100 is an arbitrary limit just so this won't loop forever
      // if there is a problem.
      for (let i = 0; i < 100; i++) {
        const string = gen`${'"bruce"<4:2>'}`;
        expect(string).match(/^(bruce){2,4}$/);
        generated |= 1 << string.length / 5;
        if (generated === target) {
          break;
        }
      }
      expect(generated).equal(target, 'not all values in range were generated');
    });


    it('should allow a zero value', function() {
      const string = gen`${'"bruce"<0>'}`;
      expect(string).equal('');
    });

    it('no value should default to 1', function() {
      const string = gen`${'"bruce"<>'}`;
      expect(string).equal('bruce');
    })

    it('should handle oneofs correctly', function() {
      const target = 1 << 0 | 1 << 2 | 1 << 4 | 1 << 7;
      let generated = 0;

      for (let i = 0; i < 100; i++) {
        const string = gen`${'(bruce)<0|2|4|7>'}`;
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
        {bad: '"bruce"<'},
        {bad: '"bruce">'},
        {bad: '"bruce"<-1>'},
        {bad: '"bruce"<9-10>'},
        {bad: '"bruce"<9 10>'},
      ];
      for (const test of tests) {
        const repeatPart = test.bad.slice('"bruce"'.length);
        expect(() => generate.decode(test.bad)).throws(`invalid repeat-spec "${repeatPart}"`);
      }
    });

    it('a decoded non-string value returns the String(value)', function() {
      expect(generate.decode(42)).equal('42');
    });

    it('a template literal with non-string value returns the String(value)', function() {
      const string = gen`bruce${7}`;
      expect(string).equal('bruce7');
    });

    it('a template with no replacements works', function() {
      const string = gen`bruce says hi`;
      expect(string).equal('bruce says hi');
    })
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
        for (const codeWord of codeWords) {
          // manually call the tag function here as if the next line's "spec" was
          // inline, e.g., gen`${'=alpha<1:20>'}`.
          const spec = `=${codeWord}<1:20>`;
          const string = gen(['', ''], spec);
          expect(string).match(codeWordTests[codeWord], `${codeWords[i]} failed`);
        }
      }
    });

    it('handles unknown code-word by throwing', function() {
      const thrower = () => gen`${'=bad-word'}`;
      expect(thrower).throws('bad code-word: bad-word');
    });

    it('handles invalid code-word by throwing', function() {
      const thrower = () => gen`${'=77sunset-strip'}`;
      expect(thrower).throws('found "77sunset-strip" when expecting valid codeword');
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
        const spec = `[${loChar}-${hiChar}]<1:${max}>`;
        const re = new RegExp(`^[${loChar}-${hiChar}]{1,${max}}$`);

        const string = gen(['', ''], spec);
        expect(string).match(re, `${spec} didn't match ${re}`);
      }
    });

    it('handles dash in the first position', function() {
      const string = gen`${'[-a]<5>'}`;
      expect(string).match(/^(a|-){5}$/);
    });

    it('handles a dash in the last position', function() {
      const string = gen`${'[a-]<5>'}`;
      expect(string).match(/^(a|-){5}$/);
    })

    it('handles lists without dashes', function() {
      const string = gen`${'[xyz]<5>'}`;
      expect(string).match(/^(x|y|z){5}$/);
    });

    it('handles lists and ranges combined', function() {
      const string = gen`${'[xy-z]<100>'}`;
      // it's possible for this to fail but the chance is quite low.
      const chance = chances(3, 100).toExponential(3);
      const msg = `enter the lottery; this had a ${chance} chance of failing`;
      expect(string).match(/^(x|y|z){100}$/);
      for (const ch of ['x', 'y', 'z']) {
        expect(string.includes(ch)).equal(true, msg);
      }
    });

    it('throws when given an empty range-spec', function() {
      const thrower = () => gen`${'[]'}`;
      expect(thrower).throws();
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
        const spec = `(${choices.join('|')})<1:${max}>`;
        const re = new RegExp(`^(${choices.join('|')}){1,${max}}$`);
        const string = gen(['', ''], spec);
        expect(string).match(re, `${spec} didn't match ${re}`);
      }
    });

    it('should generate each possible choice', function() {
      const choices = ['bruce', 'wendy', 'grace'];
      const target = choices.reduce((acc, _v, ix) => acc | 1 << ix, 0);
      let generated = 0;
      // 100 is an arbitrary limit just so this won't loop forever
      // if there is a problem.
      for (let i = 0; i < 100; i++) {
        const string = gen`${'(bruce|wendy|grace)'}`;
        expect(string).match(/^(bruce|wendy|grace)$/);
        generated |= 1 << choices.indexOf(string);
        if (generated === target) {
          break;
        }
      }
      expect(generated).equal(target, 'not all values in range were generated');
    });

    it('throws when given an empty spec', function() {
      const thrower = () => gen`${'()'}`;
      expect(thrower).throws(`found "()" when expecting choice-spec`)
    })
  });

  describe('literal-specs', function() {
    it('should handle literal replacements', function() {
      let string = gen`${'"literal"'}`;
      expect(string).equal('literal');
      string = gen`${'"literal"<2>'}`;
      expect(string).equal('literalliteral');
    });

    it('should treat characters outside a pattern as literal', function() {
      let string = gen`bruce ${"says"} hi.`;
      expect(string).equal('bruce says hi.');
      string = gen`${'=hex<4>'}-${'=hex<20>'}-2`;
      expect(string).match(/[0-9a-f]{4}-[0-9a-f]{20}-2/);
    });

    it('throws on unterminated quote', function() {
      const thrower = () => gen`${'"unterminated<2>'}`;
      expect(thrower).throws(`invalid literal-spec ""unterminated<2>"`)
    });

    it('allows quoting of spec as a tag', function() {
      let string = gen`\=bruce`;
      expect(string).equal('=bruce');
    });

    it('allows quoting of specs using the decode function', function() {
      let chars = `[("'`;
      for (const ch of chars) {
        const quoted = `\\${ch}bruce|`;
        let string = generate.decode(quoted);
        expect(string).equal(quoted.slice(1));
      }
    });
  });
});

//
// helpers
//
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// calculate the independent probability of not getting one of possibilities
// in sampleCount tries. e.g., chances(2, 1) => 0.5, chances(2, 2) => 0.25
function chances(possibilities, sampleCount) {
  sampleCount = Math.floor(sampleCount);
  possibilities = Math.floor(possibilities);

  let chance = 1;
  while (sampleCount-- > 0) {
    chance /= possibilities;
  }
  return chance;
}

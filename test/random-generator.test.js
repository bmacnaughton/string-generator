'use strict';

const {Generator} = require('..');

const expect = require('chai').expect;

describe('random number generation', function() {

  for (const rg of ['default', 'alternate']) {
    describe(`${rg} random number generator`, function() {
      let random;
      let generator;
      let gen;
      before(function() {
        if (rg === 'default') {
          random = Math.random;
        } else {
          random = getRandom();
        }
        generator = new Generator({random});
        gen = generator.tagFunction();
      });
      after(function() {
        let failed = false;
        const tests = this.test.parent.tests;
        for (const test of tests) {
          if (test.state === 'failed') {
            failed = true;
            break;
          }
        }
        if (failed) {
          const seed = generator.rand.seed;
          console.log(`the random seed used in the tests was ${seed}`);
        }
      });

      it('should be using the correct random generator', function() {
        expect(generator.rand).equal(random);
      });

      const tests = [
        {name: 'random range', pattern: '"bruce"<2:4>', expected: /^(bruce){2,4}$/},
        {name: 'reverse min and max', pattern: '"bruce"<4:2>', expected: /^(bruce){2,4}$/},
        {
          name: 'handle choice-spec',
          pattern: '(bruce)<0|2|4|7>',
          expected: /^|(bruce){2}|(bruce){4}|(bruce){7}$/,
          target: [0, 2, 4, 7],
        },
      ];

      for (const t of tests) {
        it(t.name, function() {
          let bits = t.target || [2, 3, 4];
          let target = 0;
          for (const bit of bits) target |= 1 << bit;

          let generated = 0;
          // 100 is an arbitrary limit just so this won't loop forever
          // if there is a problem.
          for (let i = 0; i < 100; i++) {
            const string = gen(['', ''], t.pattern);
            expect(string).match(t.expected);
            // kind of a hack that counts on each generated atom being 5 long.
            generated |= 1 << string.length / 5;
            if (generated === target) {
              break;
            }
          }
          expect(generated).equal(target, 'not all values in range were generated');
        })
      }
    });
  }
});

//https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
//
// const seed = 1337 ^ 0xDEADBEEF; // 32-bit seed with optional XOR value
// Pad seed with Phi, Pi and E.
// https://en.wikipedia.org/wiki/Nothing-up-my-sleeve_number
function getRandom(seed = Date.now() >>> 0) {
  const fn = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, seed);
  fn.seed = seed;
  return fn;
}

function sfc32 (a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

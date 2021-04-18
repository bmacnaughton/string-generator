'use strict';

const {Generator} = require('..');

const expect = require('chai').expect;

describe('options', function() {
  before(function() {
    const generate = new Generator();
    const gen = (p) => generate.generate(p);
  });

  describe('alternate random number generator', function() {
    let random;
    let generator;
    let gen;
    before(function() {
      random = getRandom();
      generator = new Generator({random});
      gen = (p) => generator.generate(p);
    });
    after(function () {
      let failed = false;
      const tests = this.test.parent.tests;
      for (var i = 0; i < tests.length; ++i) {
        if (tests[i].state === 'failed') {
          failed = true;
          break;
        }
      }
      if (failed) {
        const seed = generator.rand.seed;
        console.log(`the random seed used in the tests was ${seed}`);
      }
    });

    it('should be using our random generator', function() {
      expect(generator.rand).equal(random);
    });

    // the following three checks are duplicated from basics.test.js.
    it('a random range should be used', function () {
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

    it('should handle oneofs correctly', function () {
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
  });

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
  return function () {
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

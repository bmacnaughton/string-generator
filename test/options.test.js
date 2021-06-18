'use strict';

const {Generator} = require('..');

const expect = require('chai').expect;

describe('options', function() {

  describe('random number generator', function() {
    it('should use the default random generator if not specified', function() {
      const generator = new Generator();
      expect(generator.rand).equal(Math.random);
    })

    it('should be using our custome random generator if specified', function() {
      const random = () => 0.5;
      const generator = new Generator({random});
      expect(generator.rand).equal(random);
    });
  });

  describe('supply code-words functions', function() {
    let gen;

    function xyzzy(arg) {
      return ['xyZzy'];
    }
    before(function () {
      const options = {
        codeWords: {
          xyzzy
        }
      }
      const generator = new Generator(options);
      gen = generator.generate;
    });

    it('should use the generator', function() {
      const string = gen('${=xyzzy}');
      expect(string).equal('xyZzy');
    });
  });

});

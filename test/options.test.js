'use strict';

import {expect} from 'chai';

import Generator from '../dist/index.js';

describe('options', function() {

  describe('random number generator', function() {
    it('should use the default random generator if not specified', function() {
      const generator = new Generator();
      expect(generator.rand).equal(Math.random);
    })

    it('should be using a custom random generator if specified', function() {
      const random = () => 0.5;
      const generator = new Generator({random});
      expect(generator.rand).equal(random);
    });
  });

  describe('add code-words', function() {
    let gen;

    before(function () {
      const options = {
        codeWords: {
          xyzzy(arg) {
            return ['xyZzy'];
          }
        }
      }
      gen = new Generator(options).tagFunction();
    });

    it('should use the custom code-word', function() {
      const string = gen`${'=xyzzy'}`;
      expect(string).equal('xyZzy');
    });
  });

});

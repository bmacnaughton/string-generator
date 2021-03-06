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
 * base64(arg) - (nyi)
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

const alpha = decodeRanges('A-Za-z');
const numeric = decodeRanges('0-9');
const alphanumeric = decodeRanges('A-Za-z0-9');
const hex = decodeRanges('a-f0-9');
const HEX = decodeRanges('A-F0-9');
const base58 = decodeRanges('A-HJ-NP-Za-km-z1-9');

type CodeWordFunction = (arg: string) => Indexable;
type CodeWord = Indexable | CodeWordFunction;
type CodeWordMapEntry = {[key: string]: CodeWord};

const codeWords : CodeWordMapEntry = {
  alpha,
  numeric,
  alphanumeric,
  hex,
  HEX,
  base58,
};

type Indexable = string | string[];

interface Spec {
  type: string,       // range-spec, code-word, choice-spec
  full: string,       // the full Spec string
  index: number,      // the starting position of the Spec
  count: CountSpec,   // count-range | count-oneof
  atoms: Indexable,   // one of the atoms will be chosen for each substition
}

type RandomMinMax = (min: number, max: number) => number;
interface CountSpec {
  iterations(random: RandomMinMax) : number;
}

const specRE = /\$\{(.+?)\}+/g;

export class Generator {
  codeWords: CodeWordMapEntry = {};
  rand: () => number = Math.random;
  random: RandomMinMax = (min: number, max: number) =>
    Math.floor(this.rand() * (max - min + 1)) + min;
  // provide a long alias for people that like that kind of thing.
  //generate: (format: string) => string = this.gen;
  get generate() {
    return this.gen.bind(this);
  }

  constructor(options: any = {}) {
    if (options.random) {
      this.rand = options.random;
    }
    if (options.codeWords) {
      this.addCodeWords(options.codeWords);
    }
  }

  gen(format: string): string {
    const matches = [];
    const specs: Spec[] = [];
    // find all the substitution specs. keep in reverse order
    // so the indexes stay valid as substitutions are made.
    let match;
    while ((match = specRE.exec(format)) !== null) {
      matches.unshift(match);
    }

    // decode each spec
    for (let i = 0; i < matches.length; i++) {
      const [full, interior] = matches[i];
      const { index } = matches[i];
      const [spec, count] = Generator.decodePattern(interior);
      let atoms;
      let type;
      switch (spec[0]) {
        case '[':
          type = 'range-spec';
          atoms = decodeRanges(spec.slice(1, -1));
          break;
        case '=': {
          type = 'code-word';
          const word = spec.slice(1);
          let charset = this.codeWords[word] || codeWords[word];
          if (!charset) {
            throw new Error(`bad code-word: ${word}`);
          }
          if (typeof charset === 'function') {
            charset = charset('');
          }
          atoms = charset;
          break;
        }
        case '(':
          type = 'choice-spec';
          atoms = spec.slice(1, -1).split('|');
          break;
        default:
          type = 'something-else';
          atoms = [spec];
          break;
      }
      specs[i] = { type, full, index, count, atoms };
    }
    // generate requested string
    for (const spec of specs) {
      const sub = this.makeSubstitution(spec.atoms, spec.count);

      const fhead = format.substring(0, spec.index);
      const ftail = format.substring(spec.index + spec.full.length);
      format = fhead + sub + ftail;
    }

    return format;
  }

  private static decodePattern(pattern: string): [string, CountSpec] {
    // is is a count-range like <2,5>?
    let m = pattern.match(/\<(\d+)(?:, *(\d+))?\>$/);
    if (m) {
      // there has to be a min match
      let min = parseInt(m[1]);
      let max = m[2] === undefined ? min : parseInt(m[2]);
      if (min > max) {
        const t = min;
        min = max;
        max = t;
      }

      pattern = pattern.slice(0, -m[0].length);
      return [pattern, new RangeCount(min, max)];
    }

    // is it a oneof-range like <2|4>?
    m = pattern.match(/\<(\d+)(?:\|(\d+))*\>$/);
    if (m) {
      pattern = pattern.slice(0, -m[0].length);
      const counts = m[0].slice(1, -1).split('|').map(n => parseInt(n));
      return [pattern, new DiscreteCount(counts)];
    }

    // default if no match for either form
    return [pattern, new RangeCount(1, 1)];
  }

  makeSubstitution(atoms: Indexable, counts: CountSpec) {
    const n = atoms.length - 1;
    const sub = [];
    const iterations = counts.iterations(this.random);
    for (let i = 0; i < iterations; i++) {
      sub.push(atoms[this.random(0, n)]);
    }
    return sub.join('');
  }

  addCodeWords(codeWords: {[key: string]: (arg: string) => string}) {
    for(const codeWord in codeWords) {
      this.codeWords[codeWord] = codeWords[codeWord];
    }
  }
}

function decodeRanges(rangeString: string): string {
  const chars: string[] = [];
  const range = rangeString.split('');

  if (range[0] === '-') {
    chars.push(<string>range.shift());
  }

  let lastchar = '';
  for (let i = 0; i < range.length; i++) {
    // if not a dash then it *might* be the start of a range
    if (range[i] !== '-') {
      chars.push(lastchar = range[i]);
      continue;
    }
    // it is a dash, so the last character is the start of a range
    const start = lastchar.charCodeAt(0) + 1;
    const end = range[i + 1].charCodeAt(0);
    for (let i = start; i <= end; i++) {
      chars.push(String.fromCharCode(i));
    }
    i += 1;
  }
  return [...new Set(chars)].join('');
}

class DiscreteCount {
  counts: number[];
  constructor(counts: number[]) {
    this.counts = counts;
  }
  iterations(random : RandomMinMax) {
    return this.counts[random(0, this.counts.length - 1)];
  }
}
class RangeCount {
  min: number;
  max: number;
  constructor(min: number, max: number) {
    this.min = min;
    this.max = max;
  }
  iterations(random: RandomMinMax) {
    return random(this.min, this.max);
  }
}

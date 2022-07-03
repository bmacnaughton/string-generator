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
  type: string,       // range-spec, code-word, choice-spec, literal
  count: CountSpec,   // count-range
  atoms: Indexable,   // one of the atoms will be chosen for each substition
}

type RandomMinMax = (min: number, max: number) => number;
interface CountSpec {
  iterations(random: RandomMinMax) : number;
}

export default class Generator {
  codeWords: CodeWordMapEntry = {};
  rand: () => number = Math.random;
  random: RandomMinMax = (min: number, max: number) =>
    Math.floor(this.rand() * (max - min + 1)) + min;

  constructor(options: any = {}) {
    if (options.random) {
      this.rand = options.random;
    }
    if (options.codeWords) {
      this.addCodeWords(options.codeWords);
    }
  }

  tagFunction(): Function {
    return this.gen.bind(this);
  }

  decode(spec: string) {
    return this.gen(['', ''], spec);
  }

  gen(strings: [string, ...string[]], ...specs: any): string {
    const parsedSpecs: Spec[] = [];
    // =codeword<repeats>
    // [char-range]<repeats>
    // (choice|choice)<repeats>
    // "literal"|'literal'<repeats>
    for (let spec of specs) {
      if (typeof spec !== 'string') {
        parsedSpecs.push({ type: 'literal', count: new RangeCount(1, 1), atoms: [String(spec)] });
        continue;
      }
      let type;
      let atoms;
      let subSpec;
      let countSpec;
      let count;
      let m;
      switch (spec[0]) {
        case '=':
          type = 'code-word';
          m = /^[A-Za-z][A-Za-z0-9-]*/.exec(spec.slice(1));
          if (!m) {
            throw new Error(`found "${spec.slice(1)}" when expecting valid codeword`);
          }
          subSpec = m[0];
          let charset = this.codeWords[subSpec] || codeWords[subSpec];
          if (!charset) {
            throw new Error(`bad code-word: ${subSpec}`);
          }
          if (typeof charset === 'function') {
            charset = charset('');
          }
          atoms = charset;
          countSpec = spec.slice(subSpec.length + 1);
          count = Generator.decodeRepeat(countSpec);
          break;

        case '[':
          type = 'range-spec';
          m = /^\[(.|\\{0}'\])+\]/.exec(spec);
          if (!m || m[0].length === 2) {
            throw new Error(`found "${spec}" when expecting range-spec`);
          }
          subSpec = m[0];
          atoms = decodeRanges(subSpec.slice(1, -1));

          countSpec = spec.slice(subSpec.length);
          count = Generator.decodeRepeat(countSpec);
          break;
        case '(':
          type = 'choice-spec';
          m = /^\((.|\\{0}'\))+\)/.exec(spec);
          if (!m || m[0].length === 2) {
            throw new Error(`found "${spec}" when expecting choice-spec`);
          }
          subSpec = m[0];
          atoms = subSpec.slice(1, -1).split('|');

          countSpec = spec.slice(subSpec.length);
          count = Generator.decodeRepeat(countSpec);
          break;

        case '"':
        case "'":
          type = 'literal-spec';
          m = {
            "'": /^'(.|\\{0}')+'/,
            '"': /^"(.|\\{0}")+"/
          }[spec[0]].exec(spec);
          if (!m) {
            throw new Error(`invalid literal-spec "${spec}"`);
          }
          subSpec = m[0];
          countSpec = spec.slice(subSpec.length);
          count = Generator.decodeRepeat(countSpec);
          atoms = [subSpec.slice(1, -1)];
          break;

        case '\\':
          // quoted literal string, remove leading \ and fall through to default
          // literal string. this allows quoting a string to begin with `=[("'`
          // and not be interpreted as a string-generator spec.
          spec = spec.slice(1);
        default:
          // it's just a literal string - allows no spec substitutions
          type = 'literal';
          count = new RangeCount(1, 1);
          atoms = [spec];
      }
      if (count instanceof Error) {
        throw count;
      }

      parsedSpecs.push({ type, count, atoms });
    }

    // generate requested string
    let ix = 0;
    let result = strings[ix];
    for (const spec of parsedSpecs) {
      const sub = this.makeSubstitution(spec.atoms, spec.count);
      result += sub + strings[++ix];
    }

    return result;
  }

  private static decodeRepeat(repeat: string) : CountSpec | Error {
    if (!repeat || /^<\s*>$/.test(repeat)) {
      return new RangeCount(1, 1);
    }

    // is is a count-range like <2:5>?
    let m = repeat.match(/\<(\d+)(?::(\d+))?\>$/);
    if (m) {
      // there has to be a min match
      let min = parseInt(m[1]);
      let max = m[2] === undefined ? min : parseInt(m[2]);
      if (min > max) {
        const t = min;
        min = max;
        max = t;
      }

      return new RangeCount(min, max);
    }

    // is it a oneof-range like <2|4>?
    m = repeat.match(/\<(\d+)(?:\|(\d+))*\>$/);
    if (m) {
      const counts = m[0].slice(1, -1).split('|').map(n => parseInt(n));
      return new DiscreteCount(counts);
    }

    // if it was none-of-the-above, return an error
    return new Error(`invalid repeat-spec "${repeat}"`);
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

  // allow a dash character in either the first or the last position.
  // but don't add it twice.
  if (range[0] === '-') {
    chars.push(<string>range.shift());
  }
  if (range[range.length - 1] === '-' && chars.length === 0) {
    chars.push(<string>range.pop());
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

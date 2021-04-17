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

const alpha = decodeRanges('A-Za-z');
const numeric = decodeRanges('0-9');
const alphanumeric = decodeRanges('A-Za-z0-9');
const hex = decodeRanges('a-f0-9');
const HEX = decodeRanges('A-F0-9');
const base58 = decodeRanges('A-HJ-NP-Za-km-z1-9');

const codeWords : {[key: string]: string[]} = {
  alpha,
  numeric,
  alphanumeric,
  hex,
  HEX,
  base58,
};

const specRE = /\$\{(.+?)\}+/g;

interface Spec {
  type: string,
  full: string,
  index: number,
  count: CountSpec,
  atoms: string[],
}

interface CountSpec {
  iterations() : number;
}

export function generate(format: string): string {
  const matches = [];
  const specs: Spec[] = [];
  let match;
  while ((match = specRE.exec(format)) !== null) {
    matches.unshift(match);
  }
  for (let i = 0; i < matches.length; i++) {
    const [full, interior] = matches[i];
    const {index} = matches[i];
    const [spec, count] = decodePattern(interior);
    let atoms;
    let type;
    switch (spec[0]) {
      case '[':
        type = 'range-spec';
        atoms = decodeRanges(spec.slice(1, -1));
        break;
      case '=': {
        type = 'code-word';
        const charset = codeWords[spec.slice(1)];
        if (!charset) {
          throw new Error(`bad code-word: ${spec.slice(1)}`);
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
    specs[i] = {type, full, index, count, atoms};
  }
  // generate requested string
  for (let i = 0; i < specs.length; i++) {
    // generate the substitution according to the spec
    const spec: Spec = specs[i];
    const sub = makeSubstitution(spec.atoms, spec.count);

    const fhead = format.substring(0, spec.index);
    const ftail = format.substring(spec.index + spec.full.length);
    format = fhead + sub + ftail;
  }

  return format;
}

function decodeRanges (rangeString: string): string[] {
  const chars: string[] = [];
  const range = rangeString.split('');

  if (range[0] === '-') {
    chars.push('-');
    range.shift();
    //chars.push(range.shift());
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

  //
  return [...new Set(chars)];
}

class DiscreteCount {
  counts: number[];
  constructor(counts: number[]) {
    this.counts = counts;
  }
  iterations() {
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
  iterations() {
    return random(this.min, this.max);
  }
}

const rangeRE = /\<(\d+)(?:, *(\d+))?\>$/;
const oneofRE = /\<(\d+)(?:\|(\d+))*\>$/;
function decodePattern(pattern: string): [string, CountSpec] {
  let m = pattern.match(rangeRE);
  if (m) {
    // there has to be a min match
    const min = m[1];
    const max = m[2] === undefined ? min : m[2];

    pattern = pattern.slice(0, -m[0].length);
    return [pattern, new RangeCount(parseInt(min), parseInt(max))];
  }
  m = pattern.match(oneofRE);
  if (m) {
    pattern = pattern.slice(0, -m[0].length);
    const counts = m[0].slice(1, -1).split('|').map(n => parseInt(n));
    return [pattern, new DiscreteCount(counts)];
  }
  // default if no match for either form
  return [pattern, new RangeCount(1, 1)];
}

function makeSubstitution (atoms: string[], counts: CountSpec) {
  const n = atoms.length - 1;
  const sub = [];
  const iterations = counts.iterations();
  for (let i = 0; i < iterations; i++) {
    sub.push(atoms[random(0, n)]);
  }
  return sub.join('');
}

function random (min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

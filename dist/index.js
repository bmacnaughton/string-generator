"use strict";
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
 * 'literal' | "literal" | `literal`
 *
 * count-spec:
 * count-range | count-oneof
 *
 * count-range:
 * min:max=min  // default when not present <1:1>
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
 * "lit chars" | 'lit chars' | `lit chars`    // mostly useful for repeating
 *
 * characters not in a ${pattern} group are literal.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generator = void 0;
const alpha = decodeRanges('A-Za-z');
const numeric = decodeRanges('0-9');
const alphanumeric = decodeRanges('A-Za-z0-9');
const hex = decodeRanges('a-f0-9');
const HEX = decodeRanges('A-F0-9');
const base58 = decodeRanges('A-HJ-NP-Za-km-z1-9');
const codeWords = {
    alpha,
    numeric,
    alphanumeric,
    hex,
    HEX,
    base58,
};
const specRE = /\$\{(.+?)\}+/g;
//
const specRE2 = /\$\{(?<open>[=([`"'])(.+?)\k<open>(\<[0-9|:]+\>)?\}+/g;
class Generator {
    constructor(options = {}) {
        this.codeWords = {};
        this.rand = Math.random;
        this.random = (min, max) => Math.floor(this.rand() * (max - min + 1)) + min;
        if (options.random) {
            this.rand = options.random;
        }
        if (options.codeWords) {
            this.addCodeWords(options.codeWords);
        }
    }
    tagFunction() {
        return this.gen.bind(this);
    }
    decode(spec) {
        return this.gen(['', ''], spec);
    }
    gen(strings, ...specs) {
        var _a;
        const parsedSpecs = [];
        // =codeword<repeats>
        // [char-range]<repeats>
        // (choice|choice)<repeats>
        // "literal"|'literal'<repeats>
        for (let spec of specs) {
            if (typeof spec !== 'string') {
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
                        throw new Error(`found "${spec.slice(1)} when expecting codeword`);
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
                    if (!m) {
                        throw new Error(`found "${spec} when expecting choice-spec`);
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
                        throw new Error(`invalid literal "${spec}"`);
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
        let result = (_a = strings[ix]) !== null && _a !== void 0 ? _a : '';
        for (const spec of parsedSpecs) {
            const sub = this.makeSubstitution(spec.atoms, spec.count);
            result += sub + strings[++ix];
        }
        return result;
    }
    static decodeRepeat(repeat) {
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
    makeSubstitution(atoms, counts) {
        const n = atoms.length - 1;
        const sub = [];
        const iterations = counts.iterations(this.random);
        for (let i = 0; i < iterations; i++) {
            sub.push(atoms[this.random(0, n)]);
        }
        return sub.join('');
    }
    addCodeWords(codeWords) {
        for (const codeWord in codeWords) {
            this.codeWords[codeWord] = codeWords[codeWord];
        }
    }
}
exports.Generator = Generator;
function decodeRanges(rangeString) {
    const chars = [];
    const range = rangeString.split('');
    // allow a dash character in either the first or the last position.
    // but don't add it twice.
    if (range[0] === '-') {
        chars.push(range.shift());
    }
    if (range[range.length - 1] === '-' && chars.length === 0) {
        chars.push(range.pop());
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
    constructor(counts) {
        this.counts = counts;
    }
    iterations(random) {
        return this.counts[random(0, this.counts.length - 1)];
    }
}
class RangeCount {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
    iterations(random) {
        return random(this.min, this.max);
    }
}

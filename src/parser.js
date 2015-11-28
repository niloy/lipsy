const R = require("ramda");

module.exports = parse;

const startsWith = R.curry((needle, stack) => stack.startsWith(needle));
const startsWithRoundBracket = startsWith("(");
const startsWithDoubleQuote = startsWith("\"");
const startsWithCurlyBrace = startsWith("{");
const startsWithSquareBracket = startsWith("[");
const startsWithHashRoundBracket = startsWith("#(");

function parse(str) {
  const str1 = dropSpaces(str);
  const isBoolean = $ => $ === "true" || $ === "false";
  const startsWithColon = startsWith(":");
  const startsWithHashBracket = startsWith("#{");
  const startsWithHashDoubleQuote = startsWith("#\"");
  const isNil = R.equals("nil");

  return R.cond([
    [startsWithRoundBracket,      parseList],
    [isNumber,                    parseNumber],
    [startsWithDoubleQuote,       parseString],
    [startsWithCurlyBrace,        parseMap],
    [isBoolean,                   parseBoolean],
    [startsWithHashBracket,       parseSet],
    [startsWithColon,             parseSymbol],
    [startsWithSquareBracket,     parseVector],
    [startsWithHashDoubleQuote,   parseRegEx],
    [startsWithHashRoundBracket,  parseShortLambda],
    [isNil,                       R.always(null)],
    [R.T,                         parseIdentifier]
  ])(str1);
}

const splitAfterMatchingBracket = R.curry(function (openBracket, closeBracket, str) {
  function throwError() {
    throw new Error("Unbalanced brackets");
  }

  function split(left, right, bracketCount) {
    const h = R.head(right);
    return R.cond([
      [() => bracketCount === 0, () => [left, right]],
      [() => isEmptyString(right), throwError],
      [() => h === openBracket, () => split(left + h, R.tail(right), bracketCount + 1)],
      [() => h === closeBracket, () => split(left + h, R.tail(right), bracketCount - 1)],
      [R.T, () => split(left + h, R.tail(right), bracketCount)]
    ])();
  }

  return split(R.head(str), R.tail(str), 1);
});

function parseShortLambda(str) {
  const list = parseListBody(R.tail(str));
  return Object.defineProperty(list, "type", {value: "slambda", enumerable: false});
}

function parseRegEx(str) {
  const body = stripBrackets(R.tail(str));
  return new RegExp(body);
}

function parseSymbol(str) {
  return {type: "symbol", value: R.tail(str)};
}

function parseIdentifier(str) {
  return {type: "identifier", value: str};
}

function parseSet(str) {
  return parseSetBody(stripBrackets(R.tail(str)));
}

function parseSetBody(str) {
  if (isEmptyString(str)) {
    return new Set();
  }

  const [elem, rest] = splitAfterNextToken(str);
  return parseSetBody(rest).add(parse(elem));
}

function parseBoolean(str) {
  return str === "true" ? true : false;
}

function parseMap(str) {
  return parseMapBody(stripBrackets(str));
}

function parseMapBody(str) {
  if (isEmptyString(str)) {
    return new Map();
  }

  const [key, rest1] = splitAfterNextToken(str);
  const [value, rest2] = splitAfterNextToken(rest1);
  return setMap(parseMapBody(rest2), parse(key), parse(value));
}

function setMap(map, key, value) {
  map.set(key, value);
  return map;
}

function parseString(str) {
  return stripBrackets(str);
}

function parseList(str) {
  const list = parseListBody(stripBrackets(str));
  return Object.defineProperty(list, "type", {value: "list", enumerable: false});
}

function parseVector(str) {
  const vector = parseListBody(stripBrackets(str));
  return Object.defineProperty(vector, "type", {value: "vector", enumerable: false});
}

function stripBrackets(str) {
  return R.dropLast(1, R.tail(str));
}

function splitAfterNextToken(str) {
  const str1 = dropSpaces(str);
  const dropHeadAndAppendSplit = R.curry((openB, closeB, str) => {
    const h = R.head(str);
    const [left, right] = splitAfterMatchingBracket(openB, closeB, R.drop(1, str));
    return [h + left, right];
  });

  return R.cond([
    [startsWithRoundBracket,      splitAfterMatchingBracket("(", ")")],
    [startsWithCurlyBrace,        splitAfterMatchingBracket("{", "}")],
    [startsWithSquareBracket,     splitAfterMatchingBracket("[", "]")],
    [startsWithDoubleQuote,       splitAfterQuoteEnd],
    [startsWithHashRoundBracket,  dropHeadAndAppendSplit("(", ")")],
    [R.T,                         splitOnNextSpace]
  ])(str1);
}

function splitAfterQuoteEnd(str) {
  function split(left, right) {
    const curr = R.head(right);
    const prev = R.last(left);
    return R.cond([
      [() => curr === `"` && prev !== "\\", () => [left + curr, R.tail(right)]],
      [R.T, () => split(left + curr, R.tail(right))]
    ])();
  }

  return split(R.head(str), R.tail(str));
}

function parseListBody(str) {
  if (isEmptyString(str)) {
    return [];
  }

  const [elem, rest] = splitAfterNextToken(str);
  return [parse(elem)].concat(parseListBody(rest));
}

function dropSpaces(str) {
  return str.trim();
}

function isEmptyString(str) {
  return str.trim().length === 0;
}

function splitAt(at, str) {
  return [R.slice(0, at, str), R.slice(at, str.length, str)];
}

function splitOnNextSpace(str) {
  const index = str.indexOf(" ");

  if (index !== -1) {
    return splitAt(index, str);
  } else {
    return [str, ""];
  }
}

function isNumber(str) {
  return /^-?\d/.test(str);
}

function parseNumber(str) {
  return parseFloat(str);
}

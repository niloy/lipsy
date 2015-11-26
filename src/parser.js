const R = require("ramda");

module.exports = parse;

const startsWith = R.curry((needle, stack) => stack.startsWith(needle));
const startsWithRoundBracket = startsWith("(");
const startsWithDoubleQuote = startsWith("\"");
const startsWithCurlyBrace = startsWith("{");
const startsWithSquareBracket = startsWith("[");

function parse(str) {
  const str1 = dropSpaces(str);
  const isBoolean = $ => $ === "true" || $ === "false";
  const startsWithColon = startsWith(":");
  const startsWithHashBracket = startsWith("#{");

  return R.cond([
    [startsWithRoundBracket,  parseList],
    [isNumber,                parseNumber],
    [startsWithDoubleQuote,   parseString],
    [startsWithCurlyBrace,    parseMap],
    [isBoolean,               parseBoolean],
    [startsWithHashBracket,   parseSet],
    [startsWithColon,         parseSymbol],
    [startsWithSquareBracket, parseList],
    [R.T,                     parseIdentifier]
  ])(str1);
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
  return parseListBody(stripBrackets(str));
}

function stripBrackets(str) {
  return R.dropLast(1, R.tail(str));
}

function splitAfterNextToken(str) {
  const str1 = dropSpaces(str);

  return R.cond([
    [startsWithRoundBracket,  splitAfterMatchingBracket.bind(null, "(", ")")],
    [startsWithCurlyBrace,    splitAfterMatchingBracket.bind(null, "{", "}")],
    [startsWithSquareBracket, splitAfterMatchingBracket.bind(null, "[", "]")],
    [startsWithDoubleQuote,   splitAfterQuoteEnd],
    [R.T,                     splitOnNextSpace]
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
  return R.dropWhile(R.test(/\s/), str).join("");
}

function isEmptyString(str) {
  return str.trim().length === 0;
}

function splitAfterMatchingBracket(openBracket, closeBracket, str) {
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

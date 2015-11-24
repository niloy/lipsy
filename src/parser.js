const R = require("ramda");

const input = `{1 2 "1" {3 (1 2)} (1) (2)}`;

function parse(str) {
  const str1 = dropSpaces(str);
  const h = R.head(str1);

  if (h === "(") {
    return parseList(str1);
  }
  if (isNumber(h)) {
    return parseNumber(str1);
  }
  if (h === "\"") {
    return parseString(str1);
  }
  if (h === "{") {
    return parseMap(str1);
  }

  return null;
}

function parseMap(str) {
  return parseMapBody(stripBrackets(str));
}

function parseMapBody(str) {
  if (str.length === 0) {
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

  if (R.head(str1) === "(") {
    return splitAfterMatchingBracket("(", ")", str1);
  } if (R.head(str1) === "{") {
    return splitAfterMatchingBracket("{", "}", str1);
  } else {
    return splitOnNextSpace(str1);
  }
}

function parseListBody(str) {
  if (str.length === 0) {
    return [];
  }

  const [elem, rest] = splitAfterNextToken(str);
  return [parse(elem)].concat(parseListBody(rest));
}

function dropSpaces(str) {
  return R.dropWhile(R.equals(" "), str).join("");
}

function splitAfterMatchingBracket(openBracket, closeBracket, str) {
  function split(left, right, bracketCount) {
    if (bracketCount === 0) {
      return [left, right];
    }

    if (right.length === 0) {
      throw new Error("Unbalanced brackets");
    }

    const h = R.head(right);

    if (h === openBracket) {
      return split(left + h, R.tail(right), bracketCount + 1);
    }
    if (h === closeBracket) {
      return split(left + h, R.tail(right), bracketCount - 1);
    }

    return split(left + h, R.tail(right), bracketCount);
  }

  return split(openBracket, R.tail(str), 1);
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
  return /\d/.test(str);
}

function parseNumber(str) {
  return parseFloat(str);
}

console.log(parse(input));

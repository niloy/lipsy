const R = require("ramda");

const input = `(1 (2 3) (4 (5)))`;

function parse(str) {
  const str1 = dropSpaces(str);
  const h = R.head(str1);

  if (h === "(") {
    return parseList(str1);
  }
  if (isNumber(h)) {
    return parseNumber(str1);
  }
  if (h === `"`) {
    return parseString(str1);
  }

  return null;
}

function parseString(str) {
  return stripBrackets(str);
}

function parseList(str) {
  const body = stripBrackets(str);

  if (body.length === 0) {
    return [];
  }

  return parseListBody(body);
}

function stripBrackets(str) {
  return R.dropLast(1, R.tail(str));
}

function parseListBody(str) {
  if (str.length === 0) {
    return [];
  }

  let elem, rest;

  if (R.head(str) === "(") {
    [elem, rest] = splitAfterMatchingBracket(str);
  } else {
    [elem, rest] = splitOnNextSpace(str);
  }

  return [parse(elem)].concat(parseListBody(dropSpaces(rest)));
}

function dropSpaces(str) {
  return R.dropWhile(R.equals(" "), str);
}

function splitAfterMatchingBracket(str) {
  function split(left, right, bracketCount) {
    if (bracketCount === 0) {
      return [left, right];
    }

    if (right.length === 0) {
      throw new Error("Unbalanced brackets");
    }

    const h = R.head(right);

    if (h === "(") {
      return split(left + h, R.tail(right), bracketCount + 1);
    }
    if (h === ")") {
      return split(left + h, R.tail(right), bracketCount - 1);
    }

    return split(left + h, R.tail(right), bracketCount);
  }

  return split("(", R.tail(str), 1);
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

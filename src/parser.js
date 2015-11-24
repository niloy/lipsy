const R = require("ramda");

const input = `(1 2)`;

function parse(str) {
  const h = R.head(str);

  if (h === "(") {
    return parseList(str);
  }
  if (isNumber(h)) {
    return parseNumber(str);
  }
  if (h === `"`) {
    return parseString(str);
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

  return parseSpaceSeperatedList(body);
}

function stripBrackets(str) {
  return R.dropLast(1, R.tail(str));
}

function parseSpaceSeperatedList(str) {
  if (str.length === 0) {
    return [];
  }

  const [elem, rest] = splitOnNextSpace(str);
  return append(parse(elem), parseSpaceSeperatedList(rest));
}

function append(elem, rest) {
  if (Array.isArray(rest)) {
    return [elem].concat(rest);
  }

  return [elem];
}

function splitAt(at, str) {
  return [R.slice(0, at, str), R.slice(at + 1, str.length, str)];
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

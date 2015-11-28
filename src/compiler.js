const R = require("ramda");
const parse = require("./parser");

const ast = parse(`(fn [x & y] x)`);
// console.log(ast);
console.log(compile(ast));

function compile(ast) {
  const isList = $ => $.type === "list";
  const isString = $ => typeof $ === "string";
  const isNumber = $ => typeof $ === "number";
  const isBoolean = $ => typeof $ === "boolean";
  const isIdentifier = $ => $.type === "identifier";
  const isVector = $ => $.type === "vector";

  return R.cond([
    [isList,        compileList],
    [isString,      compileString],
    [isNumber,      compileNumber],
    [isBoolean,     compileBoolean],
    [isNil,         compileNil],
    [isVector,      compileVector],
    [isIdentifier,  compileIdentifier],
  ])(ast);
}

function compileBoolean(boolean) {
  return boolean.toString();
}

function compileString(str) {
  return `"${str}"`;
}

function compileNumber(num) {
  return num.toString();
}

function compileIdentifier(identifier) {
  return makeIdentifierJsSafe(identifier.value);
}

function makeIdentifierJsSafe(str) {
  const t = {
    "+": "plus",
    "-": "minus",
    "*": "multiply",
    "/": "divide",
    "%": "mod",
    "^": "caret",
    "=": "equal",
    "<": "lessThan",
    ">": "greaterThan",
    "?": "question",
    "!": "exclamation",
    "@": "atTheRate",
    "#": "hash",
    "&": "and",
    "|": "pipe",
  };

  function translate(c) {
    return c in t ? t[c] : c;
  }

  return str.split("").map(translate).join("");
}

function formatText(str) {
  return str.replace(/^\s{4}/gm, "").slice(1);
}

function isConditional(val) {
  return val.type === "identifier" && val.value === "if";
}

function isDefinition(val) {
  return val.type === "identifier" && val.value === "def";
}

function isLambdaDefinition(val) {
  return val.type === "identifier" && val.value === "fn";
}

function isNil(val) {
  return val === null;
}

function compileNil() {
  return "null";
}

function compileLambdaDefinition(args) {
  const params = R.head(args);
  const secondLastParam = R.compose(R.last, R.dropLast(1));
  const hasRestParam = $ => $.length > 1 && secondLastParam($).value === "&";
  const compileParams = $ => $.map(compile).join(", ");
  const allExceptLast2 = R.dropLast(2);
  const addEllipses = R.compose(R.concat(", ..."), compile, R.last);
  const compileRestParams = $ => compileParams(allExceptLast2($)) + addEllipses($);
  const parameters = R.ifElse(hasRestParam, compileRestParams, compileParams)(params);
  const compileStmt = $ => compile($) + ";";
  const isMultiStmtFunction = args => args.length > 2;
  const extractBody = R.compose(R.dropLast(1), R.tail);
  const compileBody = args => extractBody(args).map(compileStmt).join("\n");
  const body = R.ifElse(isMultiStmtFunction, compileBody, () => "")(args);
  const lastStmt = compile(R.last(args));
  const fullFunction = formatText(`
    (function(${parameters}) {
      ${body}
      return ${lastStmt};
    })`
  );
  const arrowFunction = `((${parameters}) => ${lastStmt})`;

  return isMultiStmtFunction(args) ? fullFunction : arrowFunction;
}

function compileDefinition(args) {
  const name = compile(R.head(args));
  const value = compile(R.last(args));
  return `const ${name} = ${value};`;
}

function compileConditional(args) {
  const condtion = compile(R.nth(0, args));
  const thenText = compile(R.nth(1, args));
  const hasThen = args => args.length === 3;
  const compileThen = args => compile(R.nth(2, args));
  const elseText = R.ifElse(hasThen, compileThen, () => "null")(args);

  return `(${condtion}) ? (${thenText}) : (${elseText})`;
}

function compileFunctionInvocation(fn, args) {
  const argsText = args.map(compile).join(", ");
  return `${compile(fn)}(${argsText})`;
}

function compileList(list) {
  const fn = R.head(list);
  const args = R.tail(list);

  return R.cond([
    [isConditional, compileConditional.bind(null, args)],
    [isDefinition, compileDefinition.bind(null, args)],
    [isLambdaDefinition, compileLambdaDefinition.bind(null, args)],
    [R.T, compileFunctionInvocation.bind(null, fn, args)]
  ])(fn);
}

function compileVector(list) {
  return "[" + list.map(compile).join(", ") + "]";
}

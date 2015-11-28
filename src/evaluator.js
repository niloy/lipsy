const R = require("ramda");
const parse = require("./parser");

const symbolTable = {
  "print": (_, ...args) => console.log(...args),
  "println": (_, ...args) => console.log(...args),
  "+": (_, ...args) => args.reduce(R.add),
  "-": (_, ...args) => args.reduce(R.subtract),
  "*": (_, ...args) => args.reduce(R.multiply),
  "/": (_, ...args) => args.reduce(R.divide),
  "=": (_, ...args) => args.reduce(Object.is),
  "mod": (_, x, y) => R.mathMod(x, y),
  "inc": (_, x) => R.inc(x),
  "dec": (_, x) => R.dec(x),
  "map": (symTbl, fn, list) => R.map($ => invokeFunction(symTbl, fn, [$]), list),
  "filter": (symTbl, fn, list) => R.filter($ => invokeFunction(symTbl, fn, [$]), list),
  "range": (_, stop, start = 0) => R.range(start, stop),
  "count": (_, x) => R.length(x),
  "first": (_, x) => R.head(x),
  "last": (_, x) => R.last(x),
  "rest": (_, x) => R.tail(x),
  "even?": (_, x) => x % 2 === 0,
  "zero?": (_, x) => x === 0,
};
const isLambda = R.propEq("type", "lambda");
const isJsFunction = R.compose(R.equals("Function"), R.type);

const ast = parse("[" +
`
(filter (fn [x] (zero? (mod x 2))) (range 20 10))
` + "]");
// console.log(ast);
console.log(R.last(ast.map(evaluate.bind(null, symbolTable))));

function evaluate(symbolTable, ast) {
  const isString = $ => typeof $ === "string";
  const isNumber = $ => typeof $ === "number";
  const isBoolean = $ => typeof $ === "boolean";
  const isList = $ => $.type === "list";
  const isIdentifier = $ => $.type === "identifier";
  const isVector = $ => $.type === "vector";
  const isNil = R.equals(null);

  return R.cond([
    [isNil,         R.always(null)],
    [isString,      R.identity],
    [isNumber,      R.identity],
    [isBoolean,     R.identity],
    [isVector,      R.identity],
    [isLambda,      R.identity],
    [isJsFunction,  R.identity],
    [isList,        evalList.bind(null, symbolTable)],
    [isIdentifier,  id => lookupIdentifier(symbolTable, id.value)],
  ])(ast);
}

function lookupIdentifier(symbolTable, id) {
  return (id in symbolTable) ? symbolTable[id] : eval(id);
}

function evalList(symbolTable, list) {
  const fn = R.head(list);
  const args = R.tail(list);
  const isDefinition = $ => $.value === "def";
  const isConditional = $ => $.value === "if";
  const isLambdaDefinition = $ => $.value === "fn";

  return R.cond([
    [isConditional,       evalConditional.bind(null, symbolTable, args)],
    [isDefinition,        registerDefinition.bind(null, symbolTable, args)],
    [isLambdaDefinition,  evalLambdaDefinition.bind(null, symbolTable, args)],
    [R.T,                 invokeFunction.bind(null, symbolTable, fn, args)]
  ])(fn);
}

function evalLambdaDefinition(symbolTable, args) {
  const params = R.head(args);
  const body = R.tail(args);
  return {
    type: "lambda",
    params: params,
    body: body,
    arity: params.length,
  };
}

function evalConditional(symbolTable, args) {
  const ev = evaluate.bind(null, symbolTable);
  const condition = ev(R.nth(0, args));
  const then = R.nth(1, args);
  const otherwise = args.length > 2 ? R.nth(2, args) : null;
  return condition ? ev(then) : ev(otherwise);
}

function registerDefinition(symbolTable, args) {
  const name = R.head(args).value;
  const value = evaluate(symbolTable, R.last(args));
  symbolTable[name] = value;
  return value;
}

function invokeFunction(symbolTable, fn, args) {
  const fun = evaluate(symbolTable, fn);
  const evaledArgs = args.map(evaluate.bind(null, symbolTable));

  return R.cond([
    [isLambda, () => executeLambda(symbolTable, fun, evaledArgs)],
    [isJsFunction, () => fun.apply(null, [symbolTable].concat(evaledArgs))],
    [R.T, () => new Error("Error in invokeFunction")]
  ])(fun);
}

function executeLambda(symbolTable, fn, args) {
  const paramNames = fn.params.map(x => x.value);
  const newSymbolTable = R.merge(symbolTable, R.fromPairs(R.zip(paramNames, args)));
  return R.last(fn.body.map(evaluate.bind(null, newSymbolTable)));
}

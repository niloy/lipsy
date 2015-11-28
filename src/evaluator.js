const R = require("ramda");
const parse = require("./parser");

const symbolTable = {
  "print": console.log.bind(console),
  "println": console.log.bind(console),
  "+": (...args) => args.reduce(R.add),
  "-": (...args) => args.reduce(R.subtract),
  "*": (...args) => args.reduce(R.multiply),
  "/": (...args) => args.reduce(R.divide),
  "=": (...args) => args.reduce(Object.is),
  "mod": R.mathMod,
  "inc": R.inc,
  "dec": R.dec,
  "map": (fn, list) => R.map($ => $, list),
  "filter": R.filter,
  "range": (stop, start = 0) => R.range(start, stop),
  "count": R.length,
  "first": R.head,
  "last": R.last,
  "rest": R.tail,
};

const ast = parse("[" +
`
(map (fn [x] x) (range 10))
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
  const isLambda = R.propEq("type", "lambda");
  const jsFunction = R.compose(R.equals("Function"), R.type);
  const evaledArgs = args.map(evaluate.bind(null, symbolTable));

  console.log(evaledArgs);

  return R.cond([
    [isLambda, () => executeLambda(symbolTable, fun, evaledArgs)],
    [jsFunction, () => fun.apply(null, evaledArgs)],
    [R.T, () => new Error("Error in invokeFunction")]
  ])(fun);
}

function executeLambda(symbolTable, fn, args) {
  const paramNames = fn.params.map(x => x.value);
  const newSymbolTable = R.merge(symbolTable, R.fromPairs(R.zip(paramNames, args)));

  return R.last(fn.body.map(evaluate.bind(null, newSymbolTable)));
}

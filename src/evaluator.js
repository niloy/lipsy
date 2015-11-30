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
  "reduce": (symTbl, fn, seed, list) =>
    R.reduce((a, b) => invokeFunction(symTbl, fn, [a, b]), seed, list),
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
(def add (fn [a] (fn [b] (+ a b))))

((add 2) 3)
` + "]");
console.log(R.last(ast.map(evaluate.bind(null, symbolTable))));
// const ast = `((fn [x y z] 1 (inc 1) (inc 2) (inc 3))`;
// console.log(evaluate(symbolTable, parse(ast)));

function evaluate(symbolTable, ast) {
  const isString = $ => typeof $ === "string";
  const isNumber = $ => typeof $ === "number";
  const isBoolean = $ => typeof $ === "boolean";
  const isList = $ => $.type === "list";
  const isIdentifier = $ => $.type === "identifier";
  const isVector = $ => $.type === "vector";
  const isNil = R.equals(null);
  const isShortLambda = $ => $.type === "slambda";

  return R.cond([
    [isNil,         R.always(null)],
    [isString,      R.identity],
    [isNumber,      R.identity],
    [isBoolean,     R.identity],
    [isVector,      evalVector.bind(null, symbolTable)],
    [isLambda,      R.identity],
    [isJsFunction,  R.identity],
    [isShortLambda, compileSLambda.bind(null, symbolTable)],
    [isList,        evalList.bind(null, symbolTable)],
    [isIdentifier,  id => lookupIdentifier(symbolTable, id.value)],
  ])(ast);
}

function evalVector(symbolTable, args) {
  return args.map(evaluate.bind(null, symbolTable));
}

function toList(args) {
  const list = args.slice(0);
  return Object.defineProperty(list, "type", {value: "list", enumerable: false});
}

function compileSLambda(symbolTable, args) {
  return compileLambda(symbolTable, [[], toList(args)]);
}

function lookupIdentifier(symbolTable, id) {
  const isLazy = R.propEq("type", "lazyExp");
  const resolveIfLazy = R.ifElse(isLazy, resolveLazyExpression, R.identity);
  return (id in symbolTable) ? resolveIfLazy(symbolTable[id]) : eval(id);
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
    [isLambdaDefinition,  compileLambda.bind(null, symbolTable, args)],
    [R.T,                 invokeFunction.bind(null, symbolTable, fn, args)]
  ])(fn);
}

function compileLambda(symbolTable, args) {
  const params = R.head(args);
  const body = R.tail(args);
  return {
    type: "lambda",
    params: params,
    body: body,
    arity: params.length,
    symbolTable,
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
  const lazyExp = createLazyExpression(symbolTable, R.last(args));
  symbolTable[name] = lazyExp;
}

function createLazyExpression(symbolTable, ast) {
  return {symbolTable, ast, resolved: false, value: null, type: "lazyExp"};
}

function resolveLazyExpression(expression) {
  const isResolved = R.propEq("resolved", true);
  const getValue = R.path(["value"]);
  const resolveAndGetValue = exp => {
    const value = evaluate(expression.symbolTable, expression.ast);
    exp.value = value;
    exp.resolved = true;
    return value;
  };
  return R.ifElse(isResolved, getValue, resolveAndGetValue)(expression);
}

function invokeFunction(symbolTable, fn, args) {
  const fun = evaluate(symbolTable, fn);
  const evaledArgs = () => args.map(evaluate.bind(null, symbolTable));
  const lazyArgs = () => args.map(createLazyExpression.bind(null, symbolTable));

  return R.cond([
    [isLambda, () => executeLambda(symbolTable, fun, lazyArgs())],
    [isJsFunction, () => fun.apply(null, [symbolTable].concat(evaledArgs()))],
    [R.T, () => new Error("Error in invokeFunction")]
  ])(fun);
}

function executeLambda(symbolTable, fn, args) {
  const paramNames = fn.params.map(x => x.value);
  const namedBindings = R.zip(paramNames, args);
  const positionalParamNames = R.range(0, args.length).map(R.inc).map(R.concat("%"));
  const positionalBindings = R.zip(positionalParamNames, args);
  const allBindings = [["%", R.head(args)], ["%&", args]]
                        .concat(positionalBindings).concat(namedBindings);
  const newSymbolTable = R.mergeAll([fn.symbolTable, symbolTable, R.fromPairs(allBindings)]);
  return R.last(fn.body.map(evaluate.bind(null, newSymbolTable)));
}

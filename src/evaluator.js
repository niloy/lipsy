"use strict";
const R = require("ramda");

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
  "nth": (_, x, seq) => R.nth(x, seq),
  "int": (_, x) => parseInt(x, 10),
};

module.exports = function(symbols, ast) {
  const symTbl = R.merge(symbolTable, symbols);
  return ast.map(evaluate.bind(null, symTbl));
};

const isLambda = R.propEq("type", "lambda");
const isJsFunction = R.compose(R.equals("Function"), R.type);
const isVector = Array.isArray;
const isIdentifier = $ => $.type === "identifier";
const isLazyExp = R.propEq("type", "lazyExp");

function evaluate(symbolTable, ast) {
  const isString = $ => typeof $ === "string";
  const isNumber = $ => typeof $ === "number";
  const isBoolean = $ => typeof $ === "boolean";
  const isList = $ => $.type === "list";
  const isNil = R.equals(null);
  const isShortLambda = $ => $.type === "slambda";

  return R.cond([
    [isNil,         R.always(null)],
    [isString,      R.identity],
    [isNumber,      R.identity],
    [isBoolean,     R.identity],
    [isLambda,      R.identity],
    [isJsFunction,  R.identity],
    [isShortLambda, compileSLambda.bind(null, symbolTable)],
    [isList,        evalList.bind(null, symbolTable)],
    [isVector,      evalVector.bind(null, symbolTable)],
    [isIdentifier,  id => lookupIdentifier(symbolTable, id.value)],
    [R.T,           throwError.bind(null, "Unable to evaluate", ast)]
  ])(ast);
}

function throwError(msg, arg) {
  console.log(arg);
  throw new Error("Exception: " + msg);
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
  const resolveIfLazy = R.ifElse(isLazyExp, resolveLazyExpression, R.identity);
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

  return R.cond([
    [isLambda, () => executeLambda(symbolTable, fun, args)],
    [isJsFunction, () => fun.apply(null, [symbolTable].concat(evaledArgs()))],
    [R.T, () => new Error("Error in invokeFunction")]
  ])(fun);
}

function executeLambda(symbolTable, fn, args) {
  const createLaxyExp = ([name, value]) => [name, createLazyExpression(symbolTable, value)];
  const namedBindings = destructure(fn.params, args).map(createLaxyExp);
  const positionalParamNames = R.range(0, args.length).map(R.inc).map(R.concat("%"));
  const positionalBindings = R.zip(positionalParamNames, args);
  const allBindings = [["%", R.head(args)], ["%&", args]]
                        .concat(positionalBindings).concat(namedBindings);
  const newSymbolTable = R.mergeAll([fn.symbolTable, symbolTable, R.fromPairs(allBindings)]);
  return R.last(fn.body.map(evaluate.bind(null, newSymbolTable)));
}

function destructure(name, value) {
  return R.cond([
    [isVector,      destructureVector],
    [isIdentifier,  destructureIdentifier],
    [R.T, () =>     new Error("Unable to destructure")]
  ])(name, value);
}

function destructureIdentifier(identifer, value) {
  return [[identifer.value, value]];
}

function destructureVector(names, values) {
  const isRestArg = R.compose(R.propEq("value", "&"), R.head);
  const isEmpty = (names, values) => R.isEmpty(names) || R.isEmpty(values);
  const destructureAndCollect = (names, values) => {
    const first = destructure(R.head(names), R.head(values));
    const rest = destructureVector(R.tail(names), R.tail(values));
    return first.concat(rest);
  };
  const collectRestArg = (names, values) => destructure(R.nth(1, names), values);

  return R.cond([
    [isEmpty,   () => []],
    [isRestArg, collectRestArg],
    [R.T,       destructureAndCollect]
  ])(names, values);
}

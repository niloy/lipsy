## A Lisp/Clojure dialect implementation in JS.

[Online Demo](http://niloy.github.io/lipsy/index.html)

This is a toy programming language implemented using functional javascript. An
attemp to learn both both functional JS and Clojure. Implementing a turing
complete language in so few lines of code was incredibly fun.

The following 2 files are important:

* `src/parser.js` Take a string written in Lisp and converts to JS data structure.

  * List enclosed in `()` are converted to JS arrays.
  * Vectors enclosed in `[]` are converted to JS arrays.
  * Strings are converted to JS strings.
  * Numbers are converted to JS numbers.
  * Boolean are convreted to JS boolean.
  * Regular expression are converted to JS RegExp.
  * Maps enclosed in `{}` are converted to JS `Map`, not `Object`.
  * Sets enclosed in `#{}` are converted to JS `Set`.
  * Short Lambdas `#(...)` are converted to JS arrays.
  * Everything else is an identifier.

* `src/evaluator.js` Takes JS data structure of a Lisp program and runs it.
It supports lazy evaluation of function arguments, closure, lambda, destructuring
and rest arguments, short lambda sytnax. And a handful of core clojure functions
like `+, -, *, /, =, mod, map, filter, reduce, println, range, count, int, nth`
and a few more. Check the `examples/` folder for examples.

## Running the examples

NodeJS 4+ is required. Then run the following commands

```sh
npm install
chmod a+x src/lipsy
src/lipsy examples/hello.clj
```

Inspired from [SICP](https://mitpress.mit.edu/sicp/), implemented some cool stuff
like lazy evaluation of function arguments and lazy `def`. Functions are first
class with support for closure.

const R = require("ramda");
const parse = require("./parser");
const evaluate = require("./evaluator");

const removeComments = R.replace(/;.*/g, "");
const getElement = document.getElementById.bind(document);
const fetchCode = num => getElement("codebox" + num).value;
const runButtonClicked = R.pipe(
  fetchCode,
  removeComments,
  str => "[" + str + "]",
  parse,
  evaluate.bind(null, {}),
  result => console.log(R.last(result))
);

window.onload = function() {
  R.range(1, 9).forEach(function(n) {
    getElement("run" + n).addEventListener("click", runButtonClicked.bind(null, n));
  });
};

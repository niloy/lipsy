BROWSERIFY=node_modules/.bin/browserify

install:
	make install

dist/demo.js: dist/ramda.js index.html src/demo.js src/evaluator.js src/parser.js
	$(BROWSERIFY) src/demo.js -t babelify -x ramda -o dist/demo.js

dist/ramda.js:
	$(BROWSERIFY) -r ramda | $(UGLIFY) > dist/ramda.js

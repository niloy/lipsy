;; Prints the parameter and returns it.
(def echo (fn [x] (print x) x))

(def returnFirst (fn [x] x))

;; Because the function 'returnFirst' only uses first parameter, only '1' will
;; be printed. The arguments while invoking a function are not immediately
;; evaluated. Arguments are evaluated on demand.
(returnFirst (echo 1) (echo 2) (echo 3))

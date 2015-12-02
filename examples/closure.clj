(def add (fn [x] (fn [y] (+ x y))))

(def add5 (add 5))

(print (add5 2))

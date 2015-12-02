;; Destructring a vector
(def add-pair (fn [[x1 y1] [x2 y2]] [(+ x1 x2) (+ x2 y2)]))

(print (add-pair [1 2] [3 4]))

;; Rest args
(def restArgs (fn [x & rest] rest))

(print (restArgs 1 2 3))

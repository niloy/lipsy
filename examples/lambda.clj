;; Lambda example
(print "Odds" (filter (fn [x] (= 1 (mod x 2))) (range 20)))

;; Lambda short form
(print "Squares" (map #(* % %) (range 10)))

;; Lambda short form, positional args
(print "Addition" (#(+ %1 %2) 2 4))

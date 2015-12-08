(def a [1 a])

(def take (fn [c arr]
  (if (zero? c)
    []
    (cons (first arr) (take (dec c) (second arr))))))

(print (take 5 a))
(def N (nth 2 *command-line-args*))

(def factorial (fn [x]
  (if (zero? x) 1 (* x (factorial (dec x))))))

(print (factorial (int N)))

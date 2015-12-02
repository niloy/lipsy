(def N (nth 2 *command-line-args*))

(def factorial (fn [x]
  (if (zero? x) 1 (* x (factorial (dec x))))))

(print
  (if (= (count *command-line-args*) 3)
    (factorial (int N))
    "Please provide number as command line parameter"))

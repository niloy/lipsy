(def N (nth 2 *command-line-args*))

(def factorial (fn [x]
  (if (zero? x) 1 (* x (factorial (dec x))))))

(print (if (= N 3) (factorial (int N)) "Please pass number as parameter"))

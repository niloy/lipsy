(def radius (nth 2 *command-line-args*))

(def pi Math.PI)

(def area (fn [r] (* pi r r)))

(def circumferance (fn [r] (* 2 pi r)))

(def printAreaAndCircumferance (fn [radius]
  (print "Radius: " (area radius))
  (print "Circumfereance: " (circumferance radius))))

(if (= 3 (count *command-line-args*))
  (printAreaAndCircumferance radius)
  (print "Please provide radius as command line parameter"))

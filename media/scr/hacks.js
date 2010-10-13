if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun /*, thisp */) {
	"use strict"
	if (this === void 0 || this === null) { throw new TypeError() }
	var t = Object(this)
	var len = t.length >>> 0
	if (typeof fun !== "function") { throw new TypeError() }
	var res = []
	var thisp = arguments[1]
	for (var i = 0; i < len; i++) {
	    if (i in t) {
		var val = t[i] // in case fun mutates this
		if (fun.call(thisp, val, i, t)) { res.push(val) }
	    }
	}
	return res
    }
}

if (false) { //(!Object.prototype.keys) {
    Object.prototype.keys = function(skipFunction)  {
        var result = []
        for (var p in this) {
            if ( ! this.hasOwnProperty(p) ) {
                continue
            }
            if ( skipFunction && 'function' == typeof this[p] ) {
                continue
            }
            result.push(p)
        }
        return result
    }
}


var gt = function(a, b) { return a > b }
var ident = function(a) { return a }

var makeImg = function(options) {
    var src = options['src'] ? options['src'] : '/media/img/missing.png'
    var width = '' + (options['width'] || 32)
    var height = '' + (options['height'] || 32)
    var alt = options['alt'] || ''
    var style = options['style'] || ''
    var cls = options['class'] || ''
    return '<img src="'+src+'" width="'+width+'" height="'+height+'" alt="'+alt+'" style="'+style+'" class="'+cls+'" />'
}


function Lazy(def) {
    var cache = []
    return function(i) {
	return (i in cache) ? cache[i] : (cache[i] = def.call(arguments.callee, i))
    }
}
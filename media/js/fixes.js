if (typeof(console) == 'undefined') {
    var console = {}
    console.log = console.error = function() {}
}

var keys = function(obj) {
    var ks = []
    for (var k in obj) {
	ks.push(k)
    }
    return ks
}

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


var showProfile = function(p) {
    $('#avatar:empty').html(makeImg({src: p.avatar}))
}


var Lazy = function(def) {
    var cache = []
    return function(i) {
	return (i in cache) ? cache[i] : (cache[i] = def.call(arguments.callee, i))
    }
}


var initExtensions = function(jq) {
    jq.fn.fadeAway = function() { return this.each(function() { jq(this).fadeTo(750, 0) }) }
    jq.fn.fadeBack = function() { return this.each(function() { jq(this).fadeTo(750, 100) }) }
}
initExtensions(jQuery)

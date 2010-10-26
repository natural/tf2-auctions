if (typeof(console) == 'undefined') {
    var console = {}
    console.log = console.error = function() {}
}

String.prototype.format = function() {
    var formatted = this
    for (arg in arguments) {
        formatted = formatted.replace("{" + arg + "}", arguments[arg])
    }
    return formatted
}


var ident = function(a) { return a }


var keys = function(obj) {
    var ks = []
    for (var k in obj) {
	ks.push(k)
    }
    return ks
}


var values = function(obj) {
    var vs = []
    for (var k in obj) {
	vs.push(obj[k])
    }
    return vs
}


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
    $('#avatar').html(makeImg({src: p.avatar, width: 32, height: 32})).show()
}


var lazy = function(def) {
    var cache = []
    return function(i) {
	return (i in cache) ? cache[i] : (cache[i] = def.call(arguments.callee, i))
    }
}


var setTitle = function(name) {
    $('title').append(' -- ' + name)
}


var makeLoader = function(config) {
    var cache = {}, prefix = config.prefix, name = config.name
    return function(options) {
        options = options || {}
        var suffix = options.suffix
        var url = prefix + (suffix || '')
        var okay = function(data) {
	    console.log(name, 'success', data)
	    cache[url] = data
    	    var cb = options.success ? options.success : ident
	    cb(data)
        }
        var error = function(req, status, err) {
	    console.error(name, 'error', req, status, err, url)
	    var cb = options.error ? options.error : ident
	    cb(req, status, err)
        }
        if (!cache[url]) {
            console.log(name, 'loading', url)
	    $.ajax({url: url,
		    dataType: (config.dataType||'json'),
		    jsonpCallback: (config.jsonpCallback||null),
		    cache: true,
		    success: okay,
		    error: error
                    })
        } else {
	    console.log(name, 'using cached data', cache[url])
	    okay(cache[url])
        }
    }
}

var AuthProfileLoader = makeLoader({
    prefix: '/api/v1/auth/profile',
    name: 'AuthProfileLoader'})

var ProfileLoader = makeLoader({
    prefix: '/api/v1/public/profile/',
    name: 'ProfileLoader'})

var BackpackLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/items/',
    dataType: 'jsonp',
    jsonpCallback: 'tf2bayBackpackLoader',
    name: 'BackpackLoader'})

var SchemaLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/schema',
    dataType: 'jsonp',
    jsonpCallback: 'tf2baySchemaLoader',
    name: 'SchemaLoader'})

var ListingLoader = makeLoader({
    prefix: '/api/v1/public/listing/',
    name: 'ListingLoader'})

var ListingsLoader = makeLoader({
    prefix: '/api/v1/public/listings/',
    name: 'ListingLoader'})

var SearchLoader = makeLoader({
    prefix: '/api/v1/public/search',
    name: 'SearchLoader'})

var StatsLoader = makeLoader({
    prefix: '/api/v1/public/stats',
    name: 'StatsLoader'})

var BidsLoader = makeLoader({
    prefix: '/api/v1/public/bids/', // move to /api/v1/public/player-bids/
    name: 'BidsLoader'})


var SchemaTool = function(schema) {
    var self = this

    self.load = function(schema) {
        self.schema = schema['result']
        self._definitions = {}, self._attrByName = {}, self._attrById = {}
	self.itemDefs = lazy(function() {
	    $.each(self.schema['items']['item'], function(index, definition) {
		self._definitions[definition['defindex']] = definition
	    })
            return self._definitions
	})
	self.attributesByName = lazy(function() {
            $.each(self.schema['attributes']['attribute'], function(index, definition) {
		self._attrByName[definition['name']] = definition
	    })
	    return self._attrByName
	})
	self.attributesById = lazy(function() {
            $.each(self.schema['attributes']['attribute'], function(index, definition) {
		self._attrById[definition['defindex']] = definition
            })
	    return self._attrById
	})
    }

    self.setImages = function() {
        // replace any items on the page that have the "schema
        // definition index replace" class with the url of the item
        // specified in the content.
        var img = function(url) { return makeImg({src:url, width:64, height:64}) }
        $('.defindex-lazy').each(function(index, tag) {
            var data = $.parseJSON($(tag).text())
	    if (!data) { return }
            if (typeof(data) == 'object') {
                var defindex = data.defindex
	    } else {
                var defindex = data
            }
	    var item = self.itemDefs()[defindex]
            if (!item) { return }
            $(tag).data('node', asPlayerItem(data))
	    $(tag).html(img(item['image_url'])).fadeIn()
	})
    }

    self.select = function(key, match) {
        var res = {}
        var matchf = (typeof(match) == typeof('')) ? function(v) { return v == match } : match
	$.each(self.itemDefs(), function(idx, def) {
	    if (matchf(def[key])) {res[def.defindex] = def }})
        return res
    }

    self.actions = function() {return self.select('item_slot', 'action')}
    self.crates = function() {return self.select('craft_class', 'supply_crate')}
    self.hats = function() {return self.select('item_slot', 'head')}
    self.metal = function() {return self.select('craft_class', 'craft_bar')}
    self.misc = function() {return self.select('item_slot', 'misc')}
    self.tokens = function() {return self.select('craft_class', 'craft_token')}
    self.tools = function() {return self.select('craft_class', 'tool')}
    self.weapons = function() {return self.select('craft_class', 'weapon')}
    self.stock = function() {
	return self.select('defindex', function(v) {
	    return (v>190 && v<213) || (v>=0 && v<31)
	})
    }
    self.uncraftable = function() {
	return self.select('craft_class', function(v) { return (v==undefined) })
    }
    self.qualityMap = function() {
	var map = {}, names = self.schema['qualityNames']
	$.each(self.schema['qualities'], function(name, key) { map[key] = names[name] })
	return map
    }
    self.tradable = function() {
	var stock = self.stock(), can = {}, cannot = {}
	$.each(self.itemDefs(), function(idx, def) {
	    $.each(   ((def.attributes || {} ).attribute || []), function(i, a) {
		if (a['class']=='cannot_trade' && a['value'] == 1) {
		    cannot[idx] = def
		}
	    })
	})
	    $.each(self.itemDefs(), function(idx, def) {
		if (!(def.defindex in cannot) && !(def.defindex in stock)) {
		    can[def.defindex] = def
		}
	    })
        return can
    }
    if (typeof(schema) == 'undefined') {
	new SchemaLoader({success: self.load})
    } else {
	self.load(schema)
    }
}


var smallMsg = function(text) {
    if (text) {
	return $('#site-small-msg').removeClass('null').text(text)
    } else {
	return $('#site-small-msg')
    }
}


var asPlayerItem = function(i) {
    return {defindex:i.defindex, level:i.level||'', quality:i.quality||i.item_quality}
}


var makeCell = function(v) {
    return '<td><div class="defindex-lazy">{0}</div></td>'.format(v)
}


var listingItemsUids = function(src) {
    var uids = {}
    $.each(src, function(idx, listing) {
	$.each(listing.items, function(i, item) {
	    uids[item.uniqueid] = item
	})
    })
    return uids
}


var bidItemsUids = function(src) {
    var uids = {}
    $.each(src, function(idx, bid) {
	$.each(bid.items, function(i, item) {
	    uids[item.uniqueid] = item
	})
    })
    return uids
}


var showTermsDialog = function(e) {
    var okay = function(text) {
	$('#terms-dialog').html(text).dialog({
	    dialogClass: 'dialog-test',
	    modal: true,
	    resizable: false,
	    show: 'fade',
	    title: 'Site Rules, Terms and Conditions',
	    width: $(window).width() * 0.9
	})
    }
    var error = function(request, status, error) {}
    $.ajax({url: '/terms',
	    cache: true,
	    success: okay,
	    error: error
    })
    return false
}


var initExtensions = function(jq) {
    jq.fn.fadeAway = function() { return this.each(function() { jq(this).fadeTo(750, 0) }) }
    jq.fn.fadeBack = function() { return this.each(function() { jq(this).fadeTo(750, 100) }) }
    jq.fn.scrollTopAni = function() { return jq('html body').animate({scrollTop: jq(this).offset().top}) }
}
initExtensions(jQuery)


$(document).ready(function() {
    $("a[href='/login']").attr('href', '/login?next=' + encodeURIComponent(window.location.href))
    console.log('tools.js ready')
})



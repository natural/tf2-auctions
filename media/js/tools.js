if (typeof(console) == 'undefined') {
    var console = {}
    console.log = console.error = function() {}
}


String.prototype.fs = function() {
    var formatted = this
    for (var i=0; i<arguments.length; i++) {
        formatted = formatted.replace("{" + i + "}", arguments[i])
    }
    return formatted
}


var ident = function(a) { return a }


var keys = function(obj) {
    var ks = []
    for (var k in obj) { ks.push(k) }
    return ks
}


var values = function(obj) {
    var vs = []
    for (var k in obj) { vs.push(obj[k]) }
    return vs
}


var lazy = function(def) {
    var cache = []
    return function(i) {
	return (i in cache) ? cache[i] : (cache[i] = def.call(arguments.callee, i))
    }
}

var pathTail = function() { return window.location.pathname.split('/').pop() }

var makeImg = function(options) {
    var src = options['src'] ? options['src'] : '/media/img/missing.png'
    var width = '' + (options['width'] || 32)
    var height = '' + (options['height'] || 32)
    var alt = options['alt'] || ''
    var style = options['style'] || ''
    var cls = options['class'] || ''
    return '<img src="{0}" width="{1}" height="{2}" alt="{3}" style="{4}" class="{5}" />'.fs(
	src, width, height, alt, style, cls)
}


var setTitle = function(name) { $('title').append(' -- ' + name) }


var showProfile = function(profile) {
    $('#content-avatar-pod')
        .html(makeImg({src: profile.avatar, width: 32, height: 32}))
        .show()
}



var makeLoader = function(config) {
    var cache = {}, prefix = config.prefix, name = config.name
    this.cache = cache
    return function(options) {
        options = options || {}
        var suffix = options.suffix
        var url = prefix + (suffix || '')
        var okay = function(data) {
	    console.log(name, 'success', data)
	    cache[url] = {data:data}
    	    var cb = options.success ? options.success : ident
	    cb(data)
        }
        var error = function(req, status, err) {
	    console.error(name, 'error', req, status, err, url)
	    cache[url] = {request:req, status:status, error:err}
	    var cb = options.error ? options.error : ident
	    cb(req, status, err)
        }
        var res = cache[url]
        if (!res) {
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
	    if (res.data) {
		okay(res.data)
	    } else {
		error(res.request, res.status, res.error)
	    }
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
	    return ((v>=190 && v<=212) || (v<=30))
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
	return $('#content-site-message').removeClass('null').fadeIn().text(text)
    } else {
	return $('#content-site-message')
    }
}


var asPlayerItem = function(i) {
    return {defindex:i.defindex, level:i.level||'', quality:i.quality||i.item_quality}
}


var makeCell = function(v) {
    return '<td><div class="defindex-lazy">{0}</div></td>'.fs(v)
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
	$('#content-terms-dialog').html(text).dialog({
	    dialogClass: 'dialog-test',
	    modal: true,
	    resizable: false,
	    show: 'fade',
	    title: 'TF2Bay.com Rules,Terms and Conditions, and Privacy Policy',
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


var defaultUserAuthOkay = function(profile) {
    $('#content-user-buttons, #content-logout-link, #content-search-link').fadeIn()
    $('#content-player-profile-link').attr('href', '/profile/'+profile.id64)
    showProfile(profile)
}


var defaultUserAuthError = function(request, status, error) {
    $('#content-login-link')
	.attr('href', '/login?next=' + encodeURIComponent(window.location.href))
        .fadeIn()
    $('#content-search-link').fadeIn()
}


var initExtensions = function(jq) {
    jq.fn.fadeAway = function() { this.each(function() { jq(this).fadeTo(750, 0) }); return this }
    jq.fn.fadeBack = function() { this.each(function() { jq(this).fadeTo(750, 100) }); return this }
    jq.fn.scrollTopAni = function() { return jq('html body').animate({scrollTop: jq(this).offset().top}) }
}
initExtensions(jQuery)


$(document).ready(function() {
    console.log('tools.js ready')
})



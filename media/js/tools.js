// define a console if we don't have one.
if (typeof(console) == 'undefined') {
    var console = {}
    console.log = console.error = function() {}
}


// a very simple but useful string formatting function
String.prototype.fs = function() {
    var formatted = this
    for (var i=0; i<arguments.length; i++) {
	formatted = formatted.replace('{' + i + '}', arguments[i])
    }
    return formatted
}


// oh javascript, i wish you were more functional
var ident = function(a) { return a }


// it's the end of the line for you, i'm afraid
var pathTail = function() { return window.location.pathname.split('/').pop() }


// is it document.title, window.title or $(something).title?  i can
// never remember.
var setTitle = function(name) { document.title = document.title + ' - ' + name }


// returns the keys of the given object
var keys = function(obj) {
    var ks = []
    for (var k in obj) { ks.push(k) }
    return ks
}


// returns the values of the given object
var values = function(obj) {
    var vs = []
    for (var k in obj) { vs.push(obj[k]) }
    return vs
}


// more lazy than a Sunday afternoon
var lazy = function(def) {
    var cache = []
    return function(i) {
	return (i in cache) ? cache[i] : (cache[i] = def.call(arguments.callee, i))
    }
}


// closure over a settings object
var settingsView = function(settings) {
    var valid = settings && keys(settings).length
    return {
	showEquipped: (valid ? settings['badge-equipped'] : true),
	showPainted: (valid ? settings['badge-painted'] : true),
	showUseCount: (valid ? settings['badge-usecount'] : true),
	showAngrySalad: (valid ? settings['angry-fruit-salad'] : false)
    }
}


// group of functions closed over an item definition and an item
// schema.
var itemUtil = function(item, schema) {
    return {
	canTrade: function() {
	    return !(item.flag_cannot_trade) && !(item.flag_active_listing) && !(item.flag_active_bid)
	},
	equippedTag: function() {
	    return '<span class="badge equipped">Equipped</span>'
	},
	quantityTag: function(q) {
	    return '<span class="badge quantity">{0}</span>'.fs(q)
	},
	jewelTag: function(c) {
	    return '<span class="jewel jewel-{0}">&nbsp;</span>'.fs(c)
	},
	img: function() {
	    return makeImg({src: schema.itemDefs()[item['defindex']]['image_url'],
			    style:'display:none', width:64, height:64})
	},
	isEquipped: function() {
	    return (item['inventory'] & 0xff0000) != 0
	},
	pos:  function() {
	    return (item.pos) ? item.pos : item['inventory'] & 0xFFFF
	},
	painted: function () {
	    var attrs = (item.attributes || {}).attribute || []
	    var paint = 0
	    $.each( $(attrs), function (idx, attr) {
		if (attr.defindex==142) { paint = attr.float_value }
	    })
	    return paint
	},
	effect: function() {
	    var attrs = (item.attributes || {}).attribute || []
	    var effect = 0
	    $.each( $(attrs), function (idx, attr) {
		if (attr.defindex==134) { effect = attr.float_value }
	    })
	    return effect
	}
    }
}


// makes a table cell with a lazy div
var makeCell = function(v) { return '<td><div class="defindex-lazy">{0}</div></td>'.fs(v) }


// makes tooltip hover in/out functions
var makeHovers = function(tool) {
    return {
	enter: function(event) {
	    tool.show(event)
	    try {
		var data = $('div', this).data('node')
		$(this).addClass('outline')
	    } catch (e) {}
	},
	leave: function(event) {
	    tool.hide(event)
	    $(this).removeClass('outline')
	}
    }
}


// makes a nice img tag with all the trimmings.
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


// makes an async. data loader, which is a preconfigured ajax call.
var makeLoader = function(config) {
    var cache = {}, prefix = config.prefix, name = config.name
    this.cache = cache
    return function(options) {
	options = options || {}
	var suffix = options.suffix
	var url = prefix + (suffix || '')
	var okay = function(data) {
	    if (config.debug || options.debug) {
		console.log(name, 'success', data)
	    }
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
	var async = typeof(config.async) == 'undefined' ? true : config.async
	if (!res) {
	    if (config.debug || options.debug) {
		console.log('{0}(url="{1}", async={2})'.fs(name, url, async))
	    }
	    $.ajax({url: url,
		    async: async,
		    dataType: (config.dataType||'json'),
		    jsonpCallback: (config.jsonpCallback || null),
		    cache: true,
		    success: okay,
		    error: error
		    })
	} else {
	    if (config.debug || options.debug) {
		console.log(name, 'using cached data', cache[url])
	    }
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
    jsonpCallback: 'tf2auctionsBackpackLoader',
    name: 'BackpackLoader'})


var SchemaLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/schema',
    dataType: 'jsonp',
    jsonpCallback: 'tf2auctionsSchemaLoader',
    name: 'SchemaLoader'})


var StatusLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/status/',
    dataType: 'jsonp',
    name: 'StatusLoader'})


var ListingLoader = makeLoader({
    prefix: '/api/v1/public/listing/',
    name: 'ListingLoader'})


var ListingsLoader = makeLoader({
    prefix: '/api/v1/public/listings/',
    name: 'ListingLoader'})


var MessagesLoader = makeLoader({
    prefix: '/api/v1/auth/list-messages',
    name: 'MessagesLoader'})


var SearchLoader = makeLoader({
    prefix: '/api/v1/public/search',
    name: 'SearchLoader'})


var StatsLoader = makeLoader({
    prefix: '/api/v1/public/stats',
    name: 'StatsLoader'})


var BidsLoader = makeLoader({
    prefix: '/api/v1/public/bids/', // move to /api/v1/public/player-bids/
    name: 'BidsLoader'})


var ProfileTool = function(profile) {
    var self = this

    self.defaultUrl = function() {
	    return profile.custom_name ? '/id/{0}'.fs(profile.custom_name) : '/profile/{0}'.fs(profile.id64)
    }

    self.defaultUserAuthError = function(request, status, error) {
	$('#content-login-link')
	    .attr('href', '/login?next=' + encodeURIComponent(window.location.href))
	$('#content-search-link, #content-quick-backpack, #content-all-items').fadeIn()
    }

    self.defaultUserAuthOkay = function() {
	//$('#content-user-buttons, #content-logout-link, #content-search-link, #content-quick-backpack, #content-all-items').fadeIn()
	$('#content-user-buttons, #content-logout-link').fadeIn()
	$('#content-login-link').fadeAway()
	$('#content-player-profile-link').attr('href', self.defaultUrl())
	self.put()
    }

    self.put = function() {
	$('#content-avatar-pod')
	    .html(makeImg({src: profile.avatar, width: 24, height: 24}))
	    .show()
	new StatusLoader({
	    suffix: profile.id64, success: function(status) {
		$('#content-avatar-pod img').addClass(status.online_state)
		$('#content-avatar-pod img').addClass('profile-status')
	    }
	})
    }

}


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

    self.asPlayerItem = function(i) {
	return {
	    attributes: i.attributes || {'attribute':[]},
	    defindex: i.defindex,
	    level: i.level || '',
	    quality: i.quality || i.item_quality,
	    quantity: i.quantity || 1,
	    inventory: i.inventory || 0
	}
    }

    // this is a better name:
    self.putImages = function(settings) {
	self.setImages(settings)
    }

    self.setImages = function(settings) {
	// replace any items on the page that have the "schema
	// definition index replace" class with the url of the item
	// specified in the content.
	var itemImg = function(url) { return makeImg({src:url, width:64, height:64}) }
	var toolDefs = self.tools(), actionDefs = self.actions()
	var settingV = settingsView(settings)
	$('.defindex-lazy').each(function(index, tag) {
	    var data = $.parseJSON($(tag).text())
	    if (!data) { return }
	    if (typeof(data) == 'object') {
		var defindex = data.defindex
	    } else {
		var defindex = data
	    }
	    var def = self.itemDefs()[defindex]
	    if (!def) { return }
	    var pitem = self.asPlayerItem(data)
	    $(tag).data('node', pitem)
	    $(tag).html(itemImg(def['image_url'])).fadeIn()
	    var iutil = itemUtil(pitem, schema)
	    var img = $('img', tag)

	    if (iutil.isEquipped() && settingV.showEquipped ) {
		img.addClass('equipped equipped-'+defindex).after(iutil.equippedTag())
		img.removeClass('unequipped-'+defindex)
		$('.equipped', tag).fadeIn()
	    } else {
		img.addClass('unequipped-'+defindex)
		img.removeClass('equipped equipped-'+defindex)
	    }

	    var paintColor = iutil.painted()
	    if (paintColor && settingV.showPainted) {
		img.after('<span class="jewel jewel-{0}">&nbsp;</span>'.fs(paintColor))
	    }

	    if (((defindex in toolDefs) || (defindex in actionDefs)) && settingV.showUseCount) {
		if (img) {
		    img.before(iutil.quantityTag(pitem['quantity']))
		    $('.quantity', tag).fadeIn()
		}
	    }
	    if (settingV.showAngrySalad) {
		img.parent().parent()
		    .addClass('border-quality-{0} background-quality-{1}'.fs( pitem.quality, pitem.quality ))
	    }
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

    self.tradableBackpack = function() {
	return $.map(values(self.tradable()), function(item, index) {
	    return {defindex:item.defindex, pos:index+1}
	})
    }

    if (typeof(schema) == 'undefined') {
	new SchemaLoader({success: self.load})
    } else {
	self.load(schema)
    }
}


var hiliteSpan = function(after) {
    return '<span class="hilite">&nbsp;</span><span>{0}</span>'.fs(after)
}


var siteMessage = function(text) {
    if (text) {
	return $('#content-site-message').removeClass('null').fadeIn().text(text)
    } else {
	return $('#content-site-message')
    }
}


var listingItemsUids = bidItemsUids = itemsUids = function(src) {
    var uids = {}
    $.each(src, function(idx, obj) {
	$.each(obj.items, function(i, item) {
	    uids[item.uniqueid] = item
	})
    })
    return uids
}


var showTermsDialog = function(e) {
    var okay = function(text) {
	$('#content-terms-dialog').html(text).dialog({
	    dialogClass: 'terms-dialog',
	    modal: true,
	    resizable: false,
	    show: 'fade',
	    height: 400,
	    title: 'TF2Auctions.com Rules,Terms and Conditions, and Privacy Policy',
	    width: $(window).width() * 0.9, position: 'top' });
    };
    var error = function(request, status, error) {}
    $.ajax({url: '/terms-dialog',
	    cache: true,
	    success: okay,
	    error: error
	   });
    return false
}


var moveClasses = function(source, target, expr) {
    $.each(source.attr('class').split(' '), function(idx, name) {
	if (name.match(expr)) { target.addClass(name); source.removeClass(name) }
    })
}

var moveSalad = function(source, target) {
    return moveClasses(source, target, /(border|background)-quality/)
}

var getHash = function() { return location.hash.slice(1) }


var initExtensions = function(jq) {
    jq.fn.fadeAway = function() { this.each(function() { jq(this).fadeTo(750, 0) }); return this }
    jq.fn.fadeBack = function() { this.each(function() { jq(this).fadeTo(750, 100) }); return this }
    jq.fn.scrollTopAni = function() { return jq('html body').animate({scrollTop: jq(this).offset().top}) }
}
initExtensions(jQuery)



/*


// copied from somewhere...

var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
function encode64(input) {
    var output = new Array()
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;
    while (i < input.length) {
	chr1 = input.charCodeAt(i++)
	chr2 = input.charCodeAt(i++)
	chr3 = input.charCodeAt(i++)
	enc1 = chr1 >> 2
	enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
	enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
	enc4 = chr3 & 63
	if (isNaN(chr2)) {
	    enc3 = enc4 = 64
	} else if (isNaN(chr3)) {
	    enc4 = 64
	}
	output.push(keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4))
    }
    return output.join('')
}

function decode64(input) {
    var output = new Array()
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "")
    while (i < input.length) {
	enc1 = keyStr.indexOf(input.charAt(i++))
	enc2 = keyStr.indexOf(input.charAt(i++))
	enc3 = keyStr.indexOf(input.charAt(i++))
	enc4 = keyStr.indexOf(input.charAt(i++))
	chr1 = (enc1 << 2) | (enc2 >> 4)
	chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
	chr3 = ((enc3 & 3) << 6) | enc4
	output.push(String.fromCharCode(chr1))
	if (enc3 != 64) {
	    output.push(String.fromCharCode(chr2))
	}
	if (enc4 != 64) {
	    output.push(String.fromCharCode(chr3))
	}
    }
    return output.join('')
}


*/
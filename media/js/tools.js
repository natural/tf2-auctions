if (typeof console == 'undefined') {
    var console = {log: $.noop, error: $.noop}
}


if (typeof Object.create !== 'function') {
    Object.create = function (proto) {
        var obj = function() {}
        obj.prototype = proto
	return new obj()
    }
}


String.prototype.fs = function() {
    var formatted = this
    for (var i=0; i<arguments.length; i++) {
	formatted = formatted.replace('{' + i + '}', arguments[i])
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


var listingUtil = Object.create({
    putMany: function(options) {
	var self = this
	$.each(options.listings, function(idx, listing) {
	    var clone = options.prototype.clone()
	    self.putOne(listing, clone, options.prefix)
	    if (options.withStatus) { self.putStatus(listing, clone) }
	    options.target.append(clone)
	})
    },

    putStatus: function(listing, target) {
	new StatusLoader({
            suffix: listing.owner.id64,
	    success: function(status) {
		$('.listing-avatar', target)
		    .addClass('profile-status ' + status.online_state)
	    }
        })
    },

    putOne: function(listing, target, prefix) {
        target.removeClass('null prototype').addClass('listing-seed')
        if (listing.description) {
	    $('.listing-description', target).text(listing.description)
	} else {
	    $('.listing-description-label', target).empty()
	    $('.listing-description', target).empty()
	}
	$('.listing-owner', target).text(listing.owner.personaname)
	$('.listing-owner', target).parent().attr('href', '/profile/'+listing.owner.id64)
	$('.listing-avatar', target).attr('src', listing.owner.avatar)
	$('.listing-avatar', target).parent().attr('href', '/profile/'+listing.owner.id64)
	$('.bid-count-seed', target).text(listing.bid_count || '0') // bid_count because bids aren't fetched.
	var next = 0
	$.each(listing.items, function(index, item) {
	   $( $('.item-view div', target)[next]).append( $.toJSON(item) )
	   next += 1
	})
	if (listing.min_bid_currency_use) {
	    $(prefix+'-listing-view-min-bid-currency-use', target).removeClass('null')
	    $(prefix+'-listing-view-min-bid-currency-use .currency', target)
		.text('${0}'.fs(listing.min_bid_currency_amount))
	    $(prefix+'-listing-view-min-bid', target).removeClass('null')
	} else {
	    if (listing.min_bid.length) {
		var next = 0
		$.each(listing.min_bid, function(index, defindex) {
	            $($(prefix+'-listing-view-min-bid .item-view div', target)[next])
			       .append($.toJSON({defindex:defindex, quality:6}))
		     next += 1
		})
		$(prefix+'-listing-view-min-bid', target).removeClass('null')
	    } else {
		$(prefix+'-listing-view-min-bid', target).hide()
	    }
	}
	$('.listing-view-link a', target).attr('href', '/listing/'+listing.id)
	$('.listing-view-link > span.expires', target)
	    .append('<span class="mono float-right">Expires: {0}</span>'.fs(''+new Date(listing.expires)))
    }
})


var profileUtil = Object.create({
    loginUrl: function() {
	return '/login?next=' + encodeURIComponent(window.location.href)
    },

    defaultUrl: function(p) {
	return p.custom_name ? '/id/{0}'.fs(p.custom_name) : '/profile/{0}'.fs(p.id64)
    },

    defaultUserAuthError: function(request, status, error) {
	$('#content-login-link').attr('href', profileUtil.loginUrl())
	$('#content-search-link, #content-quick-backpack').show()
        $('#content-site-buttons').show()
    },

    defaultUserAuthOkay: function(p) {
	$('#content-player-profile-link').attr('href', profileUtil.defaultUrl(p))
	profileUtil.put(p)
	$('#content-login-link').hide()
	$('#content-user-buttons, #content-logout-link').show()
        $('#content-site-buttons').show()
    },

    put: function(p) {
        if (p.message_count) {
	    var b = $('#content-player-profile-link')
	    if (!b.data('msg-count')) {
		b.text('{0} ({1})'.fs(b.text(), p.message_count))
		b.data('msg-count', p.message_count)
	    }
	}
	$('#content-avatar-pod')
	    .html(makeImg({src: p.avatar, width: 24, height: 24}))
	    .show()
	new StatusLoader({
	    suffix: p.id64,
            success: function(status) {
	        $('#content-avatar-pod img').addClass(status.online_state)
	        $('#content-avatar-pod img').addClass('profile-status')
	    }
        })
    }
})


// closure over a settings object
var settingsUtil = function(settings) {
    var valid = settings && keys(settings).length
    return {
	showEquipped: (valid ? settings['badge-equipped'] : true),
	showPainted: (valid ? settings['badge-painted'] : true),
	showUseCount: (valid ? settings['badge-usecount'] : true),
	showAngrySalad: (valid ? settings['angry-fruit-salad'] : false)
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
    var cache = this.cache = {}
    var prefix = config.prefix, name = config.name
    var successCallbacks = [], errorCallbacks = [], loading = false

    return function(options) {
	options = options || {}
	var url = prefix + (options.suffix || '')
	successCallbacks.push(options.success ? options.success : ident)
	errorCallbacks.push(options.error ? options.error : ident)

	var loadSuccess = function(data) {
	    cache[url] = {data:data}
	    if (config.debug || options.debug) {
		console.log(name, 'success: ', data, 'callbacks: ', successCallbacks.length)
	    }
	    if (config.successEvent) {
		$(document).trigger(config.successEvent, data)
	    }
	    while (successCallbacks.length) { successCallbacks.pop()(data) }
	    loading = false
	}

	var loadError = function(req, status, err) {
	    cache[url] = {request:req, status:status, error:err}
	    console.error(name, 'error', req, status, err, url)
	    if (config.errorEvent) {
		$(document).trigger(config.errorEvent, [req, status, err])
	    }
	    while (errorCallbacks.length) { errorCallbacks.pop()(req, status, err) }
	    loading = false
	}

	var res = cache[url]
	if (!res) {
	    if (!loading) {
		loading = true
		if (config.debug || options.debug) {
		    console.log('{0}(url="{1}")'.fs(name, url))
		}
		$.ajax({
		    url: url,
		    async: typeof(config.async) == 'undefined' ? true : config.async,
		    dataType: (config.dataType || 'json'),
		    jsonpCallback: (config.jsonpCallback || null),
		    cache: true,
		    success: loadSuccess,
		    error: loadError
		})
	    }
	} else {
	    if (config.debug || options.debug) {
		console.log(name, 'cache hit', cache[url])
	    }
	    if (res.data) {
		loadSuccess(res.data)
	    } else {
		loadError(res.request, res.status, res.error)
	    }
	}
    }
}


var AuthProfileLoader = makeLoader({
    prefix: '/api/v1/auth/profile',
    name: 'AuthProfileLoader',
    successEvent: 'authProfileLoaded',
    errorEvent: 'authProfileError',
})


var BackpackLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v2/public/items/',
    dataType: 'jsonp',
    jsonpCallback: 'tf2auctionsBackpackLoader',
    name: 'BackpackLoader'
})


var SchemaLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/schema',
    dataType: 'jsonp',
    jsonpCallback: 'tf2auctionsSchemaLoader',
    name: 'SchemaLoader',
    successEvent: 'schemaLoaded'
})


var StatusLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/status/',
    dataType: 'jsonp',
    name: 'StatusLoader'
})


var ListingsLoader = makeLoader({
    prefix: '/api/v1/public/listings/',
    name: 'ListingsLoader'
})


var SearchLoader = makeLoader({
    prefix: '/api/v1/public/search',
    name: 'SearchLoader'
})


var BidsLoader = makeLoader({
    prefix: '/api/v1/public/bids/', // move to /api/v1/public/player-bids/
    name: 'BidsLoader'
})


var schemaUtil = function(s) { return new SchemaTool(s) }

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
	self.tooltips = new ItemHoverTool(self)
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

    self.putImages = function(settings, callback) {
	// replace any items on the page that have the "schema
	// definition index replace" class with the url of the item
	// specified in the content.
	var itemImg = function(url) { return makeImg({src:url, width:64, height:64}) }
	var toolDefs = self.tools(),
	    actionDefs = self.actions(),
	    settingV = settingsUtil(settings)
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
	    if (!img.data('node')) { img.data('node', data) }

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
        if (callback) { callback() }
    }

    self.select = function(key, match) {
	var res = {}
	var matchf = (typeof(match) == typeof('')) ? function(v) { return v == match } : match
	$.each(self.itemDefs(), function(idx, def) {
	    if (matchf(def[key])) {res[def.defindex] = def }})
	return res
    }

    self.all = function() { return self.select('', function(v) { return true }) }
    self.actions = function() { return self.select('item_slot', 'action') }
    self.crates = function() { return self.select('craft_class', 'supply_crate') }
    self.hats = function() { return self.select('item_slot', 'head') }
    self.metal = function() { return self.select('craft_class', 'craft_bar') }
    self.misc = function() { return self.select('item_slot', 'misc') }
    self.tokens = function() { return self.select('craft_class', 'craft_token') }
    self.tools = function() { return self.select('craft_class', 'tool') }
    self.weapons = function() { return self.select('craft_class', 'weapon') }
    self.wearables = function() { return self.select('item_class', 'tf_wearable_item') }

    self.scoot = function() { return self.usedByClass('Scout') }
    self.soly = function() { return self.usedByClass('Soldier') }
    self.pyro = function() { return self.usedByClass('Pyro') }
    self.demo = function() { return self.usedByClass('Demoman') }
    self.heavy = function() { return self.usedByClass('Heavy') }
    self.engi = function() { return self.usedByClass('Engineer') }
    self.medic = function() { return self.usedByClass('Medic') }
    self.sniper = function() { return self.usedByClass('Sniper') }
    self.spy = function() { return self.usedByClass('Spy') }

    self.usedByClass = function(className, others) {
	return self.select('used_by_classes', function(cs) {
	    if (!cs || !cs['class']) { return false }
	    return $.inArray(className, cs['class']) > -1
	})
    }

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

    self.tradable = function(items) {
	items = items || self.itemDefs()
	var stock = self.stock(), can = {}, cannot = {}
	$.each(items, function(idx, def) {
	    $.each(   ((def.attributes || {} ).attribute || []), function(i, a) {
		if (a['class']=='cannot_trade' && a['value'] == 1) {
		    cannot[idx] = def
		}
	    })
	})
	$.each(items, function(idx, def) {
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


// this should also move to the default View object
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


// again, the default view object
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


var updateTimeLeft = function (expires, onChange, onExpires) {
    expires = new Date(expires)
    return function() {
	var now = new Date(), delta = expires.getTime() - now.getTime()
	if (delta < 0) {
	    onExpires()
	} else {
	    var days=0, hours=0, mins=0, secs=0, text=''
	    delta = Math.floor(delta/1000)
	    days = Math.floor(delta/86400)
	    delta = delta % 86400
	    hours = Math.floor(delta/3600)
	    delta = delta % 3600
	    mins = Math.floor(delta/60)
	    delta = delta % 60
	    secs = Math.floor(delta)
	    if (days != 0) { text += days +'d ' }
	    if (days != 0 || hours != 0) { text += hours + 'h ' }
	    if (days != 0 || hours != 0 || mins != 0) { text += mins +'m ' }
	    text += secs +'s'
	    onChange(text)
	}
    }
}


// this should be culled
var make$$ = function(prefix) {
    return function(suffix, next) { return $('{0}{1}'.fs(prefix, suffix), next) }
}


//
// This begins our small Model View Controller hierarchy.
//
// MVC is the root object that defines the 'extend' function for
// creating new objects and a default 'init' funciton that does
// nothing.
//
var MVC = {
    clones: [],
    init: function() { return this },
    extend: function(ext) {
	var obj = Object.create(this)
	if (ext) { $.extend(obj, ext) }
	this.clones.push(obj)
	return obj
    }
}


//
// This is the root Controller object.
//
var Controller = MVC.extend({
    clones: [],
    eventNames: $.merge(keys($.attrFn), keys($.event.special)),

    init: function() {
        var self = this
	// initalize the model associated with this controller.  the
	// model will initalize the view when it's ready.
	self.model.init.apply(self.model, [self.view, self.config])

	// initialize anything in the namespace that looks like an
	// event listener.
        $.each(keys(self), function(idx, key) {
            var value = self[key]
            if (typeof key == 'string' && (typeof value == 'function' || typeof value == 'object')) {
		var names = key.split(' '),
	            name = names.pop()
		if (name == 'ready') {
		    $(function() { value.apply(self, arguments) })
		} else if (name.indexOf('live:') == 0) {
		    var inner = name.split(':')
		    $(names.join(' ')).live(inner[1], function(e) { e.controller = self; value.apply(self, [e]) })
	        } else if (name && self.eventNames.indexOf(name) > -1) {
	            $(names.join(' ')).bind(name, function(e) { e.controller = self; value.apply(self, [e]) })
                }
	    }
        })
    },

    hash: function() { return location.hash.slice(1) }
})


//
// This is the root Model object.  Model objects are
// initialized automatically by their associated Controller.
//
// During initialization, Model objects make one or more network
// reqeusts to load data.  After all requests are completed, the model
// object calls the 'join' method of the associated view.
//
// At initialization, Model and its clones invoke a AuthProfileLoader
// with its success and error callbacks set to the functions
// 'authSuccess' and 'authError', respectively.
//
var Model = MVC.extend({
    clones: [],
    requests: [],
    name: 'Model',

    authSuccess: function(profile) {
	this.profile = profile
	this.view.authSuccess.apply(this.view, [profile])
    },

    authError: function(req, status, err) {
        this.view.authError.apply(this.view, [req, status, err])
    },

    init: function(view, config) {
	var self = this
	self.view = view
        view.init.apply(view, [self])

	// request the authorized user profile
        self.requests.push(function() {
            var success = function(p) { self.authSuccess.apply(self, [p]) }
            var error = function(r, s, e) { self.authError.apply(self, [r,s,e]) }
            var s = (config && config.auth && config.auth.settings ? 'settings=1' : '')
            s = s ? ('?' + s) : ''
	    new AuthProfileLoader({suffix: s, success: success, error: error})
        })

	// request the model data
	self.requests.push(function() {
            var success = function(v) { self.ready.apply(self, [v]) }
            new self.loader({success: success, suffix: self.loaderSuffix || ''})
        })
        var binder = $('<foo />')
	binder.bind('ajaxStop.{0}'.fs(self.name), function() {
            view.join.apply(view, [self.results])
            binder.unbind('ajaxStop.{0}'.fs(self.name))
        })
        $.each(self.requests, function(i, r) {  r.apply(self)  })
    },

    // default implementation that sets the results as an attribute on
    // the model
    ready: function(results) {
	this.results = results
    },

    // convenience function for cloning the Model object with
    // parameters for a new loader
    make: function(mc, lc) {
	if (lc) { mc.loader = makeLoader(lc) }
	return Model.extend(mc)
    }
})


//
// This is a model object that is pre-configured for using the TF2
// item schema as its data.  When initialized, this object (and any of
// its clones) fetches the item schema and creates an instance of
// SchemaTool, setting that instance as the 'tool' attribute.
//
var SchemaModel = Model.extend({
    loader: SchemaLoader,

    ready: function(results) {
        this.results = results
        this.tool = new SchemaTool(results)
    },
})


//
// This is the root View object.
//
// The View object and its clones provide several interesting behaviors:
//
// 2. the '$$' function provides prefixed jquery selectors via the
// 'slug' attribute.
//
// 3. the 'proto' method creates DOM element clones based on the
// 'cloneClass' attribute.
//
// 4. if the 'model' attribute is supplied, it will be initalized
// after the view is initalized.
//
var View = MVC.extend({
    clones: [],
    slug: '',
    $$: function(suffix, next) { return $('{0}{1}'.fs(this.slug, suffix), next) },
    authError: function() {},
    authSuccess: function() {},
    init: function(model) { this.model = model },
    join: function() {},

    proto: function() {
	var cc = this.cloneClass
	return $('.' + cc).clone().removeClass('prototype null ' + cc)
    },

    message: function(v) {
	return siteMessage(v)
    },

    showTermsDialog: function() { showTermsDialog() },

    hiliteSpan: function(after) {
	return '<span class="hilite">&nbsp;</span><span>{0}</span>'.fs(after)
    }

})


var SchemaView = View.extend({
    putImages: function(p) {
	this.model.tool.putImages(p)
    },

    putItems: function(target, items, cols) {
	var col = 0,
	    cols = cols || 10,
	    makeCell = function(v) {
                return '<td><div class="defindex-lazy">{0}</div></td>'.fs(v)
            }
	$.each(items, function(idx, item) {
	    if (!(col % cols)) { target.append('<tr></tr>') }
	    col += 1
            if (typeof(item)=='number') {
		item = {defindex:item, quality:6}
	    } else if (typeof(item.quality)=='undefined'){
		item = {defindex:item.defindex, quality:6}
	    }
	    var cell = makeCell($.toJSON(item))
            if (item.data) { $('div', cell).data('node', item) }
	    $('tr:last', target).append(cell)
	})
        if (col % cols) {
	    var pad = new Array( 1 + (cols - col % cols)   ).join('<td><div></div></td>')
	    $('tr:last', target).append(pad)
	}
	$('td div:empty', target).parent().remove()
    },

    joinListings: function(options) {
	listingUtil.putMany(options)
    }
})


var SearchBaseView = SchemaView.extend({
    initFeatured: function(featured) {
	var target = $('#featured-listings'),
	    self = this
	$.each(featured, function(index, fitem) {
            var proto = $('#featured-listings div.prototype').clone()
		.addClass('listing-seed')
	        .removeClass('prototype')
	    self.putListing(fitem, proto, target)
	})
	if (featured.length) {
	    $('#featured-listings div.listing-seed.null:first').removeClass('null')
	    $('#featured-listings div.listing-seed div.navs span.nav.next').removeClass('null')
	    $('#featured-listings div.listing-seed div.navs span.nonav.prev').removeClass('null')
	    $('#featured-listings-pod').slideDown()
	}
    },

    navFeatured: function(offset) {
	var prefix = '#featured-listings div.listing-seed'
	    current = $('{0}.listing-seed:visible'.fs(prefix)),
	    others = $('{0}.listing-seed:hidden'.fs(prefix)),
	    all = $('{0}.listing-seed'.fs(prefix)),
	    index = all.index(current),
            count = all.length
	if (index > -1 && (index + offset) > -1 && ((index + offset) < count)) {
	    current.fadeOut(function () { $(all[index+offset]).fadeIn() })
	    var nonPrev = $('{0} div.navs span.nonav.prev'.fs(prefix)),
                navPrev = $('{0} div.navs span.nav.prev'.fs(prefix)),
                nonNext = $('{0} div.navs span.nonav.next'.fs(prefix)),
                navNext = $('{0} div.navs span.nav.next'.fs(prefix))
	    if (index+offset == 0) {
		nonPrev.show()
		navPrev.hide()
	    } else {
		nonPrev.hide()
		navPrev.show()
	    }
	    if (index+offset == count-1) {
		nonNext.show()
		navNext.hide()
	    } else {
		nonNext.hide()
		navNext.show()
	    }
	}
    }
})


//
// document and library initialization
//

var initExtensions = function(jq) {
    jq.fn.fadeAway = function() { this.each(function() { jq(this).fadeTo(750, 0) }); return this }
    jq.fn.fadeBack = function() { this.each(function() { jq(this).fadeTo(750, 100) }); return this }
    jq.fn.scrollTopAni = function() { return jq('html body').animate({scrollTop: jq(this).offset().top}) }
}
initExtensions(jQuery)


// if and when the profile is loaded for an authorized user, perform
// the default actions for that kind of user.
$(document).bind('authProfileLoaded', function(event, profile) {
    profileUtil.defaultUserAuthOkay(profile)
})


// if and when a profile cannot be loaded (because the user isn't
// authorized, i.e., anon), perform the default actions for that kind
// of user.
$(document).bind('authProfileError', function(event, req, status, err) {
    profileUtil.defaultUserAuthError(req, status, err)
})


// if and when the items schema is loaded, hook it up to a SchemaTool
// and a ItemHoverTool.
$(document).bind('schemaLoaded', function(event, schema) {
    var st = new SchemaTool(schema),
        tt = new ItemHoverTool(st)
    $('div.ov td.item-view, #backpack-ac td, .backpack td')
	.live('mouseover', function(e) { tt.show(e); $(this).addClass('outline')  })
	.live('mouseout',  function(e) {  tt.hide(e);  $(this).removeClass('outline') })
    $('.listing-view')
	.live('mouseover', function() { $(this).addClass('listing-hover') })
	.live('mouseout', function() { $(this).removeClass('listing-hover') })
})


$(function() {
    // initialize each direct clone of the Controller object:
    $.each(Controller.clones, function(i, c) { c.init.apply(c) })
})

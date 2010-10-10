/*

*/
var ident = function(v) {return v}
var undef = function(v) { return typeof(v) == 'undefined' }
var apiUrlBase = 'http://tf2apiproxy.appspot.com/'
var urls = {
    apiPlayerItems: apiUrlBase + 'api/v1/items/',
    apiProfile:     apiUrlBase + 'api/v1/profile/',
    apiSchema:      apiUrlBase + 'api/v1/schema',
    apiSearch:      apiUrlBase + 'api/v1/search/',
    steamCommunity: 'http://steamcommunity.com/',
    steam:          'http://steampowered.com/',
    tf2Items:       'http://www.tf2items.com/',
    tf2Stats:       'http://tf2stats.net/'
}
var colors = {
    blue:  [ 51, 152, 197, 255],
    green: [ 59, 174,  73, 255],
    grey:  [128, 128, 128, 255],
}


// this object provides transparent seralization and deseralization
// of values via the localStorage interface.
//
// this might be useful:  chrome.extension.onRequest.addListener(this.refreshHandler)
var BaseStorage = {
    init: function() {
    },

    profileId: function(v) {
	if (undef(v)) {
	    return this.get('profileId')
	}
	this.set('profileId', v)
    },

    set: function(key, value, options) {
	options = options || {}
	var encoder = options['encoder'] || JSON.stringify
	localStorage.setItem(key, encoder(value))
    },

    get: function(key, options) {
	options = options || {}
	var factory = options['decoder'] || JSON.parse
	var missing = options['missing'] || ''
	var value = localStorage.getItem(key)
	if (value == null) {
	    value = missing
	}
	try {
	    return factory(value)
	} catch (e) {
	    return value
	}
    },

    clear: function() {
	localStorage.clear()
    },


    loadItemDefs: function(success, error) {
	var url = 'media/items_' + _('language_code') + '.json'
	$.ajax({url: chrome.extension.getURL(url),
		async: false, dataType: 'text',
		error: error, success: success})

    },

}


var NetTool = {
    timeout: 1000*10, lastReq: null, lastErr: null,

    get: function(options) {
	var success = function(data, status, req) {
	    var cb = options['success']
	    if (cb) { cb(req.responseText) }
	}
	var error = function(req, status, err) {
	    console.error(status, err, req)
	    var eb = options['error']
	    if (eb) eb({error: err, status: status})
	}
	// Add caching based on option 'cache'; use url as storage key
	$.ajax({url: options['url'],
		async: undef(options['async']) ? true : undef(options['async']),
		timeout: undef(options['timeout']) ? this.timeout : undef(options['timeout']),
		dataType: 'text',
		success: success,
		error: error})
    },
}

function textNodeInt(selector, xml) {
    v = parseInt($(selector, xml).text())
    return v ? v : 0
}

function _ (item) {
    if (typeof(item) == 'string') {
	var options = {key: item, missing: item}
    } else {
	var options = item
    }
    var key = options.key
    if (!key) {
	return options.missing || ''
    }
    if (options.subs) {
	var val = chrome.i18n.getMessage(key, options.subs)
    } else {
	var val = chrome.i18n.getMessage(key)
    }
    return !val ? options.missing || '' : val
}

// wha?
var steamIdElement = null

var i18nMap = {
    'its_msg_7':
        function(id) {
	    if (!steamIdElement) {
		steamIdElement = $('#steamID').parent().html()
		$('#steamID').remove()
	    }
	    var h = $('h2.'+id)
	    h.html(_({key:id, subs:[steamIdElement]}))
	},

}


function i18nize() {
    var lang = chrome.i18n.getMessage('language_code')
    if (lang != 'en') {
	$('[lang='+lang+']').css('display', 'inline')
	$('[lang='+lang+']').children().css('display', 'inline')
    }
    var targets = $("[class*='its_msg_'], [id*='its_msg_']")
    targets.each(function(index, node) {
        node = $(node)
        if (node.attr('id').indexOf('its_msg_')==0) {
            var msgid = node.attr('id')
        } else {
	    var cls = node.attr('class')
	    var msgid = cls.substring(cls.search(/its_msg_\d+/)).split(' ')[0]
	}
	if (msgid in i18nMap) {
	    var fun = i18nMap[msgid]
	    fun(msgid)
	} else {
	    var txt = _(msgid)
	    node.html(txt)
	}
    })
}


//
//
//
var SchemaTool = {
    itemDefs: null,

    init: function(source) {
	var self = this
	self.schema = JSON.parse(source)['result']
	// a way to lazily compute these would be nice
        self.itemDefs = {}, self.attributesByName = {}, self.attributesById = {}

	$.each(self.schema['items']['item'], function(idx, def) {
	    self.itemDefs[def['defindex']] = def
	})
        $.each(self.schema['attributes']['attribute'], function(idx, def) {
	    self.attributesByName[def['name']] = def
	    self.attributesById[def['defindex']] = def
        })
    },

    select: function(key, match) {
        var res = {}
        var matchf = (typeof(match) == typeof('')) ? function(v) { return v == match } : match
	$.each(this.itemDefs, function(idx, def) { if (matchf(def[key])) {res[idx] = def }})
        return res
    },

    actions: function() {return this.select('item_slot', 'action')},
    crates:  function() {return this.select('craft_class', 'supply_crate')},
    hats:    function() {return this.select('item_slot', 'head')},
    metal:   function() {return this.select('craft_class', 'craft_bar')},
    misc:    function() {return this.select('item_slot', 'misc')},
    tokens:  function() {return this.select('craft_class', 'craft_token')},
    tools:   function() {return this.select('craft_class', 'tool')},
    weapons: function() {return this.select('craft_class', 'weapon')},
    stock:   function() {
	return this.select('defindex', function(v) { return (v>190 && v<213) })
    },
    uncraftable: function() {
	return this.select('craft_class', function(v) { return (v==undefined) })
    },

    qualityMap: function() {
	var map = {}, names = this.schema['qualityNames']
	$.each(this.schema['qualities'], function(name, key) { map[key] = names[name] })
	return map
    },




}


var ItemsTool = {
    items: null,

    init: function(source) {
        this.items = JSON.parse(source)
	// can't call the schema tool directly because it might not be
	// ready, so we supply small wrappers.
	this.hats = this.makeFilter(function() { return SchemaTool.hats() })
	this.metal = this.makeFilter(function() { return SchemaTool.metal() })
	this.misc = this.makeFilter(function() { return SchemaTool.misc() })
    },

    makeFilter: function(schemaCall) {
	return function() {
	    var defs = schemaCall()
	    return this.items.filter(function(item) { return item['defindex'] in defs })
	}
    },
}


// this object encapsulates the interaction between this extension and
// the web browser; opening tabs and windows, etc.
//
var BrowserTool = {
    betterTranslation: function() {
	return window.open('mailto:phineas.natural@gmail.com?subject=Better Translation')
    },

    externalBackpack: function() {
	return this.show(urls.tf2Items + 'profiles/' + BaseStorage.profileId())
    },

    externalStats: function() {
	return this.show(urls.tf2Stats + 'player_stats/' + BaseStorage.profileId())
    },

    showOptions: function() {
	chrome.tabs.create({url:'./options.html'})
	window.close()
	return false
    },

    showProfile: function(id64) {
	id64 = (typeof(id64) == 'undefined') ? BaseStorage.profileId() : id64
        return this.show(urls.steamCommunity + 'profiles/' + id64)
    },

    show: function(url) {
	this.open(function (m) { return m.indexOf(url) == 0 }, url)
    },

    open: function(match, newUrl) {
	chrome.tabs.getAllInWindow(undefined,
            function(tabs) {
                for (var i = 0, tab; tab = tabs[i]; i++) {
                    if (tab.url && match(tab.url)) {
		        window.close()
                        chrome.tabs.update(tab.id, {selected:true})
                        return false
                    }
                }
	        window.close()
                chrome.tabs.create({url:newUrl})
	        return false
            })
    },
}

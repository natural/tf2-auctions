var SchemaTool = {
    init: function(source) {
	var self = this
	self.schema = source['result']
        self._definitions = {}, self._attrByName = {}, self._attrById = {}

	self.itemDefs = Lazy(function() {
	    $.each(self.schema['items']['item'], function(index, definition) {
		self._definitions[definition['defindex']] = definition
	    })
            return self._definitions
	})

	self.attributesByName = Lazy(function() {
            $.each(self.schema['attributes']['attribute'], function(index, definition) {
		self._attrByName[definition['name']] = definition
	    })
	    return self._attrByName
	})

	self.attributesById = Lazy(function() {
            $.each(self.schema['attributes']['attribute'], function(index, definition) {
		self._attrById[definition['defindex']] = definition
            })
	    return self._attrById
	})
    },

    setImages: function() {
        // replace any items on the page that have the "schema
        // definition index replace" class with the url of the item
        // specified in the content.
        $('.defindex-lazy').each(function(index, tag) {
	    var item = SchemaTool.itemDefs()[$(tag).text()]
            if (!item) { return }
	        $(tag).html("<img src='" + item['image_url'] + "' height=48 width=48 />").fadeIn()
	})
    },

    select: function(key, match) {
        var res = {}
        var matchf = (typeof(match) == typeof('')) ? function(v) { return v == match } : match
	$.each(this.itemDefs(), function(idx, def) {
	    if (matchf(def[key])) {res[def.defindex] = def }})
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
	return this.select('defindex', function(v) {
	    return (v>190 && v<213) || (v>=0 && v<31)
	})
    },
    uncraftable: function() {
	return this.select('craft_class', function(v) { return (v==undefined) })
    },
    qualityMap: function() {
	var map = {}, names = this.schema['qualityNames']
	$.each(this.schema['qualities'], function(name, key) { map[key] = names[name] })
	return map
    },

    tradable: function() {
	var stock = SchemaTool.stock(), can = {}, cannot = {}
	$.each(SchemaTool.itemDefs(), function(idx, def) {
	    $.each(   ((def.attributes || {} ).attribute || []), function(i, a) {
		if (a['class']=='cannot_trade' && a['value'] == 1) {
		    cannot[idx] = def
		}
	    })
	})
	    $.each(SchemaTool.itemDefs(), function(idx, def) {
		if (!(def.defindex in cannot) && !(def.defindex in stock)) {
		    can[def.defindex] = def
		}
	    })
        return can
    }


}


var listingsUids = function() {
    var ll = new ListingsLoader(), uids = {}
    $.each(ll.listings, function(idx, listing) {
	$.each(listing.items, function(i, item) {
	    uids[item.uniqueid] = item
	})
	    })
    return uids
}

var BackpackItemsTool = {
    equippedTag: '<span style="display:none" class="equipped">Equipped</span>',

    itemEquipped: function(item) { return (item['inventory'] & 0xff0000) != 0 },
    itemImg: function(item) {
	var src = SchemaTool.itemDefs()[item['defindex']]['image_url']
	src = src ? src : '/media/img/missing.png'
	return '<img style="display:none" src="' + src + '" />'
    },
    itemInv: function(item) { return item['inventory']  },
    itemPos: function(item) { return item['inventory'] & 0xFFFF },
    itemCanTrade: function(item) { return !(item.flag_cannot_trade) && !(item.flag_active_listing) },
    placeItems: function(slug, items) {
	var newIdx = -1, self = this
	var toolDefs = SchemaTool.tools(), actionDefs = SchemaTool.actions()
	var uids = listingsUids()
	$.each(items, function(index, item) {
	    item.flag_active_listing = (item.id in uids)
	    var pos = self.itemPos(item)
	    if (pos > 0) {
		var ele = $('#' + slug + pos + ' div').append(self.itemImg(item))
		var img = $('img:last', ele).data('node', item)
		var def = item['defindex']
		if (self.itemEquipped(item)) {
		    img.addClass('equipped equipped-'+def).after(self.equippedTag)
		    img.removeClass('unequipped-'+def)
		} else {
		    img.addClass('unequipped-'+def)
		    img.removeClass('equipped equipped-'+def)
		}
		if (self.itemCanTrade(item)) {
		    ele.parent().removeClass('cannot-trade active-listing')
		} else {
		    ele.parent().addClass('cannot-trade')
		    if (item.flag_active_listing) {
			ele.parent().addClass('active-listing')
		    }
		}
	    } else {
		newIdx += 1
		if ($('#unplaced-backpack-' + slug + ' table.unplaced td:not(:has(img))').length == 0) {
		    var cells = new Array(5+1).join('<td><div></div></td>')
		    $('#unplaced-backpack-' + slug + ' table.unplaced').append('<tbody><tr>' + cells + '</tr></tbody>')
		}
		$('#unplaced-backpack-' + slug + ' table.unplaced td:eq('+newIdx+') div').append(self.itemImg(item))
		$('#unplaced-backpack-' + slug + ' table.unplaced td img:last').data('node', item)
	    }
	    // add the dohicky for item quanity
	    if ((item['defindex'] in toolDefs) || (item['defindex'] in actionDefs)) {
		img.before('<span class="quantity">' + item['quantity'] + '</span>')
		img.css('margin-top', '-1em')
	    }
	})
	$('#unplaced-backpack-' + slug + ', #backpack-' + slug + ' label.null').toggle(newIdx > -1)
	$(self.itemContentSelector(slug)).fadeIn(750)
	$('#backpack-listing').fadeIn()
    },

    itemContentSelector: function(slug) {
	return '#unplaced-backpack-' + slug + ' table.unplaced td img, #backpack-' + slug + ' table.backpack td img, span.equipped'
    }

}


var BackpackView = function(slug) {
    this.current = 1
    this.count = 1
    this.slug = slug
    this.count = $('#backpack-' + slug + ' table.backpack tbody').length
    var self = this
    $('#backpack-nav-' + slug + ' .nav:first a').click(function (e) {return self.nav(e, -1)})
    $('#backpack-nav-' + slug + ' .nav:last a').click(function (e) {return self.nav(e, 1)})

    this.nav = function(event, offset) {
	if (event.detail != 1) { return false }
	if ((self.current + offset) > 0 && (self.current + offset <= self.count)) {
	    $('#backpack-' + self.slug + ' .backpackPage-' + self.current).fadeOut(250, function() {
		self.current += offset
		$('#backpack-' + self.slug + ' .backpackPage-' + self.current).fadeIn(250)
		self.navChanged()
	    })
	}
	return false
    }

    this.navChanged = function () {
	var current = this.current, count = this.count
	$('#backpack-pagecount-' + slug).text(current + '/' + count)
	if (this.current == 1) {
	    $('#backpack-nav-' + slug + ' .nonav:first').show()
	    $('#backpack-nav-' + slug + ' .nav:first').hide()
	} else {
	    $('#backpack-nav-' + slug + ' .nonav:first').hide()
	    $('#backpack-nav-' + slug + ' .nav:first').show()
	}
	if (this.current == this.count) {
	    $('#backpack-nav-' + slug + ' .nonav:last').show()
	    $('#backpack-nav-' + slug + ' .nav:last').hide()
	} else {
	    $('#backpack-nav-' + slug + ' .nonav:last').hide()
	    $('#backpack-nav-' + slug + ' .nav:last').show()
	}
    }
}


var ProfileLoader = function(options) {
    options = options || {}
    var self = this
    var okay = function(profile) {
	ProfileLoader.cache = self.profile = profile
	var cb = options.success ? options.success : ident
	cb(profile)
    }
    var error = function(err) {
	console.error(err)
	var cb = options.error ? options.error : ident
	cb(schema)
    }
    if (!ProfileLoader.cache) {
	console.log('fetching profile')
	$.ajax({url: '/api/v1/own-profile', //'http://tf2apiproxy.appspot.com/api/v1/profile/'+id64,
		dataType: 'json',
		jsonpCallback:'tf2bayProfileLoader',
		cache: true,
		success: okay,
		error: error
	       })
    } else {
	console.log('using cached profile:', ProfileLoader.cache)
	okay(ProfileLoader.cache)
    }
}
ProfileLoader.cache = null




// all of these loaders need a closure.
var BackpackLoader = function(options) {
    options = options || {}
    var id64 = options.id64
    var self = this
    var okay = function(backpack) {
	BackpackLoader.cache = self.backpack = backpack
	var cb = options.success ? options.success : ident
	cb(backpack)
    }
    var error = function(err) {
	console.error(err)
	var cb = options.error ? options.error : ident
	cb(err)
    }
    if (!BackpackLoader.cache) {
	console.log('fetching backpack')
	$.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/items/'+id64,
		dataType: 'jsonp',
		jsonpCallback:'tf2bayBackpackLoader',
		cache: true,
		success: okay,
		error: error
	       })
    } else {
	console.log('using cached backpack:', BackpackLoader.cache)
	okay(BackpackLoader.cache)
    }
}
BackpackLoader.cache = null



var SchemaLoader = function(options) {
    options = options || {}
    var self = this
    var okay = function(schema) {
	console.log('schema loaded', schema)
	SchemaLoader.cache = self.schema = schema
	var cb = options.success ? options.success : ident
	cb(schema)
    }
    var error = function(err) {
	console.error(err)
	var cb = options.error ? options.error : ident
	cb(schema)
    }
    if (!SchemaLoader.cache) {
	console.log('fetching schema')
	// this combination of parameters allows the client to fetch the
	// schema from another site and lets the browser cache it.
	$.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/schema',
		dataType: 'jsonp',
		jsonpCallback:'tf2baySchemaLoader',
		cache: true,
		success: okay,
		error: error
	       })
    } else {
	console.log('using cached schema:', SchemaLoader.cache)
	okay(SchemaLoader.cache)
    }
}
SchemaLoader.cache = null


$(document).ready(function() {
    //$('body').mousedown(function() { return false }) //disable text selection
    console.log('tools.js document ready')
})



var ListingsLoader = function(options) {
    options = options || {}
    var self = this
    var id64 = options.id64
    var okay = function(listings) {
	ListingsLoader.cache = self.listings = listings
	var cb = options.success ? options.success : ident
	cb(listings)
    }
    var error = function(err) {
	console.error(err)
	var cb = options.error ? options.error : ident
	cb(schema)
    }
    if (!ListingsLoader.cache) {
	console.log('fetching listings')
	$.ajax({url: '/api/v1/player-listings/'+id64, // status=active, orderby=created, etc.
		dataType: 'json',
		cache: true,
		success: okay,
		error: error
	       })
    } else {
	console.log('using cached profile:', ListingsLoader.cache)
	okay(ListingsLoader.cache)
    }
}
ListingsLoader.cache = null

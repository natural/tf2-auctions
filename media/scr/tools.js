var SchemaTool = {
    itemDefs: null,

    init: function(source) {
	var self = this
	self.schema = source['result']
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


var BackpackItemsTool = {
    equippedTag: '<span style="display:none" class="equipped">Equipped</span>',

    itemEquipped: function(item) { return (item['inventory'] & 0xff0000) != 0 },
    itemImg: function(item) {
	var src = SchemaTool.itemDefs[item['defindex']]['image_url']
	src = src ? src : '/media/img/missing.png'
	return '<img style="display:none" src="' + src + '" />'
    },
    itemInv: function(item) { return item['inventory']  },
    itemPos: function(item) { return item['inventory'] & 0xFFFF },

    placeItems: function(slug, items) {
	var newIdx = -1, self = this
	var toolDefs = SchemaTool.tools(), actionDefs = SchemaTool.actions()
	$.each(items, function(index, item) {
	    var pos = self.itemPos(item)
	    if (pos > 0) {
		var ele = $('#' + slug + pos + ' div').append(self.itemImg(item))
		var img = $('img:last', ele) // .data('node', item)
		var def = item['defindex']
		if (self.itemEquipped(item)) {
		    img.addClass('equipped equipped-'+def).after(self.equippedTag)
		    img.removeClass('unequipped-'+def)
		} else {
		    img.addClass('unequipped-'+def)
		    img.removeClass('equipped equipped-'+def)
		}
	    } else {
		newIdx += 1
		if ($('#unplaced-' + slug + ' table.unplaced td:not(:has(img))').length == 0) {
		    var cells = new Array(5+1).join('<td><div></div></td>')
		    $('#unplaced-' + slug + ' table.unplaced').append('<tbody><tr>' + cells + '</tr></tbody>')
		}
		$('#unplaced-' + slug + 'table.unplaced td:eq('+newIdx+') div').append(self.itemImg(item))
		$('#unplaced-' + slug + 'table.unplaced td img:last').data('node', item)
	    }
	    // add the dohicky for item quanity
	    if ((item['defindex'] in toolDefs) || (item['defindex'] in actionDefs)) {
		img.before('<span class="quantity">' + item['quantity'] + '</span>')
		img.css('margin-top', '-1em')
	    }
	})
	$('#unplaced-' + slug + ', hr.unplaced').toggle(newIdx > -1)
	$(self.itemContentSelector(slug)).fadeIn(750)
	$('#backpack-listing').fadeIn()
    },

    itemContentSelector: function(slug) {
	return '#unplaced-' + slug + ' table.unplaced td img, #backpack-' + slug + ' table.backpack td img, span.equipped'
    }

}


var BackpackView = function(slug) {
    this.current = 1
    this.count = 1
    this.slug = slug
    this.count = $('#backpack-' + slug + ' table.backpack tbody').length
    var self = this
    $('#nav-' + slug + ' .nav:first a').click(function (e) {return self.nav(e, -1)})
    $('#nav-' + slug + ' .nav:last a').click(function (e) {return self.nav(e, 1)})

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
	$('#pages-' + slug).text(current + '/' + count)
	if (this.current == 1) {
	    $('#nav-' + slug + ' .nonav:first').show()
	    $('#nav-' + slug + ' .nav:first').hide()
	} else {
	    $('#nav-' + slug + ' .nonav:first').hide()
	    $('#nav-' + slug + ' .nav:first').show()
	}
	if (this.current == this.count) {
	    $('#nav-' + slug + ' .nonav:last').show()
	    $('#nav-' + slug + ' .nav:last').hide()
	} else {
	    $('#nav-' + slug + ' .nonav:last').hide()
	    $('#nav-' + slug + ' .nav:last').show()
	}
    }
}


var ItemsTool = {
    items: null,

    init: function(source) {
        this.items = source
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
    }
}




var ProfileLoader = {
    init: function(id64) {
	console.log('load profile', id64)
	$.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/profile/'+id64,
		dataType: 'jsonp',
		jsonpCallback:'tf2bayProfileLoader',
		cache: true,
		success: ProfileLoader.okay,
		error: ProfileLoader.error
	   })
    },

    okay: function(profile) {
	$('#avatar').after("<img src='" + profile['avatar'] + "' />")
	//    $("#load-profile-msg").after("<img src='" + profile['avatar'] + "' />")
	$('#load-profile-msg').text('Profile loaded. Welcome, ' + profile['personaname'] + '!')
	$('#show-new-listing-backpack-wrapper').fadeIn().slideDown();
    },

    error: function(err) {
	console.log(err)
    }
}


var NewListingTool = {
    show: function() {
	$('#show-new-listing-backpack').fadeOut()
	$('#show-new-listing-backpack-wrapper div').first().fadeOut()
	$('#new-listing-backpack').slideDown().fadeIn()
	$('#backpack-header-a h3').first().html('Your Backpack')
	$('#backpack-header-a div').first().html('Drag items from your backpack into the Listing Items area below.');
	$('#toolbar-a').width( $('#backpack-a tbody').width())

	$('#toolbar-a').width( $('#backpack-a tbody').width())
	$('#listing-fields').width( $('#backpack-a tbody').width())

	$('html body').animate({scrollTop: $('#show-new-listing-backpack-wrapper').position().top - 10})

	var bp = new BackpackView('a')
	bp.navChanged()
	BackpackItemsTool.placeItems('a', ItemsTool.items)
	NewListingTool.initDrag()
	return false
    },

    cancel: function() {
	// TODO: reset backpack
	$('#new-listing-backpack').fadeOut()
	$('#show-new-listing-backpack').fadeIn()
	$('#show-new-listing-backpack-wrapper div').first().fadeIn()
	return false
    },

    initDrag: function() {
	var updateCount = function() {
	    var len = $('#backpack-listing img').length
	    var txt = '(' + len + ' ' + (len == 1 ? 'item' : 'items') + ')'
	    $('#listing-title-extra').text(txt)
	}
	var dropItem = function(event, ui) {
	    if ($(this).children().length > 0) { return false }
	    $(this).parent().removeClass('itemHover')
	    $(this).append( $('div img', ui.draggable))
	    $("span.equipped:only-child, span.quantity:only-child").hide().detach()
	    window.setTimeout(updateCount, 150) // delay for accurate counting
	}
	var dragShow = function(event, ui) { ui.helper.addClass('selected') }
	var dropOver = function(event, ui) { $(this).parent().addClass('itemHover') }
	var dropOut = function(event, ui) { $(this).parent().removeClass('itemHover') }
	$('#backpack-a table.backpack td').draggable({
            containment: '#new-listing-backpack', helper: 'clone', cursor: 'move',
	    start: dragShow})
	$('#backpack-listing td').draggable({
            containment: '#new-listing-backpack', helper: 'clone', cursor: 'move',
	    start: dragShow})
	$('#backpack-listing td div').droppable(
	    {accept: '#backpack-a td', drop: dropItem, over: dropOver, out: dropOut})
	$('#backpack-a table.backpack td div').droppable(
	    {accept: '#backpack-listing td', drop: dropItem, over: dropOver, out: dropOut})
    }

}


var BackpackLoader = {
    init: function(id64) {
	console.log('load backpack', id64)
	$.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/items/'+id64,
		dataType: 'jsonp',
		jsonpCallback:'tf2bayBackpackLoader',
		cache: true,
		success: BackpackLoader.okay,
		error: BackpackLoader.error
	   })
    },

    okay: function(backpack) {
	var count = backpack.length
	// count - count_untradable_items - count_my_listing_items
	if (count>0) {
	    var msg = "You've got " + count + " item" + (count==1?'':'s') + " to auction."
	} else {
	    var msg = "You don't have anything to trade.  How can this be?  Go play!"
	}
	ItemsTool.init(backpack)
	$('#load-backpack-msg').text(msg)
	//console.log(backpack)
    },

    error: function(err) {
	console.log(err)
    }
}

var SchemaLoader = {
    okay: function(schema) {
	SchemaTool.init(schema)
	SchemaLoader.setImages()
    },

    error: function(err) {
	console.error(err)
    },

    setImages: function() {
	// replace any items on screen with the "schema definition
	// index replace" class
	$('.defindex-lazy').each(function(index, tag) {
	    var item = SchemaTool.itemDefs[$(tag).text()]
	    if (!item) { return }
	    $(tag).html("<img src='" + item['image_url'] + "' height=48 width=48 />").fadeIn()
	})
    },

}

tf2baySchemaLoader = SchemaLoader.okay

$(document).ready(function() {
    $('body').mousedown(function() { return false }) //disable text selection

    $('#show-new-listing-backpack').click(NewListingTool.show)
    $('#new-listing-backpack-cancel').click(NewListingTool.cancel)

    // this combination of parameters allows the client to fetch the
    // schema from another site and lets the browser cache it.
    $.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/schema',
	    dataType: 'jsonp',
	    jsonpCallback:'tf2baySchemaLoader',
	    cache: true,
	    success: SchemaLoader.okay,
	    error: SchemaLoader.error
	   })
    console.log('document ready')
})

//var unplacedItemSelector = '#unplaced table.unplaced td img'
//var placedItemSelector = '#backpack table.backpack td img'
//var equippedItemSelector = 'span.equipped'
//var itemContentSelector = [unplacedItemSelector, placedItemSelector, equippedItemSelector].join(', ')

var itemContentSelector = function(slug) {
    return '#unplaced-' + slug + ' table.unplaced td img, #backpack-' + slug + ' table.backpack td img, span.equipped'
}

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
		    //console.log('item equiped', item)
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
	$(itemContentSelector(slug)).fadeIn(750)
	$('#backpack-listing').fadeIn()
    },


}

/*
    itemClicked: function(event) {
	if (!event.ctrlKey) {
	    $('table.backpack td').removeClass('selected')
	}
	$(this).addClass('selected')
    },
*/


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
    },
}






loadProfile = function(id64) {
    console.log('load profile', id64)
    $.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/profile/'+id64,
	    dataType: 'jsonp',
	    jsonpCallback:'tf2bayProfileLoader',
	    cache: true,
	    success: onProfileLoaded,
	    //error: onProfileError
	   })
}

loadBackpack = function(id64) {
    console.log('load backpack', id64)
    $.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/items/'+id64,
	    dataType: 'jsonp',
	    jsonpCallback:'tf2bayBackpackLoader',
	    cache: true,
	    success: onBackpackLoaded,
	    //error: onBackpackError
	   })
}

onProfileLoaded = function(profile) {
    $("#load-profile-msg").after("<img src='" + profile['avatar'] + "' />")
    $("#load-profile-msg").text("Profile loaded. Welcome, " + profile['personaname'] + '!')
    $("#show-new-listing-backpack-wrapper").fadeIn().slideDown();
}


onBackpackLoaded = function(backpack) {
    var count = backpack.length
    // count - count_untradable_items - count_my_listing_items
    if (count>0) {
	var msg = "You've got " + count + " item" + (count==1?'':'s') + " to auction."
    } else {
	var msg = "You don't have anything to trade.  How can this be?  Go play!"
    }
    ItemsTool.init(backpack)
    $("#load-backpack-msg").text(msg)
    //console.log(backpack)
}



setupListingDrag = function() {
    var updateCount = function() {
	var len = $("#backpack-listing img").length
	var txt = '(' + len + ' ' + (len > 1 ? 'items' : 'item') + ')'
	$("#listing-title-extra").text( txt )
    }
    var placeListingItem = function(source, target) {
	$(target).append( $('div img', source))
	updateCount();
    }

    var unplaceListingItem = function(source, target) {
	$(target).append( $('div img', source))
	updateCount();
    }

    $('#backpack-a table.backpack td').draggable({
        revert: 'invalid',
        containment: '#new-listing-backpack',
        helper: 'clone',
        cursor: 'move',
	start: function(event, ui) { ui.helper.addClass('selected') },
    })

    $('#backpack-listing td div:empty').droppable({
        accept: '#backpack-a td',
        drop: function(event, ui) {
	    if ($(this).children().length > 0) {
		return false;
	    }
	    placeListingItem(ui.draggable, $(this))
	},
    })

    $('#backpack-listing td').draggable({
        containment: '#new-listing-backpack',
        helper: 'clone',
        cursor: 'move',
	start: function(event, ui) { ui.helper.addClass('selected') },
    })

    $('#backpack-a table.backpack td div:empty').droppable({
        accept: '#backpack-listing td',
        drop: function(event, ui) {
	    if ($(this).children().length > 0) {
		return false;
	    }
	    unplaceListingItem(ui.draggable, $(this))
	},
    })


}



onShowNewListingBackpack = function() {
    $("#show-new-listing-backpack").fadeOut()
    $("#show-new-listing-backpack-wrapper div").first().fadeOut()
    $("#new-listing-backpack").slideDown().fadeIn()
    $("#backpack-header-a h3").first().html("Your Backpack")
    $("#backpack-header-a div").first().html("Drag items from your backpack into the Listing Items area below.");
    $("#toolbar-a").width( $("#backpack-a tbody").width())

    $("#toolbar-a").width( $("#backpack-a tbody").width())
    $("#listing-fields").width( $("#backpack-a tbody").width())

    $('html body').animate({scrollTop: $("#show-new-listing-backpack-wrapper").position().top - 10})

    setupListingDrag()

    if (false) {
	$('#backpack-a table.backpack td').click(function(event) {
            if (!event.ctrlKey) {
		$('#backpack-a table.backpack td').removeClass('selected')
            }
            $(this).addClass('selected')
	})
    }


    var bp = new BackpackView('a')
    bp.navChanged()
    BackpackItemsTool.placeItems('a', ItemsTool.items)

    $("#new-listing-backpack-cancel").click(function() {
	// reset backpack
	$("#new-listing-backpack").fadeOut()
	$("#show-new-listing-backpack").fadeIn()
	$("#show-new-listing-backpack-wrapper div").first().fadeIn()
	return false
    })
}


onSchemaLoad = function(schema) {
    SchemaTool.init(schema)
    $(".defindex_replace").each(function(index, tag) {
	var id = $(tag).text()
	var item = SchemaTool.itemDefs[id]
	$(tag).html("<img src='" + item['image_url'] + "' height=48 width=48 />").fadeIn()
    })
    console.log(schema)
}


onSchemaError = function(err) {
    console.error(err)
}


$(document).ready(function() {
    $('body').mousedown(function(){return false}) //disable text selection
    $("#show-new-listing-backpack").click(onShowNewListingBackpack)
    $.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/schema',
	    dataType: 'jsonp',
	    jsonpCallback:'tf2baySchemaLoader',
	    cache: true,
	    success: onSchemaLoad,
	    error: onSchemaError
	   })
    console.log('document ready')


})

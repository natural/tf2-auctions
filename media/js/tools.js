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


var SchemaTool = function() {
    // TODO: allow for schema as argument and avoid the (cached)
    // loader
    var self = this
    new SchemaLoader({success: function(schema) {
        self.schema = schema['result']
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
    }})

    self.setImages = function() {
        // replace any items on the page that have the "schema
        // definition index replace" class with the url of the item
        // specified in the content.
        var img = function(url) { return makeImg({src:url, width:64, height:64}) }
        $('.defindex-lazy').each(function(index, tag) {
            var data = $.parseJSON($(tag).text())
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
    return self
}


var equippedTag = '<span style="display:none" class="equipped">Equipped</span>'
var itemCanTrade = function(item) { return !(item.flag_cannot_trade) && !(item.flag_active_listing) }
var itemContentSelector = function(s) {
    return '#unplaced-backpack-'+s+' table.unplaced td img, #backpack-'+s+' table.backpack td img, span.equipped'
}
var itemEquipped = function(item) { return (item['inventory'] & 0xff0000) != 0 }
var itemImg = function(item, tool) {
    var src = tool.itemDefs()[item['defindex']]['image_url']
    src = src ? src : '/media/img/missing.png'
    return '<img style="display:none" src="' + src + '" />' // replace w/ makeImg
}
var itemInv = function(item) { return item['inventory'] }
var itemPos = function(item) { return item['inventory'] & 0xFFFF  }


var BackpackItemsTool = function(slug, items, uids) {
    return function() {
        var st = new SchemaTool()
	var newIdx = -1, toolDefs = st.tools(), actionDefs = st.actions()

	$.each(items, function(index, item) {
	    item.flag_active_listing = (item.id in uids)
	    var pos = itemPos(item)
	    if (pos > 0) {
		var ele = $('#' + slug + pos + ' div').append(itemImg(item, st))
		var img = $('img:last', ele).data('node', item)
		var def = item['defindex']
		if (itemEquipped(item)) {
		    img.addClass('equipped equipped-'+def).after(equippedTag)
		    img.removeClass('unequipped-'+def)
		} else {
		    img.addClass('unequipped-'+def)
		    img.removeClass('equipped equipped-'+def)
		}
		if (itemCanTrade(item)) {
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
		$('#unplaced-backpack-' + slug + ' table.unplaced td:eq('+newIdx+') div').append(itemImg(item, st))
		$('#unplaced-backpack-' + slug + ' table.unplaced td img:last').data('node', item)
	    }
	    if ((item['defindex'] in toolDefs) || (item['defindex'] in actionDefs)) {
		img.before('<span class="quantity">' + item['quantity'] + '</span>')
		img.css('margin-top', '-1em')
	    }
	})
	$('#unplaced-backpack-' + slug + ', #backpack-' + slug + ' label.null').toggle(newIdx > -1)
	$(itemContentSelector(slug)).fadeIn(750)
	$('#backpack-listing').fadeIn()
    }
}



var BackpackNavigator = function(slug) {
    var current = 1, count = $('#backpack-' + slug + ' table.backpack tbody').length

    var nav = function(event, offset) {
	if (event.detail != 1) { return false }
	if ((current + offset) > 0 && (current + offset <= count)) {
	    $('#backpack-' + slug + ' .backpack-page-' + current).fadeOut(250, function() {
		current += offset
		$('#backpack-' + slug + ' .backpack-page-' + current).fadeIn(250)
		navChanged()
	    })
	}
	return false
    }

    var navChanged = function () {
	$('#backpack-pagecount-' + slug).text(current + '/' + count)
	if (current == 1) {
	    $('#backpack-nav-' + slug + ' .nonav:first').show()
	    $('#backpack-nav-' + slug + ' .nav:first').hide()
	} else {
	    $('#backpack-nav-' + slug + ' .nonav:first').hide()
	    $('#backpack-nav-' + slug + ' .nav:first').show()
	}
	if (current == count) {
	    $('#backpack-nav-' + slug + ' .nonav:last').show()
	    $('#backpack-nav-' + slug + ' .nav:last').hide()
	} else {
	    $('#backpack-nav-' + slug + ' .nonav:last').hide()
	    $('#backpack-nav-' + slug + ' .nav:last').show()
	}
    }
    $('#backpack-nav-' + slug + ' .nav:first a').click(function (e) {return nav(e, -1)})
    $('#backpack-nav-' + slug + ' .nav:last a').click(function (e) {return nav(e, 1)})
    return navChanged
}


var TooltipView = function(schema) {
    var self = this
    var quals = schema.qualityMap()
    var extraLineMap = {0:'alt', 1:'positive', 2:'negative'}
    var effectTypeMap = {negative: 'negative', neutral:'alt', positive: 'positive'}
    var prefixCheckMap = {3:'vint', 5:'unusual', 7:'com', 8:'dev', 9:'self'}

    var formatCalcMap = {
	value_is_percentage: function (v) { return Math.round(v*100 - 100) },
	value_is_inverted_percentage: function (v) { return Math.round(100 - (v*100)) },
	value_is_additive: ident,
	value_is_additive_percentage: function (v) { return Math.round(100*v) },
	value_is_date: function (v) { return new Date(v * 1000) },
	value_is_particle_index: ident,
	value_is_account_id: function (v) { return '7656' + (v + 1197960265728) },
	value_is_or: ident
    }

    var formatSchemaAttr = function(def, val) {
	var line = def['description_string'].replace(/\n/gi, '<br />')
	// we only look for (and sub) one '%s1'; that's the most there is (as of oct 2010)
	if (line.indexOf('%s1') > -1) {
	    var fCalc = formatCalcMap[def['description_format']]
	    line = line.replace('%s1', fCalc(val))
	}
	return line.indexOf('Attrib_') > -1 ? '' : line
    }

    self.hide = function(event) {
	$('#tooltip').hide().css({left: 0, top: 0})
    }

    self.show = function(event) {
	var tooltip = $('#tooltip'), cell = (this==self ? $(event.currentTarget) : $(this))
	if (!cell.children().length) { return }
	try {
	    var playerItem = $('div', cell).data('node')
	    if (!playerItem) { playerItem = $('img', cell).data('node'); console.log('playerItem img', playerItem) }
	    var type = playerItem['defindex'] // empty cells will raise an exception
	} catch (e) {
	    return
	}
	//console.log(playerItem)
	self.hide()
	var schemaItem = schema.itemDefs()[type]

	// set the main title and maybe adjust its style and prefix
	var h4 = $('#tooltip h4'), desc = schemaItem['item_name']
	h4.text(desc)
	h4.attr('class', 'quality-'+playerItem['quality'])
	if (playerItem['quality'] in prefixCheckMap) {
	    h4.text(quals[playerItem['quality']] + ' ' + h4.text())
	}

	// set the level; this doesn't match the game behavior exactly, but it is nice.
	var level = playerItem['level']
	var levelType = schemaItem['item_type_name'].replace('TF_Wearable_Hat', 'Hat')
	$('#tooltip .level').text(level ? 'Level ' + level + ' ' + levelType : '')

	// clear and set the extra text
	$.each(extraLineMap, function(k, v) { $('#tooltip .'+ extraLineMap[k]).text('') })
	if (playerItem['attributes']) {
	    $.each(playerItem['attributes']['attribute'], function(aidx, itemAttr) {
		var attrDef = schema.attributesById()[itemAttr['defindex']]
		var extra = formatSchemaAttr(attrDef, itemAttr['value'])
		var etype = effectTypeMap[attrDef['effect_type']]
		var current = $('#tooltip .' + etype).html()
		$('#tooltip .' + etype).html( current ? current + '<br />' + extra : extra)
	    })
	}
	if (schemaItem['attributes']) {
	    $.each(schemaItem['attributes']['attribute'], function(aidx, schemaAttr) {
		var attrDef = schema.attributesByName()[schemaAttr['name']]
		if (!attrDef) { return }
		if (attrDef['description_string']=='unused') { return }
		if (attrDef['attribute_class']=='set_employee_number') { return }
		var extra = formatSchemaAttr(attrDef, schemaAttr['value'])
		var etype = effectTypeMap[attrDef['effect_type']]
		var current = $('#tooltip .' + etype).html()
		$('#tooltip .' + etype).html( current ? current + '<br />' + extra : extra)
	    })
	}

	// calculate the position
	var pos = cell.position()
	var minleft = cell.parent().position().left
	var cellw = cell.width()
	var toolw = tooltip.width()
	var left = pos.left - (toolw/2.0) + (cellw/2.0) // - 4 // 4 == half border?
	left = left < minleft ? minleft : left
	var maxright = cell.parent().position().left + cell.parent().width()
	if (left + toolw > maxright) {
    	    left = cell.position().left + cellw - toolw + 4 // - 12
	}
	left = left < 0 ? (window.innerWidth/2)-toolw/2 : left
	var top = pos.top + cell.height() + 12
	if (top + tooltip.height() > (window.innerHeight+window.scrollY)) {
    	    top = pos.top - tooltip.height() - 8 // - 36
	}
	// position and show
	tooltip.css({left:left, top:top})
	tooltip.show()
    }
    return self
}


$(document).ready(function() {
    console.log('tools.js document ready')
})


var asPlayerItem = function(i) {
    return {defindex:i.defindex, level:i.level||'', quality:i.quality||i.item_quality}
}

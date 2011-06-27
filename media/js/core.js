//
// Begin local extensions and top-level functions.
//
if (typeof console === 'undefined') {
    var console = {log: $.noop, error: $.noop, debug: $.noop, warn: $.noop}
} else {
    if (!console.debug) {
	// thanks, ff4.
	console.debug = console.log
    }
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

if (!Array.indexOf) {
    Array.prototype.indexOf = function(obj){
	for (var i=0; i<this.length; i++) {
	    if (this[i]==obj) { return i; }
	}
	return -1;
    }
}

if (typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g, '');
    }
}

if (typeof String.prototype.wordwrap !== 'function') {
    String.prototype.wordwrap = function(width, brk, cut) {
	brk = brk || '<br />\n'
	width = width || 75
	cut = cut || false
	if (!this) { return this }
	var rx = '.{1,' +width+ '}(\\s|$)' + (cut ? '|.{' +width+ '}|.+$' : '|\\S+?(\\s|$)')
	return this.match( RegExp(rx, 'g') ).join( brk )
    }
}


Number.prototype.formatMoney = function(c, d, t){
    var n = this, c = isNaN(c = Math.abs(c)) ? 2 : c, d = d == undefined ? '.' : d, t = t == undefined ? ',' : t, s = n < 0 ? '-' : '', i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + '', j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : '');
}


//
// Create the 'oo' namespace.
//
var oo = (function() {
    var ns = function(suffix, next) {
	var sel = $.map(suffix.split(', '), function(v) { return ns.conf.prefix + v }).join(', ')
	return $(sel, next)
    }
    ns.conf = {prefix: ''}
    ns.config = function(c) { $.extend(ns.conf, c) }

    ns.keys = function(o) {
	var ks = []
	for (var k in o) { ks.push(k) }
	return ks
    }
    ns.values = function(o) {
	var vs = []
	for (var k in o) { vs.push(o[k]) }
	return vs
    }
    // bound to the given prefix, not the conf
    ns.prefix$ = function(prefix) {
	return function(suffix, next) {
	    var sel = $.map(suffix.split(', '), function(v) { return prefix + v }).join(', ')
	    return $(sel, next)
	}
    }
    // bound to the given context
    ns.context$ = function(context) {
	return function(selector) {
	    return $(selector, context)
	}
    }
    ns.ident = ident = function(a) { return a }
    ns.noop = function() {}
    ns.info = function() { console.debug.apply(console, arguments) }
    ns.warn = function() { console.warn.apply(console, arguments) }
    ns.error = function() { console.error.apply(console, arguments) }
    return ns
})();


//
// Add the tf2 namespace.
//
(function(ns) {
    // haven't found these definitions anywhere in the source files:
    ns.itemEffects = {
	4:  'Community Sparkle',
	5:  'Holy Glow',
	6:  'Green Confetti',
	7:  'Purple Confetti',
	8:  'Haunted Ghosts',
	9:  'Green Energy',
	10: 'Purple Energy',
	11: 'Circling TF Logo',
	12: 'Massed Flies',
	13: 'Burning Flames',
	14: 'Scorching Flames',
	15: 'Searing Plasma',
	16: 'Vivid Plasma',
	17: 'Sunbeams',
	18: 'Circling Peace Sign',
	19: 'Circling Heart',
	20: 'Map Stamps'
    }

    // mapping of extra lines to tooltip class names
    ns.extraLineMap = {
	0: 'alt',
	1: 'positive',
	2: 'negative'
    }

    // mapping of schema effect types to tooltip class names
    ns.effectTypeMap = {
	negative: 'negative',
	neutral:'alt',
	positive: 'positive'
    }

    // mapping specific item qualities; used for checking only.
    ns.prefixCheckMap = {
	3: 'vint',
	5: 'unusual',
	7: 'com',
	8: 'dev',
	9: 'self',
	11: 'strange'
    }
})(oo.tf2 = {});


//
// Add the backpack namespace.
//
(function(ns) {
    // functions to convert schema values into tooltip display values
    var calcs = {
	value_is_additive: function(a) { return a },
	value_is_particle_index: function(a) { return a },
	value_is_or: function(a) { return a },
	value_is_percentage: function (v) { return Math.round(v*100 - 100) },
	value_is_inverted_percentage: function (v) { return Math.round(100 - (v*100)) },
	value_is_additive_percentage: function (v) { return Math.round(100*v) },
	value_is_date: function (v) { return new Date(v * 1000)	},
	value_is_account_id: function (v) { return '7656' + (v + 1197960265728)	}
    }

    //
    // tool for formatting and showing a nice tooltip.
    //
    var ItemHoverTool = function(schema) {
	var self = this, quals = schema.qualityMap()

	var formatSchemaAttr = function(def, val) {
	    var line = ''
	    try {
		line = def['description_string'].replace(/\n/gi, '<br />')
	    } catch (e) { }
	    // we only sub one '%s1'; that's the most there is (as of oct 2010)
	    if (line.indexOf('%s1') > -1) {
		line = line.replace('%s1', calcs[def['description_format']](val))
	    }
	    return line.indexOf('Attrib_') > -1 ? '' : line
	}

	self.hide = function(event) { $('#tooltip').hide() }

	self.show = function(event) {
	    var tooltip = $('#tooltip'), cell = (this==self ? $(event.currentTarget) : $(this))
	    if (!cell.children().length) { tooltip.hide(); return }
	    try {
		var playerItem = $('div', cell).data('node')
		if (!playerItem) { playerItem = $('img', cell).data('node') }
		var type = playerItem['defindex'] // empty cells will raise an exception
	    } catch (e) {
		tooltip.hide()
		return
	    }
	    self.hide()
	    var schemaItem = schema.itemDefs()[type]
	    // set the main title and maybe adjust its style and prefix
	    var h4 = $('#tooltip h4'),
                desc = playerItem['custom_name'] ? '"{0}"'.fs(playerItem['custom_name']) : schemaItem['item_name']
	    h4.text(desc)
	    h4.attr('class', 'quality-'+playerItem['quality'])
	    if (playerItem['quality'] in oo.tf2.prefixCheckMap) {
		h4.text(quals[playerItem['quality']] + ' ' + h4.text())
	    }
	    $('#tooltip .crafter').text('')

	    $('#tooltip .ctrl').html(
		event.ctrlKey ? '<pre>{0}</pre>'.fs(
		    'item:  {0}\n\nschema:  {1}'.fs(
			JSON.stringify(playerItem, null, 2),
			JSON.stringify(schemaItem, null, 2)
		    )
		) : ''
	    )

	    // set the level; this doesn't match the game behavior exactly, but it is nice.
	    var level = playerItem['level'],
	        levelType = schemaItem['item_type_name']
		.replace('TF_Wearable_Hat', 'Wearable Item')
		.replace('TF_LockedCrate', 'Crate')
	    $('#tooltip .level').text( (level+1) ? 'Level ' + level + ' ' + levelType : '')


	    // clear and set the extra text
	    $.each(oo.tf2.extraLineMap, function(k, v) { $('#tooltip .'+ oo.tf2.extraLineMap[k]).text('') })
		if (playerItem['attributes']) {
		    $.each(playerItem['attributes']['attribute'], function(aidx, itemAttr) {
			var attrDef = schema.attributesById()[itemAttr['defindex']],
			extra = formatSchemaAttr(attrDef, itemAttr['value']),
			etype = oo.tf2.effectTypeMap[attrDef['effect_type']]

			// 134:  set effect name
			if (itemAttr['defindex'] == 134) {
			    extra = formatSchemaAttr(attrDef, oo.tf2.itemEffects[itemAttr['float_value']])

                        // 228: craft name
                        } else if (itemAttr['defindex'] == 228) {
			    var acc = calcs.value_is_account_id( itemAttr['value'] )
			    $('#tooltip .crafter').text( 'Crafted by ' + acc )
			    oo.data.status({suffix: acc})
				.success(function(s) { $('#tooltip .crafter').text('Crafted by ' + s.name) })

			// 229: craft number
			} else if (itemAttr['defindex'] == 229) {
			    h4.text( h4.text() + ' #' + itemAttr.value)

			// 142:  don't use 'i made this'
			} else if (itemAttr['defindex'] == 142) {
			    extra = ''
			}

			var current = $('#tooltip .' + etype).html()
			$('#tooltip .' + etype).html( current ? current + '<br />' + extra : extra)
		    })
			}

	    if (schemaItem['attributes']) {
		$.each(schemaItem['attributes']['attribute'], function(aidx, schemaAttr) {
		    try {
			var attrDef = schema.attributesByName()[schemaAttr['name']]
			if (!attrDef) { return }
			if (attrDef['description_string']=='I made this!') { return }
			if (attrDef['description_string']=='%s1% damage done') { return }
			if (attrDef['description_string']=='unused') { return }
			if (attrDef['attribute_class']=='set_employee_number') { return }
			var etype = oo.tf2.effectTypeMap[attrDef['effect_type']],
			current = $('#tooltip .' + etype).html()
			// particle effects defined in the schema, not the item:
			if (attrDef['attribute_class'] == 'set_attached_particle') {
			    var extra = formatSchemaAttr(attrDef, oo.tf2.itemEffects[schemaAttr['value']])
			} else {
			    var extra = formatSchemaAttr(attrDef, schemaAttr['value'])
			}
			$('#tooltip .' + etype).html( current ? current + '<br />' + extra : extra)
		    } catch (e) { }
		})
		    }
	    if (schemaItem['item_description']) {
		var current = $('#tooltip .alt').html(),
		    ddesc = schemaItem['item_description']
		if (ddesc.indexOf('\n') > -1) {
		    ddesc = ddesc.replace(/\n/g, '<br />')
		} else {
		    ddesc = ddesc.wordwrap(64)
		}
		$('#tooltip .alt').html('{0}'.fs( (current ? current + '<br />' : '') + ddesc))
	    }
	    if (playerItem['custom_desc']) {
		var current = $('#tooltip .alt').html()
		$('#tooltip .alt').html('"{0}"'.fs( (current ? current + '<br />' : '') + playerItem['custom_desc']))
	    }
	    // position and show
	    tooltip.css({
		left: Math.max(0, cell.offset().left - (tooltip.width()/2) + (cell.width()/2)),
		top: cell.offset().top + cell.height() + 14
	    })
	    tooltip.show()
	}
	return self
    }

    // a set of functions for creating arrays of cells
    // for dynamic sized backpack pages.
    ns.pageGroup = {
	slim: function(items, cols) {
	    cols = cols || 5
	    var rows = this.rows(items, cols), curr = [], next = [], pages = [], i = 0
	    while (i <= rows.length) {
		if (i && !(i % 5)) {
		    pages.push(curr)
		    pages.push(next)
		    curr = []
		    next = []
		}
		curr.push(rows[i])
		next.push(rows[i+1])
		i += 2
	    }
	    return pages
	},

	full: function(items) {
	    var rows = this.rows(items, 10), page = [], pages = [], i = 0
	    while (i <= rows.length) {
		if (i && !(i % 5)) {
		    pages.push(page)
		    page = []
		}
		page.push(rows[i])
		i += 1
	    }
	    return pages
	},

	rows: function(items, cols) {
	    var i = 0, rows = [], row = []
	    while (i < items) {
		if (!(i % cols)) {
		    row = []
		    rows.push(row)
		}
		row.push(i+1)
		i += 1
	    }
	    return rows
	}
    }

    var itemFilterLabels = [
	['tradable', 'All Items'],
	['', ''],
	['wearables', 'Hats / Wearables'],
	['weapons', 'Weapons'],
	['metal', 'Metal'],
	['tokens', 'Tokens'],
	['crates', 'Crates'],
	['actions', 'Actions'],
	['tools', 'Tools'],
	['', ''],
	['scoot', 'Scout'],
	['soly', 'Soldier'],
	['pyro', 'Pyro'],
	['demo', 'Demoman'],
	['heavy', 'Heavy'],
	['engi', 'Engineer'],
	['medic', 'Medic'],
	['sniper', 'Sniper'],
	['spy', 'Spy']
    ]

    //
    // tool for managing the navigation thru a view of backpack items.
    //
    var BackpackNavTool = function(options) {
	var self = this,
	    slug = options.slug,
	    itemTool = options.itemTool,
	    outerContext = $('#bp-{0}'.fs(slug)),
	    pagesContext = $('div.bp-pages', outerContext),
	    pageCount = $('table.bp-page-{0}'.fs(slug), pagesContext).length,
	    pageCurrent = 1,
	    nonPrev = $('#bp-nav-{0} .non:first'.fs(slug)),
	    navPrev = $('#bp-nav-{0} .nav:first'.fs(slug)),
	    nonNext = $('#bp-nav-{0} .non:last'.fs(slug)),
	    navNext = $('#bp-nav-{0} .nav:last'.fs(slug)),
	    initWidth = 0

	self.init = function() {
	    initWidth = $('body').width() // sucks, but it's better than 0
	    $('table.bp-page-{0}:gt(0)'.fs(slug), pagesContext).css('margin-left', initWidth)
	    $('a', navPrev).unbind().click(function (event) { self.navigate(-1); return false })
	    $('a', navNext).unbind().click(function (event) { self.navigate( 1); return false })
	    self.updateButtons()

	    // maybe enable a select element for filtering by class and
	    // item type.
	    if (options.filters) {
		var select = $('#bp-nav-filter-{0}'.fs(slug)).change(self.applyFilter)
		$.each(itemFilterLabels, function(idx, val) {
		    var opt = '<option value="{0}">{1}</option>'.fs(
			val[0], val[1]
		    )
		    $(opt).css('background-image', 'url(/media/img/{0}.png)'.fs(val[0]))
		    select.append(opt)
		})
		    select.parent().show()
	    }
	    // maybe enable the button for showing all pages
	    if (options.showAll) {
		$('#bp-{0} .bp-nav span.all'.fs(slug)).show().click(function() {
		    $('#bp-{0} div.bp-placed table.bp-placed:gt(0)'.fs(slug)).addClass('mt2')
		    $('#bp-{0} div.bp-placed table.bp-placed'.fs(slug))
			.css('margin-left', 0)
			.fadeIn()
		    $('#bp-nav-{0}'.fs(slug)).fadeOut()
		})
	    }
	    $('#bp-nav-{0}'.fs(slug)).show()
	    $('table.bp-page-{0}'.fs(slug), pagesContext).css('display', 'none')
	    $('table.bp-page-{0}:eq(0)'.fs(slug), pagesContext).css('margin-left', 0).show()
	}

	self.applyFilter = function(event) {
	    try {
		var value = $('option:selected', event.target).attr('value')
	    } catch (e) { return }
	    if (!value) { return }
	    oo.data.schema().success(function(s) {
		var schema = oo.util.schema(s),
		itemCall = schema[value]
		if (itemCall) {
		    self.clear()
		    self.putFilterItems(schema.tradable(itemCall()))
		    self.reinit()
		}
	    })
	}


	self.clear = function() {
	    $('td > div > img', outerContext).remove()
	}

	self.putFilterItems = function(items) {
	    if (items) {
		// this map is duplicated from the schematool.tradeableBackpack; fixme.
		items = $.map(oo.values(items), function(item, index) {
		    return {defindex:item.defindex, pos:index+1}
		})
		options.itemTool.putItems(items)
	    }
	}

	self.reinit = function() {
	    while (pageCurrent > 1) {
		self.navigate(-1)
	    }
	    console.log('BackpackNavTool.reinit()')
	}

	self.navigate = function(offset) {
	    if ((pageCurrent + offset) > 0 && (pageCurrent + offset <= pageCount)) {
		var prev = pageCurrent
		var newMargin = $('div.bp-pages', outerContext).width() * (offset>0 ? -1 : 1)
		pageCurrent += offset
		$('table.bp-{0}'.fs(prev), pagesContext)
		    .animate({marginLeft:newMargin}, 200,
			     function() {
				 $('td.selected', pagesContext).removeClass('selected')
				 $('table.bp-{0}'.fs(prev), pagesContext).hide()
				 $('table.bp-{0}'.fs(pageCurrent), pagesContext)
				     .show()
				     .animate({marginLeft:0}, 200)
			     })
		self.updateButtons()
	    }
	}

	self.updateButtons = function () {
	    $('#bp-count-' + slug).text(pageCurrent + '/' + pageCount)
	    if (pageCurrent == 1) {
		nonPrev.show()
		navPrev.hide()
	    } else {
		nonPrev.hide()
		navPrev.show()
	    }
	    if (pageCurrent == pageCount) {
		nonNext.show()
		navNext.hide()
	    } else {
		nonNext.hide()
		navNext.show()
	    }
	}
    }


    //
    // tool for showing items in a backpack.
    //
    var BackpackItemsTool = function(options) {
	var self = this,
	listingUids = options.listingUids || [],
	bidUids = options.bidUids || [],
	slug = options.slug,
	cols = options.cols || 10

	self.init = function(settings) {
	    if (options.rowGroups) {
		// support for the alternate (wipe and recreate) backpack
		// page construction.
		$('#bp-{0} tbody'.fs(slug)).empty()
		$.each(options.rowGroups, function(index, rows) {
		    var target = $('#bp-placed-{0} table:eq({1}) tbody'.fs(slug, index))
		    if (!target.length) {
			$('#bp-placed-{0} div.bp-pages div.bp-nav'.fs(slug)).before(
			    '<table class="bp-placed null bp-{0} bp-page-{1}"><tbody></tbody></table>'.fs(1+index, slug)
			)
			var target = $('#bp-placed-{0} table:eq({1}) tbody'.fs(slug, index))
		    }
		    if (!index) {
			$('#bp-placed-{0} div.bp-pages table.bp-placed:eq(0)'.fs(slug)).removeClass('null')
		    }
		    $.each(rows, function(index, row) {
			target.append('<tr>{0}</tr>'.fs(
			    $.map(row, function(id) { return '<td id="{0}{1}"><div></div></td>'.fs(slug, id) }).join('')
			))
		    })
			})
		    // trim any extras
		    var tables = $('#bp-placed-{0} table.bp-placed'.fs(slug))
		if (tables.length > options.rowGroups.length) {
		    $('#bp-placed-{0} table.bp-placed:gt({1})'.fs(slug, options.rowGroups.length-1)).remove()
		}
	    }

	    self.putItems(options.items, settings)
	    self.initOptional()
	    $('div.bp td').mousedown(function() { return false })
	}

	self.putItems = function(items, settings) {
	    oo.data.schema()
		.success(function(s) {
		    var newIdx = -1,
			schema = oo.util.schema(s),
			toolDefs = schema.tools(),
			actionDefs = schema.actions(),
			uprefs = oo.util.settings(settings)
		    $.each(items, function(index, item) {
			item.flag_active_listing = (item.id in listingUids)
			item.flag_active_bid = (item.id in bidUids)
			var iutil = oo.util.item(item, schema), defindex = item['defindex']
			if (iutil.pos() > 0) {
			    // alternate ordering selects the first available div
			    // for the image, which is more natural looking for
			    // some backpacks (e.g., min bid)
			    if (options.altOrdering) {
				var ele = $('#bp-placed-{0} td div:empty'.fs(slug)).first()
			    } else {
				var ele = $('#{0}{1} div'.fs(slug, iutil.pos()))
			    }
			    ele.append(iutil.img())
			    var img = $('img', ele).data('node', item)
			    self.setCraftNumber(iutil, img, uprefs)
			    self.setEquipped(iutil, img, defindex, uprefs)
			    self.setTradable(iutil, ele, item, uprefs)
			    self.setPaintJewel(iutil, img, uprefs)
			    self.setUseCount(img, item, uprefs, toolDefs, actionDefs)
			    self.setEffect(iutil, ele, uprefs)
			} else {
			    newIdx += 1
			    var target = $('#bp-unplaced-{0} table.bp-unplaced'.fs(slug))
			    if (!$('td:not(:has(img))', target).length) {
				var cells = new Array(cols+1).join('<td><div></div></td>')
				target.append('<tbody><tr>' + cells + '</tr></tbody>')
			    }
			    $('td:eq({1}) div'.fs(slug, newIdx), target).append(iutil.img())
			    var img = $('td img:last'.fs(slug), target).data('node', item)
			    self.setTradableUnplaced(iutil, img, item, uprefs)
			    self.setUseCount(img, item, uprefs, toolDefs, actionDefs)
			}
		    })
			$('#bp-placed-{0} label, #bp-unplaced-{1}'.fs(slug, slug)).toggle(newIdx > -1)
		    $('#bp-{0} img'.fs(slug)).fadeIn()
		})
	}

	self.initOptional = function() {
	    if (options.select) {
		$('#bp-{0} td'.fs(slug)).click(function (e) {
		    var td = $(this)
		    if (!options.selectMulti) {
			$('td', td.parents('table')).removeClass('selected')
		    }
		    td.removeClass('outline').toggleClass('selected')
		})
	    }

	    if (options.toolTips) {
		oo.data.schema().success(function(s) {
		var schema = oo.util.schema(s),
		    tipTool = oo.backpack.itemHoverTool(schema)
		$('div.bp td').hover(tipTool.show, tipTool.hide)
		})
	    }


	    if (options.navigator) {
		self.navigator = oo.backpack.navTool({
		    slug: slug,
		    filters: options.filters,
		    itemTool: self,
		    showAll: options.showAll
		})
		self.navigator.init()
	    }

	    if (options.outlineHover) {
		$('div.bp td').hover(
		    function(e) {
			try {
			    var data = $('img', this).data('node')
			    if (data.flag_cannot_trade || data.flag_active_bid || data.flag_active_listing) {
				return
			    }
			    if (! $(this).hasClass('selected') ) {
				$(this).addClass('outline')
			    }
			} catch (ex) { }
		    },
		    function(e) {
			$(this).removeClass('outline')
		    }
		)
	    }
	    var help = options.help || '', title = options.title || ''
	    if (help) {
		$('#bp-{0} span.help:first'.fs(slug)).text(help)
	    }
	    if (title) {
		$('#bp-{0} > div > div > h3:first'.fs(slug)).text(title)
	    }
	}

        self.setCraftNumber = function(itemutil, image, settings) {
	    var c = itemutil.crafted()
	    if ((c > 1 && c < 101) || (c > 100 && settings.showHighCraftNumber)) {
		image.after(itemutil.craftNumTag(c))
	    }
	}

	self.setEquipped = function(itemutil, image, defindex, settings) {
	    if (itemutil.isEquipped() && settings.showEquipped ) {
		image
		    .addClass('equipped equipped-{0}'.fs(defindex))
		    .after(itemutil.equippedTag())
		    .removeClass('unequipped-{0}'.fs(defindex))
	    } else {
		image
		    .addClass('unequipped-{0}'.fs(defindex))
		    .removeClass('equipped equipped-{0}'.fs(defindex))
	    }
	}

	self.setEffect = function(itemutil, element, settings) {
	    if (settings.showItemEffect && itemutil.effect()) {
		element.parent()
		    .addClass('effect-{0} effect-base'.fs(itemutil.effect()))
	    }
	}

	self.setTradable = function(itemutil, element, item, settings) {
	    if (settings.showAngrySalad) {
		element.parent()
		    .addClass('border-quality-{0}'.fs(item.quality))
		if (!settings.showAngryLite) {
		    element.parent()
			.addClass('background-quality-{0}'.fs(item.quality))
		}
	    }
	    if (settings.showItemTags && itemutil.isNamed()) {
		element
		    .append('<span class="tool-base tool-{0}">&nbsp;</span>'.fs(
				item.custom_name && item.custom_desc ? '5020-5044' : (item.custom_name ? '5020' : '5044')
			    ))
	    }
	    if (itemutil.canTrade()) {
		element.parent('td')
		    .removeClass('cannot-trade active-listing active-bid')
	    } else {
		var td = element.parent('td')
		td.addClass('cannot-trade')
		if (item.flag_active_listing) {
		    td.addClass('active-listing')
		} else if (item.flag_active_bid) {
		    td.addClass('active-bid')
		}
	    }
	}

	self.setPaintJewel = function(itemutil, image, settings) {
	    var paintColor = itemutil.painted()
	    if (paintColor && settings.showPainted) {
		image.before(itemutil.jewelTag(paintColor))
	    }
	}

	self.setTradableUnplaced = function(itemutil, element, item, settings) {
	    if (settings.showAngrySalad) {
		element.parent()
		    .addClass('border-quality-{0}'.fs(item.quality))
		if (!settings.showAngryLite) {
		    element.parent()
			.addClass('background-quality-{0}'.fs(item.quality))
		}
	    }
	    // unplaced with a custom name or description?  i don't think so...
	    if (itemutil.canTrade()) {
		element.parent().removeClass('cannot-trade active-listing active-bid')
	    } else {
		var td = element.parents('td')
		td.addClass('cannot-trade')
		if (item.flag_active_listing) {
		    td.addClass('active-listing')
		} else if (item.flag_active_bid) {
		    td.addClass('active-bid')
		}
	    }
	}

	self.setUseCount = function(image, item, settings, tools, actions) {
	    var def = item.defindex
	    if (((def in tools) || (def in actions)) &&
		settings.showUseCount &&
		(typeof(item.quantity) != 'undefined')) {
		image.before('<span class="badge quantity">{0}</span>'.fs(item.quantity))
	    }
	}
    }

    var moveClasses = function(source, target, expr) {
	$.each(source.attr('class').split(' '), function(idx, name) {
	    if (name.match(expr)) { target.addClass(name); source.removeClass(name) }
	})
    },
    moveSalad = function(source, target) {
	moveClasses(source, target, /(border|background)-quality/)
	moveClasses(source, target, /effect-.*/)
    }


    //
    // tool for showing a "chooser", which is a small area for selecting
    // items.
    //
    // NB: backpack choosers must be initialized *after* any corresponding
    // backpack item tool.
    //
    var BackpackChooserTool = function(options) {
	var self = this,
	    title = options.title,
	    backpackHelp = options.backpackHelp,
	    backpackSlug = options.backpackSlug,
	    chooserSlug = options.chooserSlug

	self.init = function(settings) {
	    self.initDrag()
	    self.initOptional()
	    self.updateCount()
	}

	self.initDrag = function() {

	    // called after an item has been dropped on a backpack or
	    // chooser.
	    var dropMoveItem = function(event, ui) {
		if ($(this).children().length > 0) { return false }
		$(this).parent().removeClass('selected')
		if (options.copy) {
		    var item = $($('div img', ui.draggable)).clone()
		    item.data('node', $('div img', ui.draggable).data('node'))
		} else {
		    var item = $('div img', ui.draggable)
		}
		$(this).append(item)
		item.data('original-cell', ui.draggable)
		$('img', this).css('margin-top', '0')
		var others = $('span.equipped, span.quantity, span.jewel, span.tool-base', ui.draggable)
		$(this).append(others)
		$('#bp-chooser-{0} td, #bp-{1} td'.fs(chooserSlug, backpackSlug))
		    .removeClass('selected outline')
		self.updateCount()
		moveSalad(ui.draggable, $(this).parent())
		if (options.afterDropMove) { options.afterDropMove(item) }
		if (options.copy && options.afterDropCopy) { options.afterDropCopy(item) }
	    }

	    // called prior to dragging; returns false for untradable
	    // items which makes them not draggable.
	    var dragTradableFilter = function(event, ui) {
		var img = $('img', event.target) // source img, not the drag img
		try {
		    var node = img.data('node')
		    return !(node.flag_cannot_trade) &&
			!(node.flag_active_listing) &&
			!(node.flag_active_bid)
		} catch (e) { return false }
	    }

	    // adds the "selected" higlight class to items during drag.
	    var dragStartFocus = function(event, ui) {
		ui.helper.addClass('selected').removeClass('outline')
	    }

	    // adds the "outline" hilight to drop targets.
	    var dropOverFocus = function(event, ui) {
		$(this).parent().addClass('outline')
	    }

	    // removes the "outline" highlight from drop targets when they
	    // are no longer the active target.
	    var dropOverBlur = function(event, ui) {
		$(this).parent().removeClass('outline')
	    }

	    // setup dragging from the backpack
	    $('#bp-{0} td'.fs(backpackSlug))
		.draggable({
		    containment: $('#bp-{0}'.fs(backpackSlug)).parent(),
		    cursor: 'move',
		    drag: dragTradableFilter,
		    helper: 'clone',
		    start: dragStartFocus})

	    // setup dropping onto the chooser
	    $('#bp-{0} td div'.fs(backpackSlug))
		.droppable({
		    accept: '#bp-chooser-{0} td'.fs(chooserSlug),
		    drop: dropMoveItem,
		    out: dropOverBlur,
		    over: dropOverFocus})

	    // setup dragging from the chooser
	    $('#bp-chooser-{0} td'.fs(chooserSlug))
		.draggable({
		    containment: $('#bp-{0}'.fs(backpackSlug)).parent(),
		    cursor: 'move',
		    drag: dragTradableFilter,
		    helper: 'clone',
		    start: dragStartFocus})

	    // setup dropping onto the backpack
	    $('#bp-chooser-{0} td div'.fs(chooserSlug))
		.droppable({
		    accept: '#bp-{0} td'.fs(backpackSlug),
		    drop: dropMoveItem,
		    out: dropOverBlur,
		    over: dropOverFocus})
	}

	self.initOptional = function() {
	    // maybe add some help
	    if (options.help) {
		$('#bp-chooser-{0} span.help:first'.fs(chooserSlug)).text(options.help)
	    }

	    // maybe toggle some classes on hover
	    if (options.selectDeleteHover) {
		$('#bp-chooser-{0} td'.fs(chooserSlug)).hover(
		    function(e) {
			if ($('img', this).length) {
			    $(this).addClass('selected-delete')
			}
		    },
		    function(e) { $(this).removeClass('selected-delete') }
		)
	    }

	    if (options.title) {
		$('#bp-chooser-{0} > div > h3:first'.fs(chooserSlug)).prepend(options.title)
	    }

	    if (!options.counter) {
		this.updateCount = function() {}
	    }
	}

	self.updateCount = function() {
	    window.setTimeout(function() {
		var len = $('#bp-chooser-{0} img'.fs(chooserSlug)).length,
		    txt = '(' + len + ' ' + (len == 1 ? 'item' : 'items') + ')'
		$('#' + chooserSlug + '-title-extra').text(txt)
	    }, 150)
	}

	self.moveToChooser = function(event) {
	    var source = $(event.target),
		target = $('#bp-chooser-{0} td div:empty'.fs(chooserSlug)).first(),
		cell = source.parent().parent()
	    if ((cell.hasClass('cannot-trade')) || (!target.length)) { return }
	    cell.removeClass('selected')
	    source.data('original-cell', cell)
	    var others = $('span.equipped, span.quantity, span.jewel, span.tool-base', cell)
	    target.prepend(source)
	    target.append(others)
	    moveSalad(cell, target.parent())
	    if (options.afterDropMove) { options.afterDropMove(null) }
	    self.updateCount()
	}

	self.moveToOriginal = function(event) {
	    var source = $(event.target),
		target = $('div', source.data('original-cell'))
	    if (target.length==1) {
    		var others = $('span.equipped, span.quantity, span.jewel, span.tool-base', source.parent())
		moveSalad(source.parent().parent(), target.parent())
		target.append(source)
		target.append(others)
    		if (options.afterDropMove) { options.afterDropMove(null) }
		self.updateCount()
	    }
	}
    }

    ns.chooserTool = function(v) { return new BackpackChooserTool(v) }
    ns.itemHoverTool = function(v) { return new ItemHoverTool(v) }
    ns.itemTool = function(v) { return new BackpackItemsTool(v) }
    ns.navTool = function(v) { return new BackpackNavTool(v) }
})(oo.backpack = {});


//
// Begin the 'util' namespace.
//
(function(ns) {
    ns.dformat = function(v) {
	return new Date(v).format('hh:MM TT ddd, d mmm yyyy')
    }

    ns.item = function(item, schema) {
	return {
	    canTrade: function() {
		return !(item.flag_cannot_trade) && !(item.flag_active_listing) && !(item.flag_active_bid)
	    },
	    craftNumTag: function(i) {
		return '<span class="badge quantity crafted">#{0}</span>'.fs(i)
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
		if (!item.defindex) {
		    return oo.util.img({src:'/media/img/missing.png', width:64, height:64})
		}
		return oo.util.img({src: schema.itemDefs()[item['defindex']]['image_url'],
				   style:'display:none', width:64, height:64})
	    },
	    isEquipped: function() {
		return (item['inventory'] & 0xff0000) != 0
	    },
	    isNamed: function() {
		return (item.custom_name != undefined || item.custom_desc != undefined)
	    },
	    pos:  function() {
		return (item.pos) ? item.pos : item['inventory'] & 0xFFFF
	    },
	    crafted: function() {
		var attrs = (item.attributes || {}).attribute || []
		var craft = 0
		$.each( $(attrs), function (idx, attr) {
		    if (attr.defindex==229) { craft = attr.value }
		})
		return craft
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
		if (item.defindex == 143) { return 99 }  // notes for earbuds
		if (item.defindex == 1899) { return 20 } // stamps for travelers hat
		try {
		    return $.grep(item.attributes.attribute, function(x) { return x.defindex==134 })[0].float_value
		} catch (x) {
		    return null
		}
	    }
	}
    }

    ns.listing = Object.create({
	put: function(displays, target) {
	    $.each(displays, function(idx, disp) { target: target.append(disp.removeClass('null')) })
	},

	many: function(options) {
	    var self = this
	    return $.map(options.listings, function(listing, idx) {
		return self.one(listing, options.prototype.clone(), options)
	    })
	},

	one: function(listing, context, options) {
	    context.removeClass('prototype').addClass('listing-seed')
	    if (listing.description) {
		$('.listing-description', context).text(listing.description)
	    } else {
		$('tr.ds', context).empty()
	    }
	    $('.bid-count-seed', context).text(listing.bid_count || '0') // bid_count because bids aren't fetched.
	    var next = 0
	    $.each(listing.items, function(index, item) {
		$( $('div.bi .item-view div', context)[next]).append( $.toJSON(item) )
		next += 1
	    })
	    if (listing.bid_currency_use) {
		var v = '{1}{0}'.fs(
		    listing.bid_currency_start.formatMoney(),
		    oo.util.listingCurrencySym(listing)
		)
		$('tr.mb .value', context).html(v).parent().removeClass('null')
		$('tr.cb div', context).removeClass('null')
		v = '{1}{0}'.fs(
		    listing.bid_currency_top.formatMoney(),
		    oo.util.listingCurrencySym(listing)
		)
		$('tr.cb .value', context).html(v)

	    } else if (listing.min_bid.length) {
		    var next = 0
		    $('tr.mb label', context).first().text('Minimum Bid:')
		    $.each(listing.min_bid, function(index, defindex) {
			$($('div.mb .item-view div', context)[next])
			    .append($.toJSON({defindex:defindex, quality:6}))
			next += 1
		    })
		    $('tr.mb div.mb', context).removeClass('null')
	    } else {
		$('tr.mb', context).empty()
	    }
	    $('.listing-view-link a', context).attr('href', '/listing/'+listing.id)
	    $('.bid-count', context).text( $('.bid-count', context).text() + listing.bid_count )
	    $('tr.pr div.pr', context).animate({opacity:0}, 0)
	    $('span.expires', context)
		.append('<span class="mono float-right">Expires: {0}</span>'.fs(oo.util.dformat(listing.expires)))
	    oo.util.profile.putAvatar(listing.owner, $('span.av', context))
		.success(function(s) { $('tr.pr div.pr', context).animate({opacity:100}, 9999) })
	    return context
//	$('.listing-status-seed', clone).text(listing.status)
//	$('.listing-created-seed', clone).text(oo.util.dformat(listing.created))
//	$('.listing-expires-seed', clone).text(oo.util.dformat(listing.expires))
	},

	putFeatured: function(results) {
	    if (results.featured && results.featured.length) {
		var featured = results.featured
	    } else {
		return
	    }
	    var $$ = oo.prefix$('#featured-'),
		displays = oo.util.listing.many({
		    listings: featured,
		    prototype: $$('listings div.prototype'),
		})
	    $.each(displays, function(idx, disp) { $$('listings').append(disp) })
	    if (featured.length) {
		$$('listings div.listing-seed.null:first').removeClass('null')
		if (featured.length > 1) {
		    $$('listings span.nav.next').removeClass('null')
		    $$('listings span.nonav.prev').removeClass('null')
		    $$('listings span.seenav').removeClass('null')
		}
		// stupid visual fix:
		$$('listings div.ov').removeClass('ov')
		$$('listings').addClass('ov')
		$$('listings-pod').slideDown()
	    }
	}
    })

    ns.profile = Object.create({
	loginUrl: function() {
	    return '/login?next=' + encodeURIComponent(window.location.href)
	},

	defaultUrl: function(p) {
	    return p.custom_name ? '/id/{0}'.fs(p.custom_name) : '/profile/{0}'.fs(p.id64)
	},

	defaultUserAuthError: function() {
	    var $$ = oo.prefix$('#content-')
	    $$('login-link').attr('href', oo.util.profile.loginUrl())
	    $$('search-link, quick-backpack, site-buttons, login-prompt').fadeIn()
	    ns.profile.defaultUserAuthError = oo.noop
	},

	defaultUserAuthOkay: function(p) {
	    oo.util.profile.put(p)
	    var $$ = oo.prefix$('#content-')
	    $$('player-profile-link').attr('href', oo.util.profile.defaultUrl(p))
	    $$('login-link').hide()
	    $$('user-buttons, logout-link, site-buttons').show()
	    if (p.subscription.status != 'verified') {
		$$('sub-buttons').show()
	    }
	    ns.profile.defaultUserAuthOkay = oo.noop
	},

	put: function(p, force) {
	    if (p.message_count || force) {
		var b = $('#content-player-profile-link')
		if (!b.data('msg-count') || force) {
		    b.text('My Profile ({0})'.fs(p.message_count))
		    b.data('msg-count', p.message_count)
		}
	    }
	    $('#content-avatar-pod')
		.html(oo.util.img({src: p.avatar, width: 24, height: 24}))
		.show()
	    oo.model.status.extend({suffix: p.id64}).init()
		.success(function(status) {
		    $('#content-avatar-pod img').addClass(status.online_state)
		    $('#content-avatar-pod img').addClass('profile-status')
		})
	},

	putAvatar: function(p, c) {
	    var lbl = $('span.av', c),
		img = $('img.av', c),
		url = oo.util.profile.defaultUrl(p)
	    try {
		lbl.text(p.personaname).parent().attr('href', url)
		img.attr('src', p.avatar).parent().attr('href', url)
	    } catch (x) {
		oo.error('put avatar', x, p, c)
	    }
	    return oo.data.status({suffix: p.id64})
		.success(function(s) {
		    img.addClass('profile-status {0}'.fs(s.online_state))
		})
	},

	putBadge: function(p) {
	    var possum = p.rating[0], poscnt = p.rating[1], negsum = p.rating[2], negcnt = p.rating[3],
		pos = Math.round(poscnt > 0 ? possum / poscnt : 0),
		neg = Math.round(negcnt > 0 ? negsum / negcnt : 0),
		url = oo.util.profile.defaultUrl(p)
	    oo('badge-title').text(p.personaname)
	    oo('owner-view-steam-profile').attr('href', p.profileurl)
	    oo('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(p.steamid))
	    oo('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(p.steamid))
	    oo('pos-label').text('{0}% Positive'.fs( pos ))
	    oo('pos-bar').width('{0}%'.fs(pos ? pos : 1)).html('&nbsp;')
	    $('div.padding', oo('pos-bar').parent()).width('{0}%'.fs(100-pos) )
	    oo('neg-label').text('{0}% Negative'.fs( Math.abs(neg) ))
	    oo('neg-bar').width('{0}%'.fs(neg ? neg : 1)).html('&nbsp;')
	    $('div.padding', oo('neg-bar').parent()).width('{0}%'.fs(100-neg) )
	    if (p.avatarmedium) { oo('avatar').attr('src', p.avatarmedium)  }

	    oo('avatar').parent().attr('href', url)
	    oo('owner-view-backpack').attr('href', '{0}#3'.fs(url))
	    oo('owner-view-listings').attr('href', '{0}#1'.fs(url))
	    oo('owner-view-bids').attr('href', '{0}#2'.fs(url))

	    oo.data.status({suffix: p.id64}).success(function(s) {
		var m = s.message_state
		GM = m; GS = s
		oo('avatar').addClass(s.online_state)
		if (/In-Game.*?Team Fortress 2/.test(m)) {
		    if (/<a href/.test(m)) {
			oo('join-game').attr('href', (/ - <a href="(.*)">Join<\/a>/)(m)[1]).parent().slideDown()
		    }
		    m = m.replace(/ - .*/, '')
		}
		oo('badge-status').html(m).addClass(s.online_state).slideDown()
	    })
	    return oo('badge')
	}
    })

    ns.settings = function(s) {
	var valid = s && oo.keys(s).length
	return {
	    showEquipped: (valid ? s['badge-equipped'] : true),
	    showPainted: (valid ? s['badge-painted'] : true),
	    showUseCount: (valid ? s['badge-usecount'] : true),
	    showAngrySalad: (valid ? s['angry-fruit-salad'] : false),
	    showAngryLite: (valid ? (s['angry-fruit-salad'] && s['angry-fruit-salad-lite']) : false),
	    showItemEffect: (valid ? s['unusual-item-background'] : false),
	    showItemTags: (valid ? s['badge-tags'] : false),
	    showHighCraftNumber: (valid ? s['badge-all-craftnum'] : false)
	}
    }

    ns.itemUids = function(src) {
	var uids = {}
	$.each(src, function(idx, obj) {
	    $.each(obj.items, function(i, item) {
		uids[item.uniqueid] = item
	    })
	})
	return uids
    }

    ns.pathTail = function() { return window.location.pathname.split('/').pop() }

    ns.img = function(options) {
	var src = options['src'] ? options['src'] : '/media/img/missing.png'
	var width = '' + (options['width'] || 32)
	var height = '' + (options['height'] || 32)
	var alt = options['alt'] || ''
	var style = options['style'] || ''
	var cls = options['klass'] || ''
	return '<img src="{0}" width="{1}" height="{2}" alt="{3}" style="{4}" class="{5}" />'.fs(
	    src, width, height, alt, style, cls)
    }

    var lazy = function(def) {
	var cache = []
	return function(i) {
	    return (i in cache) ? cache[i] : (cache[i] = def.call(arguments.callee, i))
	}
    },

    SchemaTool = function(schema) {
	var self = this

	self.load = function(schema) {
	    self.schema = schema.result
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
	    self.tooltips = oo.backpack.itemHoverTool(self)
	}

	self.asPlayerItem = function(i) {
	    return {
		attributes: i.attributes || {'attribute':[]},
		defindex: i.defindex,
		level: i.level || '',
		quality: i.quality || i.item_quality,
		quantity: i.quantity || 1,
		inventory: i.inventory || 0,
		custom_name: i.custom_name,
		custom_desc: i.custom_desc
	    }
	}

	self.putImages = function(settings, context, options) {
	    // replace any items on the page that have the "schema
	    // definition index replace" class with the url of the item
	    // specified in the content.
	    var itemImg = function(url) { return oo.util.img({src:url, width:64, height:64}) },
		toolDefs = self.tools(),
		actionDefs = self.actions(),
		settingV = oo.util.settings(settings),
		options = options || {fast:true},
		fast = options.fast,
		// specifically check for the absence of an image because
		// some pages (e.g., search) get bad overwrites when
		// looking for just the .defindex-lazy class.
 		divs = $('.defindex-lazy'+( fast ? '' : ':not(:has(img))'), context)

	    divs.each(function(index, tag) {
		try {
		    var data = $.parseJSON($(tag).text())
		    if (typeof data === 'number') { throw '' } // picked up the quantity span content, not the div content
		    if (!data) { throw '' }
		} catch (e) {
		    return
		}
		var defindex = data.defindex,
		    def = self.itemDefs()[defindex]
		if (!def) { return }
		var pitem = self.asPlayerItem(data)
		$(tag).data('node', pitem)
		$(tag).html(itemImg(def['image_url'])).fadeIn()
		var iutil = oo.util.item(pitem, schema),
		    img = $('img', tag)
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
			.addClass('border-quality-{0}'.fs( pitem.quality))
		    if (!settingV.showAngryLite) {
			img.parent().parent()
			    .addClass('background-quality-{0}'.fs( pitem.quality))
		    }
		}
		if (settingV.showItemTags && iutil.isNamed()) {
		    img.parent()
		    .append('<span class="tool-base tool-{0}">&nbsp;</span>'.fs(
				pitem.custom_name && pitem.custom_desc ? '5020-5044' : (pitem.custom_name ? '5020' : '5044')
			    ))
		}
		if (settingV.showItemEffect && iutil.effect()) {
		    img.parent().parent().addClass('effect-{0} effect-base'.fs(iutil.effect()))
		}
	    })
	}

	self.select = function(key, match) {
	    var res = {},
		matchf = (typeof(match) == typeof('')) ? function(v) { return v == match } : match
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
		$.each(((def.attributes || {} ).attribute || []), function(i, a) {
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
	    return $.map(oo.values(self.tradable()), function(item, index) {
		return {defindex:item.defindex, pos:index+1}
	    })
	}

	if (typeof(schema) == 'undefined') {
	    //oo.data.schema({success: self.load})
	    oo.data.schema().success(self.load)
	} else {
	    self.load(schema)
	}
    }

    ns.hash = function() { return location.hash.slice(1) }
    ns.schema = function(s) { return new SchemaTool(s) }
    ns.listingCurrencySym = function(l) {
	return $.map(l.bid_currency_type[0], function(x) { return '&#' + x + ';'}).join('')
    }


})(oo.util = {});


//
// Begin the 'data' namespace.
//
(function(ns) {
    var cache = {},
	pending = {},
	debug = true,

    loader = ns.loader = function(config) {
	return function(options) {
	    var options = options || {},
		url = config.prefix + (options.suffix || ''),
		dataType = (options.dataType || config.dataType || 'json'),
		jsonpCallback = (options.jsonpCallback || config.jsonpCallback || null),
	        data = (options.data || config.data || {})

	    if (cache[url]) {
		if (debug) { oo.info('cache hit:', url) }
		return cache[url]
	    }
	    if (pending[url]) {
		if (debug) { oo.info('pending request hit:', url) }
		return pending[url]
	    }
	    if (debug) {
		oo.info('cache miss:', url)
	    }
	    if (dataType == 'jsonp' && options.suffix) {
		jsonpCallback += options.suffix
	    }
	    return pending[url] = $.ajax({
		url: url,
		async: true,
		cache: true,
                data: data,
		dataType: dataType,
		jsonpCallback: jsonpCallback,
		complete: function(v) { cache[url] = v; delete(pending[url]) }
	    })
	}
    },

    authLoader = loader({prefix: '/api/v1/auth/profile'}),
    backpackLoader = loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v2/public/items/',
	dataType: 'jsonp',
	jsonpCallback: 'backpack'
    }),
    bidsLoader = loader({prefix: '/api/v1/public/bids/'}),
    blogLoader = loader({prefix: '/api/v1/public/blog-entries'}),
    blogLoader2 = loader({
        prefix: 'http://tf2auctions.blogspot.com/feeds/posts/default',
        dataType: 'jsonp',
        jsonpCallback: 'blogFu',
        data: {alt:"json-in-script"}
    }),
    feedbackLoader = loader({prefix: '/api/v1/public/profile-feedback/'}),
    listingLoader = loader({prefix: '/api/v1/public/listing/'}),
    listingsLoader = loader({prefix: '/api/v1/public/listings/'}),
    messagesLoader = loader({prefix: '/api/v1/auth/list-messages'}),
    newsLoader = loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v2/public/news',
	dataType: 'jsonp',
	jsonpCallback: 'tf2auctionsNews'
    }),
    profileLoader = loader({prefix: '/api/v1/public/profile/'}),
    schemaLoader = loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v2/public/schema',
	dataType: 'jsonp',
	jsonpCallback: 'schema'
    }),
    searchLoader = loader({prefix: '/api/v1/public/search'}),
    statsLoader = loader({prefix: '/api/v1/public/stats'}),
    statusLoader = loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v2/public/status/',
	dataType: 'jsonp',
	jsonpCallback: 'status'
    })

    ns.auth = function(o) {
	o = o || {}
	if (oo.conf.auth) {
	    var s = (oo.conf.auth.settings ? 'settings=1' : '')
	    s = s ? ('?' + s) : ''
	    var c = (oo.conf.auth.complete ? 'complete=1' : '')
	    s = s + (c ? '&'+c : '')
	    o.suffix = s
	}
	return authLoader(o)
    }
    ns.backpack = function(o) { return backpackLoader(o) }
    ns.bids = function(o) { return bidsLoader(o) }
    ns.blog = function(o) { return blogLoader(o) }
    ns.blog2 = function(o) { return blogLoader2(o) }
    ns.feedback = function(o) { return feedbackLoader(o) }
    ns.listing = function(o) { return listingLoader(o) }
    ns.listings = function(o) { return listingsLoader(o) }
    ns.messages = function(o) { return messagesLoader(o) }
    ns.news = function(o) { return newsLoader(o) }
    ns.profile = function(o) { return profileLoader(o) }
    ns.schema = function(o) { return schemaLoader(o) }
    ns.search = function(o) { return searchLoader(o) }
    ns.stats = function(o) { return statsLoader(o) }
    ns.status = function(o) { return statusLoader(o) }


})(oo.data = {});


//
// Begin the MVC namespace.  Note that these objects are added to 'oo'
// and not a nested namespace of their own.
//
(function(ns) {
    // MVC is the root object that defines the 'extend' function for
    // creating new objects and a default 'init' funciton that does
    // nothing.
    //
    ns.mvc = {
	clones: [],
	init: function() { return this },
	extend: function() {
	    var obj = Object.create(this)
	    for (var i = 0; i < arguments.length; i++) { $.extend(obj, arguments[i]) }
	    this.clones.push(obj)
	    return obj
	}
    }

    //
    // This is the root Controller object.
    //
    ns.controller = ns.mvc.extend({
	clones: [],

	init: function() {
	    var self = this,
		eventNames = $.merge([], oo.keys($.attrFn))
	    $.merge(eventNames, oo.keys($.event.special))

	    // initalize the model associated with this controller.  the
	    // model will initalize the view when it's ready.
	    //self.model.init.apply(self.model, [self.view, self.config])
	    var m = self.model.init.apply(self.model, [self.view])

	    // initialize anything in the namespace that looks like an
	    // event listener.
	    $.each(oo.keys(self), function(idx, key) {
		var value = self[key]
		if (typeof key == 'string' && (typeof value == 'function' || typeof value == 'object')) {
		    var names = key.split(' '),
		    name = names.pop()
		    if (name == 'ready') {
			$(function() { value.apply(self, arguments) })
		    } else if (name.indexOf('live:') == 0) {
			var inner = name.split(':')
			$(names.join(' ')).live(inner[1], function(e) { e.controller = self; value.apply(self, [e]) })
		    } else if (name && eventNames.indexOf(name) > -1) {
			$(names.join(' ')).bind(name, function(e) { e.controller = self; value.apply(self, [e]) })
		    }
		}
	    })
	    return m
	},

	hash: function() { return location.hash.slice(1) }
    })

    //
    // This is the root Model object.  Model objects are
    // initialized automatically by their associated Controller.
    //
    ns.model = ns.mvc.extend({
	clones: [],
	init: function(view) {
	    var self = this, args = arguments, suffix = self.suffix || ''
	    suffix = (typeof suffix === 'function' ? suffix() : suffix)
	    return self.req = self.loader({suffix: suffix})
		.success(function(d) { self.data = d })
	},

	initJoin: function(view) {
	    var self = this
	    return oo.model.init.apply(self)
		.success(function() { view.join(self) })
	}

    })

    ns.model.backpack = ns.model.extend({
	init: function(view) {
	    var self = this, params = {suffix: self.suffix}
	    return $.when(
		oo.data.backpack(params),
		oo.data.bids(params),
		oo.data.listings(params)
	    ).done(function() {
		self.backpack = arguments[0][0]
		self.bids = arguments[1][0]
		self.listings = arguments[2][0]
	    })
	}
    })

    ns.model.schema = ns.model.extend({
	loader: oo.data.schema,
	init: function(view) {
	    var self = this
	    return ns.model.init.apply(self, arguments)
		.success(function(data) {
		    var st = self.tool = oo.util.schema(data), tt = oo.backpack.itemHoverTool(st)
		    $('div.ov td.item-view, #backpack-ac td, .backpack td')
			.live('mouseover', function(e) { tt.show(e); $(this).addClass('outline')  })
			.live('mouseout',  function(e) { tt.hide(e);  $(this).removeClass('outline') })
		    $('.listing-view')
			.live('mouseover', function() { $(this).addClass('listing-hover') })
			.live('mouseout',  function() { $(this).removeClass('listing-hover') })
		})
	},

	// this is never called!  move the init success to a single function:
	success: function(data, status, jqxhr) {
	    this.tool = oo.util.schema(data)
	    oo.model.success.apply(this, arguments)
	}
    })

    ns.model.status = ns.model.extend({
	loader: oo.data.status
    })

    ns.model.auth = ns.model.extend({
	loader: oo.data.auth,
	init: function(view) {
	    return ns.model.init.apply(this, arguments)
		.success(function(p) { oo.util.profile.defaultUserAuthOkay(p) })
		.error(function() { oo.util.profile.defaultUserAuthError() })
	}
    })

    //
    // This is the root View object.
    //
    // The View object and its clones provide several interesting behaviors:
    //
    //
    // 3. the 'proto' method creates DOM element clones based on the
    // 'cloneClass' attribute.
    //
    // 4. if the 'model' attribute is supplied, it will be initalized
    // after the view is initalized.
    //
    ns.view = ns.mvc.extend({
	clones: [],
	profile: null,
	authError: function() {},
	authSuccess: function() {},
	init: function(model) { this.model = model },
	join: function(model) {},

	proto: function() {
	    var cc = this.cloneClass
	    return $('.' + cc).clone().removeClass('prototype null ' + cc)
	},

	message: function(v) {
	    if (v) {
		return $('#content-site-message').removeClass('null').fadeIn().text(v)
	    } else {
		return $('#content-site-message')
	    }
	},

	showTermsDialog: function(e) {
	    $.ajax({
		url: '/terms-dialog',
		cache: true,
		success: function(text) {
		    $('#content-terms-dialog').html(text).dialog({
			dialogClass: 'terms-dialog',
			modal: true,
			resizable: false,
			show: 'fade',
			height: 400,
			title: 'TF2Auctions.com Rules,Terms and Conditions, and Privacy Policy',
			width: $(window).width() * 0.9, position: 'top' });
		}
	    })
	    return false
	},

	showOpenMarketDialog: function(e) {
	    $.ajax({
		url: '/openmarket-dialog',
		cache: true,
		success: function(text) {
		    $('#content-terms-dialog').html(text).dialog({
			dialogClass: 'terms-dialog',
			modal: true,
			resizable: false,
			show: 'fade',
			height: 400,
			title: 'TF2 Open Market',
			width: $(window).width() * 0.9, position: 'top' });
		}
	    })
	    return false
	},

	navFeatured: function(offset) {
	    var prefix = '#featured-listings div.listing-seed',
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
	},

	hiliteSpan: function(after) {
	    return '<span class="hilite">&nbsp;</span><span>{0}</span>'.fs(after)
	},

	docTitle: function(v) {
	    if (v) {
		document.title = document.title + ' - ' + v
	    } else {
		return document.title
	    }
	},

	formatRating: function(v) {
	    return '{0}{1}'.fs(v > 0 ? '+' : '', v)
	},

	setRating: function(e, v) {
	    e.text(oo.view.formatRating(v)).removeClass('rate-pos rate-neg rate-zero')
	    //'{0}{1}'.fs(v>0 ? '+' : '', v)).
	    e.addClass('rating-value ' + (v > 0 ? 'rate-pos' : (v<0 ? 'rate-neg' : 'rate-zero')))
	},

	updateTimeLeft: function (expires, onChange, onExpires) {
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
    })

    ns.view.schema = ns.view.extend({
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
	}
    })
})(oo);


//
// document and library initialization
//
(function(jq) {
    jq.fn.fadeAway = function(cb) { return this.each(function() { jq(this).fadeTo(400, 0, 'linear', cb) })  }
    jq.fn.fadeBack = function(cb) { return this.each(function() { jq(this).fadeTo(9999, 100, 'linear', cb) }) }
    jq.fn.scrollTopAni = function() { return jq('html body').animate({scrollTop: jq(this).offset().top}) }
})(jQuery);


$(document).ready(function() {
    // perform an initial auth if the module has indicated authentication
    if (oo.conf.auth) {
	oo.model.auth.init()
    }
    // initialize each direct clone of the oo.controller object:
    $.each(oo.controller.clones, function(i, c) { c.init.apply(c) })

    if ($.browser.msie) {
	//	$LAB.script("/media/js/jquery.corner.min.js").wait(
	//function() {
	//	    })
    }
})

//
// Begin local extensions and top-level functions.
//
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


//
// Create the 'oo' namespace.
//
var oo = (function() {
    var ns = function(suffix, next) { return $('{0}{1}'.fs(ns.prefix, suffix), next) }
    ns.prefix = ''
    ns.config = function(p) { ns.prefix = p; return ns }
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
	2:  'Flying Bits',
	3:  'Nemesis Burst',
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
	9: 'self'
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
	    var h4 = $('#tooltip h4'), desc = playerItem['custom_name'] ? '"{0}"'.fs(playerItem['custom_name']) : schemaItem['item_name']
	    h4.text(desc)
	    h4.attr('class', 'quality-'+playerItem['quality'])
	    if (playerItem['quality'] in oo.tf2.prefixCheckMap) {
		h4.text(quals[playerItem['quality']] + ' ' + h4.text())
	    }

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
	    $('#tooltip .level').text(level ? 'Level ' + level + ' ' + levelType : '')


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
			} else
			    // 142:  don't use 'i made this'
			    if (itemAttr['defindex'] == 142) {
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
	        desc = schemaItem['item_description']
		$('#tooltip .alt').html('{0}'.fs( (current ? current + '<br />' : '') + desc))
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
		var schema = oo.schema.tool(s),
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
		.success(function(schema) {
		    schema = oo.schema.tool(schema)
		var newIdx = -1,
		    settings = oo.util.settings(settings),
		    toolDefs = schema.tools(),
		    actionDefs = schema.actions()
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
			self.setEquipped(iutil, img, defindex, settings)
			self.setTradable(iutil, ele, item, settings)
			self.setPaintJewel(iutil, img, settings)
			self.setUseCount(img, item, settings, toolDefs, actionDefs)
		    } else {
			newIdx += 1
			var target = $('#bp-unplaced-{0} table.bp-unplaced'.fs(slug))
			if (!$('td:not(:has(img))', target).length) {
			    var cells = new Array(cols+1).join('<td><div></div></td>')
			    target.append('<tbody><tr>' + cells + '</tr></tbody>')
			}
			$('td:eq({1}) div'.fs(slug, newIdx), target).append(iutil.img())
			var img = $('td img:last'.fs(slug), target).data('node', item)
			self.setTradableUnplaced(iutil, img, item, settings)
			self.setUseCount(img, item, settings, toolDefs, actionDefs)
		    }
		})
		    $('#bp-placed-{0} label, #bp-unplaced-{1}'.fs(slug, slug))
		    .toggle(newIdx > -1)
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
		var schema = oo.schema.tool(s),
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

	self.setTradable = function(itemutil, element, item, settings) {
	    if (itemutil.canTrade()) {
		element.parent('td')
		    .removeClass('cannot-trade active-listing active-bid')
		if (settings.showAngrySalad) {
		    element.parent()
			.addClass('border-quality-{0} background-quality-{1}'.fs(item.quality, item.quality))
		}
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
	    if (itemutil.canTrade()) {
		element.parent().removeClass('cannot-trade active-listing active-bid')
		if (settings.showAngrySalad) {
		    element.parent().parent()
			.addClass('border-quality-{0} background-quality-{1}'.fs(item.quality, item.quality))
		}
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
	return moveClasses(source, target, /(border|background)-quality/)
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
		var others = $('span.equipped:only-child, span.quantity:only-child, span.jewel', ui.draggable)
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
	    var others = $('span.equipped, span.quantity, span.jewel', cell)
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
    		var others = $('span.equipped, span.quantity, span.jewel', source.parent())
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
// Begin the schema namespace
//
(function(ns) {
    var lazy = function(def) {
	var cache = []
	return function(i) {
	    return (i in cache) ? cache[i] : (cache[i] = def.call(arguments.callee, i))
	}
    }

    var SchemaTool = function(schema) {
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
		inventory: i.inventory || 0
	    }
	}

	self.putImages = function(settings, callback) {
	    // replace any items on the page that have the "schema
	    // definition index replace" class with the url of the item
	    // specified in the content.
	    var itemImg = function(url) { return oo.util.img({src:url, width:64, height:64}) },
	        toolDefs = self.tools(),
	        actionDefs = self.actions(),
	        settingV = oo.util.settings(settings)
	    $('.defindex-lazy').each(function(index, tag) {
		try {
		    var data = $.parseJSON($(tag).text())
		} catch (e) {
		    return
		}
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
		var iutil = oo.util.item(pitem, schema)
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

    ns.tool = function(s) { return new SchemaTool(s) }
})(oo.schema = {});


//
// Begin the 'util' namespace.
//
(function(ns) {
    ns.item = function(item, schema) {
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
		if (!item.defindex) {
		    return oo.util.img({src:'/media/img/missing.png', width:64, height:64})
		}
		return oo.util.img({src: schema.itemDefs()[item['defindex']]['image_url'],
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

    ns.listing = Object.create({
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
	    oo.model.status({suffix: listing.owner.id64})
	        .success(function(status) {
		    $('.listing-avatar', target)
			.addClass('profile-status ' + status.online_state)
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

    ns.profile = Object.create({
	loginUrl: function() {
	    return '/login?next=' + encodeURIComponent(window.location.href)
	},

	defaultUrl: function(p) {
	    return p.custom_name ? '/id/{0}'.fs(p.custom_name) : '/profile/{0}'.fs(p.id64)
	},

	defaultUserAuthError: function(request, status, error) {
	    $('#content-login-link').attr('href', oo.util.profile.loginUrl())
	    $('#content-search-link, #content-quick-backpack').show()
            $('#content-site-buttons').show()
	},

	defaultUserAuthOkay: function(p) {
	    $('#content-player-profile-link').attr('href', oo.util.profile.defaultUrl(p))
	    oo.util.profile.put(p)
	    $('#content-login-link').hide()
	    $('#content-user-buttons, #content-logout-link').show()
            $('#content-site-buttons').show()
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
	    oo.model.status.clone({suffix: p.id64}).init()
		.success(function(status) {
	            $('#content-avatar-pod img').addClass(status.online_state)
	            $('#content-avatar-pod img').addClass('profile-status')
		})
	}
    })

    ns.settings = function(s) {
	var valid = s && oo.keys(s).length
	return {
	    showEquipped: (valid ? s['badge-equipped'] : true),
	    showPainted: (valid ? s['badge-painted'] : true),
	    showUseCount: (valid ? s['badge-usecount'] : true),
	    showAngrySalad: (valid ? s['angry-fruit-salad'] : false)
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
	var cls = options['class'] || ''
	return '<img src="{0}" width="{1}" height="{2}" alt="{3}" style="{4}" class="{5}" />'.fs(
	    src, width, height, alt, style, cls)
    }
})(oo.util = {});


//
// Begin the 'data' namespace.
//


(function(ns) {
    ns.loader = function(config) {
	var prefix = config.prefix, cache = {}, pending = {}

	return function(options) {
	    var options = options || {},
	        url = prefix + (options.suffix || ''),
                success = options.success || oo.ident,
                error = options.error || oo.ident,
                debug = config.debug || options.debug
	    if (cache[url]) {
		if (debug) { console.log('cache hit:', url) }
		return cache[url]
	    }
	    if (pending[url]) {
		if (debug) { console.log('pending request hit:', url) }
		return pending[url]
	    }
	    if (debug) {
		console.log('cache miss:', url)
	    }
            return pending[url] = $.ajax({
		url: url,
		async: true,
		cache: true,
		dataType: (options.dataType || config.dataType || 'json'),
		jsonpCallback: (options.jsonpCallback || config.jsonpCallback || null),
		complete: function(v) { cache[url] = v; delete(pending[url]) }
	    })
	}
    }
    var debug = true

    ns.authLoader = ns.loader({prefix: '/api/v1/auth/profile', debug: debug})
    ns.backpackLoader = ns.loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v2/public/items/',
	dataType: 'jsonp',
	jsonpCallback: 'tf2auctionsBackpackLoader',
	debug: debug
    })
    ns.bidsLoader = ns.loader({prefix: '/api/v1/public/bids/', debug: debug})
    ns.feedbackLoader = ns.loader({prefix: '/api/v1/public/profile-feedback/', debug: debug})
    ns.listingLoader = ns.loader({prefix: '/api/v1/public/listing/', debug: debug})
    ns.listingsLoader = ns.loader({prefix: '/api/v1/public/listings/', debug: debug})
    ns.messagesLoader = ns.loader({prefix: '/api/v1/auth/list-messages', debug: debug})
    ns.profileLoader = ns.loader({prefix: '/api/v1/public/profile/', debug: debug})
    ns.schemaLoader = ns.loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v1/schema',
	dataType: 'jsonp',
	jsonpCallback: 'tf2auctionsSchemaLoader',
	debug: debug
    })
    ns.searchLoader = ns.loader({prefix: '/api/v1/public/search', debug: debug})
    ns.statusLoader = ns.loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v1/status/',
	dataType: 'jsonp',
	jsonpCallback: 'tf2auctionsStatusLoader',
	debug: debug
    })


    // FIXME: using the id is crap, just go back and use the suffix.
    ns.auth = function(o) { return new ns.authLoader(o) }
    ns.backpack = function(o) { 
	if (o.id) {
	    o.suffix = o.id
	    o.jsonpCallback = 'backpack'+o.id
	}
	oo.info('backpack options', o)
	return new ns.backpackLoader(o) 
    }
    ns.bids = function(o) { 
	if (o.id) { o.suffix = o.id }
	return new ns.bidsLoader(o) 
    }
    ns.feedback = function(o) { return new ns.feedbackLoader(o) }
    ns.listing = function(o) { 
	if (o.id) { o.suffix = o.id }
	return new ns.listingLoader(o)
    }
    ns.listings = function(o) { 
	if (o.id) { o.suffix = o.id }
	return new ns.listingsLoader(o) 
    }
    ns.messages = function(o) {
	return new ns.messagesLoader(o)
    }
    ns.profile = function(o) { 
	o.suffix = o.id
	return new ns.profileLoader(o)
    }
    ns.schema = function(o) { return new ns.schemaLoader(o) }
    ns.search = function(o) { return new ns.searchLoader(o) }
    ns.status = function(o) {
	if (o.id) {
	    o.suffix = o.id
	    o.jsonpCallback = 'status'+o.id
	}
	return new ns.statusLoader(o)
    }


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
    ns.controller = ns.mvc.extend({
	clones: [],

	init: function() {
            var self = this,
	        eventNames = $.merge([], oo.keys($.attrFn))
	    $.merge(eventNames, oo.keys($.event.special))

	    // initalize the model associated with this controller.  the
	    // model will initalize the view when it's ready.
	    self.model.init.apply(self.model, [self.view, self.config])

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

			// bug:  IE claims eventNames doesn't have an 'indexOf' method.  le sigh.
	            } else if (name && eventNames.indexOf(name) > -1) {
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
    ns.model = ns.mvc.extend({
	clones: [],

	init: function(view, config) {
	    var self = this,
                args = arguments,
                suffix = self.suffix || '',
	    suffix = (typeof suffix === 'function' ? suffix() : suffix)
	    if (self.loader) {
	    return self.req = self.loader({suffix: suffix})
	        .success(function(d) { self.data = d })
	    }
	},

	clone: function(attrs) {
	    return $.extend($.extend({}, this), attrs)
	}
    })

    ns.model.schema = ns.model.extend({
	loader: oo.data.schemaLoader,
	init: function(view, config) {
	    var self = this
	    return ns.model.init.apply(this, arguments)
	        .success(function(data) {
		    var st = self.tool = oo.schema.tool(data), tt = oo.backpack.itemHoverTool(st)
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
	    this.tool = oo.schema.tool(data)
	    oo.model.success.apply(this, arguments)
	}
    })

    ns.model.status = ns.model.extend({
	loader: oo.data.statusLoader
    })

    ns.model.auth = ns.model.extend({
	loader: oo.data.authLoader,
	init: function(view, config) {
	    return ns.model.init.apply(this, arguments)
	        .success(function(p) {
		    oo.util.profile.defaultUserAuthOkay(p)
		})
	        .error(function() {
		    oo.util.profile.defaultUserAuthError()
		})
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
	    e.addClass(v > 0 ? 'rate-pos' : (v<0 ? 'rate-neg' : 'rate-zero'))
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
	},

	joinListings: function(options) {
	    oo.util.listing.putMany(options)
	}
    })

    ns.view.searchbase = ns.view.schema.extend({
	joinFeatured: function(results) {
	    if (results.featured && results.featured.length) {
		var featured = results.featured
	    } else {
		return
	    }
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
		if (featured.length > 1) {
		    $('#featured-listings div.listing-seed div.navs span.nav.next').removeClass('null')
		    $('#featured-listings div.listing-seed div.navs span.nonav.prev').removeClass('null')
		}
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
})(oo);




//
// document and library initialization
//
(function(jq) {
    jq.fn.fadeAway = function(cb) { return this.each(function() { jq(this).fadeTo(750, 0, 'linear', cb) })  }
    jq.fn.fadeBack = function(cb) { return this.each(function() { jq(this).fadeTo(750, 100, 'linear', cb) }) }
    jq.fn.scrollTopAni = function() { return jq('html body').animate({scrollTop: jq(this).offset().top}) }
})(jQuery);

$(document)
    .bind('ready', function() {
	// initialize each direct clone of the oo.controller object:
	$.each(oo.controller.clones, function(i, c) { c.init.apply(c) })
        oo.info('base.js loaded at document ready')
    })

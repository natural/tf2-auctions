// haven't found these definitions anywhere in the source files:
var itemEffects = {
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
    18: 'Circling Peace Sign'
}


var extraLineMap = {
    0: 'alt',
    1: 'positive',
    2: 'negative'
}


var effectTypeMap = {
    negative: 'negative',
    neutral:'alt',
    positive: 'positive'
}


var prefixCheckMap = {
    3: 'vint',
    5: 'unusual',
    7: 'com',
    8: 'dev',
    9: 'self'
}


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


//
// tool for formatting and showing a nice tooltip.
//
var TooltipView = function(schema) {
    var self = this
    var quals = schema.qualityMap()

    var formatSchemaAttr = function(def, val) {
	var line = def['description_string'].replace(/\n/gi, '<br />')
	// we only look for (and sub) one '%s1'; that's the most there is (as of oct 2010)
	if (line.indexOf('%s1') > -1) {
	    var fCalc = formatCalcMap[def['description_format']]
	    line = line.replace('%s1', fCalc(val))
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
	if (playerItem['quality'] in prefixCheckMap) {
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
	var level = playerItem['level']
	var levelType = schemaItem['item_type_name']
	    .replace('TF_Wearable_Hat', 'Wearable Item')
	    .replace('TF_LockedCrate', 'Crate')
	$('#tooltip .level').text(level ? 'Level ' + level + ' ' + levelType : '')

	// clear and set the extra text
	$.each(extraLineMap, function(k, v) { $('#tooltip .'+ extraLineMap[k]).text('') })
	if (playerItem['attributes']) {
	    $.each(playerItem['attributes']['attribute'], function(aidx, itemAttr) {
		var attrDef = schema.attributesById()[itemAttr['defindex']]
		var extra = formatSchemaAttr(attrDef, itemAttr['value'])
		var etype = effectTypeMap[attrDef['effect_type']]

		// 134:  set effect name
		if (itemAttr['defindex'] == 134) {
		    extra = formatSchemaAttr(attrDef, itemEffects[itemAttr['float_value']])
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
		var attrDef = schema.attributesByName()[schemaAttr['name']]
		if (!attrDef) { return }
		if (attrDef['description_string']=='I made this!') { return }
		if (attrDef['description_string']=='%s1% damage done' && attrDef['attribute_class']=='always_tradable') { return }
		if (attrDef['description_string']=='unused') { return }
		if (attrDef['attribute_class']=='set_employee_number') { return }
		var extra = formatSchemaAttr(attrDef, schemaAttr['value'])
		var etype = effectTypeMap[attrDef['effect_type']]
		var current = $('#tooltip .' + etype).html()
		$('#tooltip .' + etype).html( current ? current + '<br />' + extra : extra)
	    })
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


//
// tool for managing the navigation thru a view of backpack items.
//
var NewBackpackNavigator = function(options) {
    var self = this, slug = options.slug
    var outerContext = $('#bp-{0}'.fs(slug))
    var pagesContext = $('div.bp-pages', outerContext)
    var pageCount = $('table.bp-page-{0}'.fs(slug), pagesContext).length
    var pageCurrent = 1

    var nonPrev = $('#bp-nav-{0} .non:first'.fs(slug))
    var navPrev = $('#bp-nav-{0} .nav:first'.fs(slug))
    var nonNext = $('#bp-nav-{0} .non:last'.fs(slug))
    var navNext = $('#bp-nav-{0} .nav:last'.fs(slug))

    self.init = function() {
	var initWidth = $('body').width() // sucks, but it's better than 0
        $('table.bp-page-{0}:gt(0)'.fs(slug), pagesContext).css('margin-left', initWidth)
	$('a', navPrev).click(function (event) { self.navigate(-1); return false })
	$('a', navNext).click(function (event) { self.navigate( 1); return false })
	self.updateButtons()
    }

    self.reinit = function() {
	pageCurrent = 1
	self.navigate(0)
    }

    self.navigate = function(offset) {
	if ((pageCurrent + offset) > 0 && (pageCurrent + offset <= pageCount)) {
	    var prev = pageCurrent
	    var newMargin = $('div.bp-pages', outerContext).width() * (offset>0 ? -1 : 1)
	    pageCurrent += offset
	    $('table.bp-{0}'.fs(prev), pagesContext)
	        .animate({marginLeft:newMargin}, 200, function() {
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
var NewBackpackItemsTool = function(options) {
    var self = this
    var items = options.items
    var listingUids = options.listingUids || []
    var bidUids = options.bidUids || []
    var slug = options.slug
    var cols = options.cols || 10

    self.init = function(settings) {
        var schema = new SchemaTool()
	var newIdx = -1, settings = settingsView(settings)
	var toolDefs = schema.tools(), actionDefs = schema.actions()
	$('div.bp').mousedown(function() { return false })

	$.each(items, function(index, item) {
	    item.flag_active_listing = (item.id in listingUids)
	    item.flag_active_bid = (item.id in bidUids)
	    var iutil = itemUtil(item, schema), defindex = item['defindex']
	    if (iutil.pos() > 0) {
		var ele = $('#' + slug + iutil.pos() + ' div').append(iutil.img())
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
	self.initOptional()
    }

    self.initOptional = function() {
	var showSelect = options.select
	var showSelectMulti = options.selectMulti
	if (showSelect) {
	    $('#bp-{0} td'.fs(slug)).click(function (e) {
		var td = $(this)
		if (!showSelectMulti) {
		    $('td', td.parents('table')).removeClass('selected')
		}
		td.removeClass('outline').toggleClass('selected')
	    })
	}

	var showTooltips = options.toolTips
	if (showTooltips) {
	    var schema = new SchemaTool()
	    var tipTool = new TooltipView(schema)
	    // this is a very general selector that picks up just
	    // about everything on the page that's backpack-ish,
	    // including choosers:
	    $('div.bp td').hover(tipTool.show, tipTool.hide)
	}

	var makeNav = options.navigator
	if (makeNav) {
	    self.navigator = new NewBackpackNavigator({slug: slug})
	    // we're in our own init, so init the navigator, too
	    self.navigator.init()
	}

	var showHover = options.outlineHover
	if (showHover) {
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
	var help = options.help || ''
	if (help) {
	    $('#bp-{0} span.help'.fs(slug)).text(help)
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


//
// tool for showing a "chooser", which is a small area for selecting
// items.
//
// NB: backpack choosers must be initialized *after* any corresponding
// backpack item tool.
//
var NewBackpackChooser = function(options) {
    var self = this
    var title = options.title
    var backpackHelp = options.backpackHelp
    var backpackSlug = options.backpackSlug
    var chooserSlug = options.chooserSlug

    self.init = function(settings) {
	self.initDrag()
	self.initOptional()
    }

    self.initDrag = function() {
	var dropMove = function(event, ui) {
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
	var dragFromBackpack = function(event, ui) {
	    var img = $('img', event.target) // source img, not the drag img
            try {
		var node = img.data('node')
		return !(node.flag_cannot_trade) && !(node.flag_active_listing) && !(node.flag_active_bid)
	    } catch (e) { return false }
	}
	var dragShow = function(event, ui) { ui.helper.addClass('selected').removeClass('outline') }
	var dropOver = function(event, ui) { $(this).parent().addClass('outline') }
	var dropOut = function(event, ui) { $(this).parent().removeClass('outline') }

	$('#bp-{0} td'.fs(backpackSlug))
	    .draggable({
		containment: $('#bp-{0}'.fs(backpackSlug)).parent(),
		cursor: 'move',
		drag: dragFromBackpack,
		helper: 'clone',
		start: dragShow})

	$('#bp-{0} td div'.fs(backpackSlug))
	    .droppable({
		accept: '#bp-chooser-{0} td'.fs(chooserSlug),
		drop: dropMove,
		out: dropOut,
		over: dropOver})

	$('#bp-chooser-{0} td'.fs(chooserSlug))
	    .draggable({
		containment: $('#bp-{0}'.fs(backpackSlug)).parent(),
		cursor: 'move',
		drag: dragFromBackpack,
		helper: 'clone',
		start: dragShow})

	$('#bp-chooser-{0} td div'.fs(chooserSlug))
	    .droppable({
		accept: '#bp-{0} td'.fs(backpackSlug),
		drop: dropMove,
		out: dropOut,
		over: dropOver})
    }

    self.initOptional = function() {
	// maybe add some help
	if (options.help) {
	    $('#bp-chooser-{0} span.help'.fs(chooserSlug)).text(options.help)
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
    }

    self.updateCount = function() {
	window.setTimeout(function() {
	    var len = $('#bp-chooser-{0} img'.fs(chooserSlug)).length
	    var txt = '(' + len + ' ' + (len == 1 ? 'item' : 'items') + ')'
	    $('#' + chooserSlug + '-title-extra').text(txt)
	}, 150)
    }

    self.moveToChooser = function(event) {
	var source = $(event.target)
	var target = $('#bp-chooser-{0} td div:empty'.fs(chooserSlug)).first()
	var cell = source.parent().parent()
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
	var source = $(event.target)
	var target = $('div', source.data('original-cell'))
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

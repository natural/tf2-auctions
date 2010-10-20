var itemContentSelector = function(s) {
    return '#unplaced-backpack-'+s+' table.unplaced td img, #backpack-'+s+' table.backpack td img, span.equipped'
}


var itemUtil = function(item, schema) {
    return {
	canTrade: function() {
	    return !(item.flag_cannot_trade) && !(item.flag_active_listing)
	},
	equippedTag: function() {
	    return '<span style="display:none" class="equipped">Equipped</span>'
	},
	img: function() {
	    return makeImg({src: schema.itemDefs()[item['defindex']]['image_url'],
			    style:'display:none', width:64, height:64})
	},
	isEquipped: function() { return (item['inventory'] & 0xff0000) != 0 },
	pos:  function() { return (item.pos) ? item.pos : item['inventory'] & 0xFFFF  }
    }
}


var BackpackItemsTool = function(items, uids, slug) {
    var self = this

    self.init = function() {
        var schema = new SchemaTool()
	var newIdx = -1, toolDefs = schema.tools(), actionDefs = schema.actions()

	$.each(items, function(index, item) {
	    item.flag_active_listing = (item.id in uids)
	    var iutil = itemUtil(item, schema)
	    if (iutil.pos() > 0) {
		var ele = $('#' + slug + iutil.pos() + ' div').append(iutil.img())
		var img = $('img:last', ele).data('node', item)
		var def = item['defindex']
		if (iutil.isEquipped()) {
		    img.addClass('equipped equipped-'+def).after(iutil.equippedTag())
		    img.removeClass('unequipped-'+def)
		} else {
		    img.addClass('unequipped-'+def)
		    img.removeClass('equipped equipped-'+def)
		}
		if (iutil.canTrade()) {
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
		$('#unplaced-backpack-' + slug + ' table.unplaced td:eq('+newIdx+') div').append(iutil.img())
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
    var self = this
    var current = 1, count = $('#backpack-' + slug + ' table.backpack tbody').length

    self.navigate = function(event, offset) {
	if (event.detail != 1) { return false }
	if ((current + offset) > 0 && (current + offset <= count)) {
	    $('#backpack-' + slug + ' .backpack-page-' + current).fadeOut(250, function() {
		current += offset
		$('#backpack-' + slug + ' .backpack-page-' + current).fadeIn(250)
		self.redisplay()
	    })
	}
	return false
    }

    self.redisplay = function () {
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

    self.init = function() {
	$('#backpack-nav-' + slug + ' .nav:first a').click(function (e) {
	    return self.navigate(e, -1)})
	$('#backpack-nav-' + slug + ' .nav:last a').click(function (e) {
	    return self.navigate(e, 1)})
	self.redisplay()
    }
}


var BackpackChooser = function(options) {
    var self = this
    var backpack = options.backpack, uids = options.uids
    var backpackSlug = options.backpackSlug, chooserSlug = options.chooserSlug

    self.init = function() {
	var bn = new BackpackNavigator(backpackSlug)
	var bp = new BackpackItemsTool(backpack, uids, backpackSlug)
	bn.init()
	bp.init()
	self.initBackpack()
	self.initDrag()
	return false
    }

    self.initBackpack = function() {
	var title = (typeof(options.title)=='undefined') ? 'Your Backpack' : options.title
	var help = (typeof(options.help)=='undefined') ? 'Drag items from your backpack into the area below.' : options.help
	var width = $('#backpack-' + backpackSlug + ' tbody').width()

	$('#backpack-header-'  + backpackSlug + ' h3').first().html(title)
	$('#backpack-header-' + backpackSlug + ' div').first().html(help)
	$('#backpack-tools-' + backpackSlug).width(width - 10)
	$('#backpack-' + backpackSlug + ' label').width(width)
	$('#unplaced-backpack-' + backpackSlug + ' label').width(width)
	$('div.organizer-view table').mousedown(function() { return false })
    }

    self.initDrag = function() {
	var updateCount = function() {
	    var len = $('#chooser-' + chooserSlug + ' img').length
	    var txt = '(' + len + ' ' + (len == 1 ? 'item' : 'items') + ')'
	    $('#' + chooserSlug + '-title-extra').text(txt)
	}
	var dropMove = function(event, ui) {
	    if ($(this).children().length > 0) { return false }
	    $(this).parent().removeClass('selected')
	    if (options.copy) {
		$(this).append($($('div img', ui.draggable)).clone())
	    } else {
		$(this).append($('div img', ui.draggable))
	    }
	    $('img', this).css('margin-top', '0')
	    $("span.equipped:only-child, span.quantity:only-child").hide().detach()
	    window.setTimeout(updateCount, 150) // delay for accurate counting
	    $('#chooser-' + chooserSlug + ' td, #backpack-' + backpackSlug + ' td').removeClass('selected outline')
	}
	var dragFromBackpack = function(event, ui) {
	    var img = $('img', event.target) // source img, not the drag img
            try {
		var node = img.data('node')
		return !(node.flag_cannot_trade) && !(node.flag_active_listing)
	    } catch (e) { return false }
	}
	var dragShow = function(event, ui) { ui.helper.addClass('selected') }
	var dropOver = function(event, ui) { $(this).parent().addClass('outline') }
	var dropOut = function(event, ui) { $(this).parent().removeClass('outline') }

	$('#backpack-' + backpackSlug + ' td, #unplaced-backpack-' + backpackSlug + ' td')
	    .draggable({
		containment: $('#backpack-'+backpackSlug).parent(),
		cursor: 'move',
		drag: dragFromBackpack,
		helper: 'clone',
		start: dragShow})

	$('#backpack-' + backpackSlug + ' td div, #unplaced-backpack-' + backpackSlug + 'td div')
	    .droppable({
		accept: '#chooser-' + chooserSlug + ' td',
		drop: dropMove,
		out: dropOut,
		over: dropOver})

	$('#chooser-' + chooserSlug + ' td')
	    .draggable({
		containment: $('#backpack-'+backpackSlug).parent(),
		cursor: 'move',
		helper: 'clone',
		start: dragShow})

	$('#chooser-' + chooserSlug + ' td div')
	    .droppable({
		accept: '#backpack-' + backpackSlug + ' td, #unplaced-backpack-' + backpackSlug + ' td',
		drop: dropMove,
		out: dropOut,
		over: dropOver})
    }
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
	    if (!playerItem) { playerItem = $('img', cell).data('node') }
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

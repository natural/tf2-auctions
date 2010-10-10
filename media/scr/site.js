/*
    Some useful steam ids for testing:

    * 76561197960435530 - valve weapons - robin walker
    * 76561197968459473 - community item, gw, medal 4021 - df

*/
var unplacedItemSelector = '#unplaced table.unplaced td img'
var placedItemSelector = '#backpack table.backpack td img'
var equippedItemSelector = 'span.equipped'
var itemContentSelector = [unplacedItemSelector, placedItemSelector, equippedItemSelector].join(', ')


// this object encapsulates the state and behavior of the backpack
// view: the items, their locations, current page, etc.
var BackpackView = {
    current: 1, count: 1,

    init: function() {
	var self = this
	self.count = $('#backpack table.backpack tbody').length
	self.current = 1 + $('#backpack tbody').filter(':visible').index()
	$('.nav:first a').live('click', function (e) {return self.nav(e, -1)})
	$('.nav:last a').live('click',  function (e) {return self.nav(e, 1)})
	self.fastForward()
	self.navChanged()
    },

    fastForward: function() {
	var prev = BaseStorage.get('previousPage', {missing:1})
	if (prev > 1) {
	    $('#backpackPage-1').hide()
	    this.navTo(prev)
	}
    },

    nav: function(event, offset) {
	if (event.detail != 1) { return }
	var self = this
	if ((self.current + offset) > 0 && (self.current + offset <= self.count)) {
	    $('#backpackPage-' + self.current).fadeOut(250, function() {
		self.current += offset
		$('#backpackPage-' + self.current).fadeIn(250)
		self.navChanged()
	    })
	}
	return false
    },

    navTo: function(page) {
	this.current = page
	$('#backpackPage-' + page).fadeIn(250)
	this.navChanged()
    },

    navChanged: function () {
	BaseStorage.set('previousPage', this.current)
	var current = _('num'+this.current), count = _('num'+this.count)
	$('#pages').text(current + '/' + count)
	if (this.current == 1) {
	    $('.nonav:first').show()
	    $('.nav:first').hide()
	} else {
	    $('.nonav:first').hide()
	    $('.nav:first').show()
	}
	if (this.current == this.count) {
	    $('.nonav:last').show()
	    $('.nav:last').hide()
	} else {
	    $('.nonav:last').hide()
	    $('.nav:last').show()
	}
    },

    showStock: function() {
	var posIdx = 0
	var makeStock = function(idx, def) {
	    var item = {position: posIdx+=1, defindex: 0, check: idx}
	    return item
	}
	var items = $.map(SchemaTool.stock(), makeStock)
	BackpackView.placeItems(items)
	$(itemContentSelector).fadeOut().remove()
    },

    hideStock: function() {
	//var xml = this.feed
	if (true) {
	    //$(itemContentSelector).fadeOut().remove()
	    //placeIems(...)
	} else {
	    //console.warning('empty xml')
	}
    },
}


// this object encapsulates the state and behavior of the popup window
// as a whole.
var PopupView = {
    playerItems: null,
    equippedTag: '<span style="display:none" class="equipped">' + _('equipped')  + '</span>',

    init: function() {
	// chrome.extension.onRequest.addListener(this.handleRefresh)
	$('table.unplaced td:has(img)')
	    .live('mouseenter', function() {$(this).addClass('itemHover')})
	    .live('mouseleave', function() {$(this).removeClass('itemHover')})
	if (_('language_code') != 'en') {
	    $('#translation_suggestion').show()
	}
        $('body').mousedown(function(){return false}) //disable text selection
	var w = $('#controls').width()
	$('#nav span').each(function(i,x) { w+=$(x).width() })
	if (w+6< $('#backpack tr:first').width()) {
	    $('#toolbar, #stats').css('width', -6 + $('#backpack tr:first').width())
	}
	$('table.backpack td').click(this.itemClicked)
	$('#showstock').click(function() {
	    if ($(this).attr('src').indexOf('unchecked') > -1) {
		$(this).attr('src', 'media/checkbox-checked.png')
		BackpackView.showStock()
	    } else {
		$(this).attr('src', 'media/checkbox-unchecked.png')
		BackpackView.hideStock()
	    }
	})
	window.setInterval(this.updateRefreshTime, 1000)
    },

    reconfigure: function() {
	var schema = SchemaTool, items = ItemsTool
	if (schema.itemDefs && items.items && !(this.playerItems)) {
	    this.playerItems = items.items
	    this.placeItems(this.playerItems)
	    this.placeStats()
	}
    },

    itemClicked: function(event) {
	if (!event.ctrlKey) {
	    $('table.backpack td').removeClass('selected')
	}
	$(this).addClass('selected')
    },

    itemEquipped: function(item) { return (item['inventory'] & 0xff0000) != 0 },
    itemImg: function(item) {
	var src = SchemaTool.itemDefs[item['defindex']]['image_url']
	src = src ? src : 'icons/missing.png'
	return '<img style="display:none" src="' + src + '" />'
    },
    itemInv: function(item) { return item['inventory']  },
    itemPos: function(item) { return item['inventory'] & 0xFFFF },

    placeItems: function(items) {
	var newIdx = -1, self = this
	var toolDefs = SchemaTool.tools(), actionDefs = SchemaTool.actions()
	$.each(items, function(index, item) {
	    var pos = self.itemPos(item)
	    if (pos > 0) {
		var ele = $('#c' + pos + ' div').append(self.itemImg(item))
		var img = $('img:last', ele).data('node', item)
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
		if ($('table.unplaced td:not(:has(img))').length == 0) {
		    var cells = new Array(5+1).join('<td><div></div></td>')
		    $('table.unplaced').append('<tbody><tr>' + cells + '</tr></tbody>')
		}
		$('table.unplaced td:eq('+newIdx+') div').append(self.itemImg(item))
		$('table.unplaced td img:last').data('node', item)
	    }
	    // add the dohicky for item quanity
	    if ((item['defindex'] in toolDefs) || (item['defindex'] in actionDefs)) {
		img.before('<span class="quantity">' + _('' + item['quantity']) + '</span>')
		img.css('margin-top', '-1em')
	    }
	})
	$('#unplaced, hr.unplaced').toggle(newIdx > -1)
	$(itemContentSelector).fadeIn(750)
    },

    placeProfile: function(profile) {
	$('#steamID a').text(profile['personaname'])
	if (profile['avatarfull']) {
	    $('#avatar img').fadeOut().remove()
	    $('#avatar').append("<img src='" + profile['avatarfull'] + "' />")
	}
    },

    placeStats: function() {
	var totalItems = ItemsTool.items.length
	var hatItems = ItemsTool.hats()
	var metalItems = ItemsTool.metal()
	var metalWorth = metalItems.map(
	    function(v) { return (v['level']==3) ? 9 : (v['level']==2 ? 3 : 1) }).reduce(
		function(a, b) { return a+b })
	var miscItems = ItemsTool.misc()
	$('#totalItems').text(totalItems)
	$('#numHats').text(hatItems.length)
	$('#numMetal').text(metalItems.length)
	$('#metalWorth').text(metalWorth)
	$('#numMisc').text(miscItems.length)
	$('#numNormal').text(totalItems - hatItems.length - metalItems.length - miscItems.length)
	// TODO:  add counts of paint, etc.
        // give the first timing row (cache time) and the hide button
	// some extra top padding
        $("table.stats td:has(strong[class='its_msg_20']), table.stats td:has(a)")
	    .css('padding-top', '1.5em')
    },

    showMessage: function(type, message, duration) {
	if (type=='warning' && message.toLowerCase().indexOf('warning') != 0) {
	    message = _('warning') + ': ' +  _(message)
	}
	if (type=='error' && message.toLowerCase().indexOf('error') != 0) {
	    message = _('error') + ': ' +  _(message)
	}
        $('#'+type).text(message).slideDown().delay(duration||5000).slideUp()
    },

    updateRefreshTime: function() {
	var data = $('#nextFetch').data()
	if (data && data.next) {
	    var show = PopupView.formatCountDown(data.next, _('refreshing')+'...', _('second'), _('seconds'))
	} else {
	    var show = _('error')
	}
	$('#nextFetch').text(show)
    },

    formatCountDown: function(value, zero, single, plural) {
	var seconds = Math.round((value  - Date.now())/1000)
	if (seconds == 1) {
	    return '1 ' + single
	} else if (seconds == 0 || seconds < 0) {
	    return zero
	} else {
	    return seconds + ' ' + plural
	}
    },

    handleRefresh: function(request, sender, sendResponse) {
	if (request.type == 'refresh' && request.status) {
	    switch(request.status) {
	        case 'okay':
		    // the length check won't hurt if the backpack is totally
                    // empty, and it will help if the page is just loading
                    // via the options div.
                    if (request.updated || $('#backpack img').length==0) {
	                BackpackView.init()
		    } else {
			PopupView.putTimings()
			PopupView.showMessage('information', _('refresh_nochange'))
		    }
	            break
	        case 'warning':
                    PopupView.showMessage('warning', _(request.message))
		    break
	        case 'abort':
	        case 'error':
	        case 'exception':
		    PopupView.showMessage('error', _(request.message))
	            break
	        default:
	            console.log('unknown refresh msg')
	    }
	}
	sendResponse({})
    },

    putTimings: function() {
	chrome.extension.sendRequest(
	    {type: 'driver', message: 'params'},
	    function(response) {
	        $('#lastFetch').text(Date(response.pollLast))
		$('#nextFetch').data({'next':response.pollNext})
		var duration = response.pollDuration
		$('#requestTime').text(duration==0 ? 'Cached' : duration + ' ms')
		if (response.requestError) {
		    PopupView.showMessage('warning', _('from_cache'))
		}
	    })
    },
}


var TooltipView = {
    extraLineMap: {0:'alt', 1:'positive', 2:'negative'},
    effectTypeMap: {negative: 'negative', neutral:'alt', positive: 'positive'},
    prefixCheckMap: {3:'vint', 5:'unusual', 7:'com', 8:'dev', 9:'self'},
    formatCalcMap: {
	// for values that translate into percentages and are
	// represented by that percentage (eg. changes to the blast
	// radius).  good test is Dead Ringer.
	value_is_percentage: function (v) { return Math.round(v*100 - 100) },

	//for values that translate into percentages and are
	//represented by the difference in that percentage from 100%
	//(eg. changes to the fire rate), good test is Ubersaw.
	value_is_inverted_percentage: function (v) { return Math.round(100 - (v*100)) },

	//for values that are a specific number (eg. max health
	//bonuses and bleed durations) and boolean attributes (such as
	//The Sandman's ability to knock out balls).
	// good test is Scottish Resistance. TEST SANDMAN
	value_is_additive: ident,

	// for values that add to an existing percentage (e.g. The
	// Ubersaw adding 25% charge every hit).  good test is the Ubersaw.
	value_is_additive_percentage: function (v) { return Math.round(100*v) },

	// for values that are a unix timestamp
	value_is_date: function (v) { return new Date(v * 1000) },

	// for values that are a particle effect type.
	value_is_particle_index: ident,

	// for values that are a Steam account ID, e.g., 'Gift from
	// %s1' Add 1197960265728 to this value and prefix the string
	// representation of the result with "7656" for a 64 bit Steam
	// Community ID
	value_is_account_id: function (v) { return '7656' + (v + 1197960265728) },

	// possibly for values that get applied if a condition is true (e.g. player is on fire)
	value_is_or: ident,
    },

    init: function() {
	$('table.backpack td, table.unplaced td')
	    .live('mouseenter', this.show)
	    .live('mouseleave', this.hide)
    },

    formatSchemaAttr: function(def, val) {
	var line = def['description_string'].replace(/\n/gi, '<br />')
	// we only look for (and sub) one '%s1'; that's the most there is (as of oct 2010)
	if (line.indexOf('%s1') > -1) {
	    var fCalc = this.formatCalcMap[def['description_format']]
	    line = line.replace('%s1', fCalc(val))
	}
	return line.indexOf('Attrib_') > -1 ? '' : line
    },

    hide: function(event) {
	$('#tooltip').hide().css({left: 0, top: 0})
    },

    show: function(event) {
	var cell = $(this), tooltip = $('#tooltip')
	if (!cell.children().length) { return }
	try {
	    var playerItem = $($('img', cell).data('node'))[0], quals = SchemaTool.qualityMap()
	    var type = playerItem['defindex'] // empty cells will raise an exception
	} catch (e) {
	    return
	}
	var schemaItem = SchemaTool.itemDefs[type]
	var self = TooltipView, level = playerItem['level'], desc = schemaItem['item_name']
	// this doesn't match the game behavior exactly, but it is nice.
	var levelType = schemaItem['item_type_name'].replace('TF_Wearable_Hat', _('Hat'))
	var h4 = $('#tooltip h4')

	// hide the darn thing first
	self.hide()

	// set the main title and maybe adjust its style and prefix
	h4.text(desc)
	h4.attr('class', 'quality-'+playerItem['quality'])
	if (playerItem['quality'] in self.prefixCheckMap) {
	    h4.text(quals[playerItem['quality']] + ' ' + h4.text())
	}

	// set the level
	$('#tooltip .level').text(_({key:'level', subs:[level, levelType]}))

	// clear and set the extra text
	$.each(self.extraLineMap, function(k, v) { $('#tooltip .'+ self.extraLineMap[k]).text('') })

	if (playerItem['attributes']) {
	    $.each(playerItem['attributes']['attribute'], function(aidx, itemAttr) {
		var attrDef = SchemaTool.attributesById[itemAttr['defindex']]
		console.log(playerItem, itemAttr, attrDef)
		var extra = self.formatSchemaAttr(attrDef, itemAttr['value'])
		var etype = self.effectTypeMap[attrDef['effect_type']]
		var current = $('#tooltip .' + etype).html()
		$('#tooltip .' + etype).html( current ? current + '<br />' + extra : extra)
	    })
	}
	if (schemaItem['attributes']) {
	    $.each(schemaItem['attributes']['attribute'], function(aidx, schemaAttr) {
		var attrDef = SchemaTool.attributesByName[schemaAttr['name']]
		console.log(playerItem, schemaAttr, attrDef)
		if (!attrDef) { return }
		if (attrDef['description_string']=='unused') { return }
		if (attrDef['attribute_class']=='set_employee_number') { return }
		var extra = self.formatSchemaAttr(attrDef, schemaAttr['value'])
		var etype = self.effectTypeMap[attrDef['effect_type']]
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
    },
}

// this object abstracts the external interface to the entire popup window.  
// it's more th
var Popup = {
    schema: {}, profile: {}, items: {},

    init: function() {
	i18nize()
	BaseStorage.profileId() ? this.mainInit() : this.emptyInit()
    },

    mainInit: function() {
	$.map([PopupView, TooltipView, BackpackView], function(c) { c.init() })
	chrome.extension.sendRequest(
	    {type: 'getSchema', lang: _('language_code')},
	    function (schema) {
                SchemaTool.init(schema)
		PopupView.reconfigure()
		console.log('schema tool loaded:', SchemaTool)
	    })
	chrome.extension.sendRequest(
	    {type: 'getPlayerItems', id64: BaseStorage.profileId()},
	    function (items) {
		ItemsTool.init(items)
		PopupView.reconfigure()
		console.log('items tool loaded:', ItemsTool)
	    })
	chrome.extension.sendRequest(
	    {type: 'getPlayerProfile', id64: BaseStorage.profileId()},
	    function (profile) {
		Popup.profile = JSON.parse(profile)
		PopupView.placeProfile(Popup.profile)
		PopupView.reconfigure()
		console.log('player profile:', Popup.profile)
	    })
	console.log('Popup.mainInit complete')
    },

    emptyInit: function() {
        $('#main').fadeOut('fast')
	$('#unknownProfile').fadeIn('fast')
	optionsInit(function() {
	    $('#unknownProfile').fadeOut('fast', function() {
	        $('#main').fadeIn().delay(1000)
		Popup.mainInit()
	        PopupView.requestRefresh()
	    })
	})
    },

    requestRefresh: function(event) {
	$('html body').animate({scrollTop: 0})
	//chrome.extension.sendRequest({type:'driver', message:'refresh'}, function(response) {})
	return false
    },

    showStats: function() {
	$('#stats').slideDown(400, function() {
	    $("#controls a:contains('Stats')").fadeOut()
	    var ele = $('table.backpack')
	    $('html body').animate({scrollTop: ele.position().top + ele.height()})
	})
	return false
    },

    hideStats: function() {
	$('#stats').slideUp(400, function() {
	    $("#controls a:contains('Stats')").fadeIn()
	    $('html body').animate({scrollTop: 0})
	})
	return false
    },
}


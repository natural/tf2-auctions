//
// BUG: this is pretty minor, but when the hash is updated with a
//      cursor (e.g., next page) and then the user browses away and
//      returns via the back button, the prev/next buttons do not get
//      configured correctly.


var init = function() {


oo.config({prefix: '#search-', auth: {settings: 1, complete: 0}})


var initBackpack = function(schema, bpSlug, chSlug, afterDrop) {
    var items = schema.tradableBackpack(),
        bpTool = oo.backpack.itemTool({
	    items: items,
            slug: bpSlug,
            navigator: true,
            toolTips: true,
	    select: true,
	    outlineHover: true,
	    filters: true,
	    rowGroups: oo.backpack.pageGroup.slim(Math.round(items.length*0.01) / 0.01, 4),
	    altOrdering: true
        }),
        chTool = oo.backpack.chooserTool({
	    backpackSlug: bpSlug,
	    chooserSlug: chSlug,
	    copy: true,
	    selectDeleteHover: true,
	    afterDropMove: afterDrop
        })
    bpTool.init()
    chTool.init()
},


searchModel = oo.model.schema.extend({
    init: function(view) {
	var self = this, q = oo.util.hash()
	self.view = view
	view.model = self
        self.searchStack = self.makeStack()
	return oo.model.schema.init.apply(self, arguments)
	    .success(function(s) {
		oo.data.search({suffix: '?' + q})
		    .success(function(rs) {
			self.searchResults = rs
			self.view.putControls(rs.filters, rs.orders)
			self.afterInit(self, q)
			self.view.joinSearch(rs, q, true)
		    })
	    })
    },

    makeStack: function() {
	var stack = [],
	    self = this,
	    changed = function() { stack = [] },
	    chooserQuery = function(sel, pfx) {
	        var qs = $(sel)
		    .map(function(k, v) { return '{0}={1}'.fs(pfx, $(v).data('node')['defindex']) })
		    .toArray()
	        return qs.join('&')
	    },
	    optionsQuery = function() {
	        var qs = self.view.filterOptions().map(function(i,v) {
	            return '{0}={1}'.fs($(v).attr('name'), $(v).attr('checked') ? 'on' : 'off')
	        })
	        qs.push('{0}={1}'.fs('sort', self.view.sortOption().attr('value')))
	        return qs.toArray().join('&')
            }
        return {
	    push: function(value) { stack.push(value) },
	    pop: function() { return stack.pop() },
	    depth: function() { return stack.length },
	    chooserChanged: function(selector, qprefix) {
	        changed()
	        var q = chooserQuery(selector, qprefix)
	        oo.data.search({suffix: '?' + q})
		    .success(function(rs) { self.view.joinSearch(rs, q) })
	    },
	    optionChanged: function() {
	        changed()
	        var q = optionsQuery()
	        oo.data.search({suffix: '?' + q})
		    .success(function(rs) { self.view.joinSearch(rs, q) })
	    }
        }
    }
}),


searchView = oo.view.extend({
    contentWidths: {controls:null, results:null},

    configNext: function(results) {
	var self = this
	var navNext = function(e) {
	    oo('some-listings').text('Loading...')
	    oo('nav-extra').slideUp(function() {
	        oo('listings').slideUp(function() {
		    self.model.searchStack.push(results)
		    var innerNext = function(rs) {
		        window.location.hash = results.next_qs
		        self.putListings(rs)
		    }
		    oo.data.search({suffix: '?'+results.next_qs})
			.success(innerNext)
	        })
	    })
	    return false
        }
        var navNextBottom = function(e) {
	    $('body').scrollTopAni()
	    navNext(e)
	    return false
        }
        oo('next').unbind().click(navNext)
        oo('bottom-next').unbind().click(navNextBottom)
    },

    configPrev: function(results) {
	var self = this
	var navPrev = function(e) {
	    oo('some-listings').text('Loading...')
	    oo('nav-extra').slideUp(function() {
	        oo('listings').slideUp(function() {
		    var rs = self.model.searchStack.pop()
		    window.location.hash = rs.next_qs
		    self.putListings(rs)
	        })
	    })
	    return false
        }
        var navPrevBottom = function(e) {
	    $('body').scrollTopAni()
	    navPrev(e)
	    return false
        }
        oo('prev').unbind().click(navPrev)
        oo('bottom-prev').unbind().click(navPrevBottom)
    },

    joinSearch: function(search, query, init) {
	var self = this
	if (query) { window.location.hash = query }
        this.putListings(search, init)
        this.message().fadeAway()
        oo('controls').fadeIn('fast')
        oo('listings').fadeIn('fast')
        self.contentWidths.controls = oo('controls').width()
        self.contentWidths.results = oo('listing-pod').width()
    },

    putControls: function(filters, orders) {
	if (! oo('filter-inputs').children().length) {
	    $.each(filters, function(idx, filter) {
		if (!(filter[0])) {
		    var item = '<br />'
		} else {
		    var item = '<input type="checkbox" name="{0}" />{1}<br />'.fs(filter[0], filter[1])
	        }
		oo('filter-inputs').append(item)
	    })
		}
        if (!oo('sort-inputs').children().length) {
	    $.each(orders, function(idx, order) {
	        var input = '<input type="radio" name="sort" value="{0}" />{1}<br />'.fs(order[0], order[1])
	        oo('sort-inputs').append(input)
	    })
	    $('input[name="sort"]').first().click()
        }
    },

    putListings: function(results, init) {
	var self = this
	oo('listings div.listing-seed').remove()
	if (!results.listings.length) {
	    oo('no-listings').text('Nothing found.  You should add a listing.').show()
	    oo('some-listings').hide()
	    oo('nav').fadeAway()
	    oo('bottom-nav').fadeAway()
	    return
	} else {
	    oo('no-listings').hide()
	    oo('some-listings').text('Results:').show()
	    oo('nav').fadeBack()
	    oo('bottom-nav').fadeBack()
	}
	var displays = oo.util.listing.many({
	    listings: results.listings, // does not filter out
					// featured listings because
					// they may match the search
	    prototype: oo('listings div.prototype')
	})
	oo.util.listing.put(displays, oo('listings'))

	if (results.more) {
	    self.configNext(results)
	    oo('next-link, bottom-next-link').show()
	    oo('next-none, bottom-next-none').hide()
	} else {
	    oo('next-link, bottom-next-link').hide()
	    oo('next-none, bottom-next-none').show()
	}
	if (self.model.searchStack.depth()) {
	    self.configPrev(results)
	    oo('prev-link, bottom-prev-link').show()
	    oo('prev-none, bottom-prev-none').hide()
	} else {
	    oo('prev-link, bottom-prev-link').hide()
	    oo('prev-none, bottom-prev-none').show()
	}
	if (init) { oo.util.listing.putFeatured(results) }
	oo.data.schema()
            .success(function(schema) {
		var put = function(s) {
		    oo.util.schema(schema).putImages(s, null, {fast:false}) 
		}
	        oo.model.auth.extend({suffix: '?settings=1'}).init()
	            .success(function(p) { put(p.settings) })
	            .error(function() { put() })
            })
	$('div.listing-seed td.item-view div:empty').parent().remove()
	oo('listings').slideDown()
	oo('nav-extra').fadeIn()
    },

    searchTitle: function(v) {
	return oo('title').text(v)
    },

    filterOptions: function() {// should grow a parameter and set checkboxes from it
	return oo('controls input[type="checkbox"]')
    },

    sortOption: function() {
	return oo('controls input[type="radio"]:checked')
    },

    showBasic: function() {
        this.searchTitle('Search Listings')
	oo('advanced-pod').slideUp()
	oo('reverse-pod').slideUp()
	oo('advanced-link-pod, sorts, filters, reverse-link-pod').fadeBack()
	oo('basic-link-pod').fadeOut()
	oo('listing-pod').animate({width: this.contentWidths.results}, 400)
	oo('controls').animate({width: this.contentWidths.controls} ,400)
	oo('controls-nav').fadeIn()
    },

    showAdvanced: function() {
	var self = searchView
	if (!self.showAdvanced.initOnce) {
	    self.showAdvanced.initOnce = true
	    var chooserChanged = function () {
		oo('some-listings').text('Loading...')
		self.model.searchStack.chooserChanged('#bp-chooser-advanced-search img', 'di')
	    },
	    copyToSearchChoice = function(event) {
		var source = $(event.target)
		var target = $('#bp-chooser-advanced-search td div:empty').first()
		if (!target.length) { return }
		var clone = source.clone()
		clone.data('node', source.data('node'))
		target.prepend(clone)
		chooserChanged()
	    },
	    removeSearchChoice = function(e) {
		$('img', this).fadeOut().remove()
		$(this).removeClass('selected selected-delete')
		chooserChanged()
	    },
	    resetAdvancedSearch = function () {
		$.each($('#bp-chooser-advanced-search td'), function(idx, cell) {
		    $('img', cell).fadeOut().remove()
		    $(cell).removeClass('selected selected-delete')
		})
		chooserChanged()
	    }
	    initBackpack(self.model.tool, 'ac', 'advanced-search', chooserChanged)
	    $('#bp-ac td div img').live('dblclick', copyToSearchChoice)
	    $('#bp-chooser-advanced-search td').live('dblclick', removeSearchChoice)
	    oo('advanced-reset').click(resetAdvancedSearch)
	}
        self.searchTitle('Advanced Search')
	oo('advanced-link-pod, reverse-link-pod, sorts, filters, controls-nav').fadeOut()
	oo('basic-link-pod').fadeIn()
	var width = oo('pod').width()
	$('#advanced-search-pod').show()
	oo('controls').animate({width:400} ,400)
	oo('listing-pod').animate({width:width-450}, 400, function() {
	    oo('advanced-pod').show(function () {
	        $('#bp-nav-ac').width($('#bp-ac .bp-1').width() - 10)
            })
	})
    },

    showReverse: function() {
        var self = searchView
	if (!self.showReverse.initOnce) {
	    self.showReverse.initOnce = true
	    var chooserChanged = function () {
		oo('some-listings').text('Loading...')
		self.model.searchStack.chooserChanged('#bp-chooser-reverse-search img', 'mb')
	    },
	    copyToSearchChoice = function(event) {
		var source = $(event.target)
		var target = $('#bp-chooser-reverse-search td div:empty').first()
		if (!target.length) { return }
		var clone = source.clone()
		clone.data('node', source.data('node'))
		target.prepend(clone)
		chooserChanged()
	    },
	    removeSearchChoice = function(e) {
		$('img', this).fadeOut().remove()
		$(this).removeClass('selected selected-delete')
		chooserChanged()
	    },
	    resetReverseSearch = function () {
		$.each( $('#bp-chooser-reverse-search td'), function(idx, cell) {
			    $('img', cell).fadeOut().remove()
			    $(cell).removeClass('selected selected-delete')
			})
		chooserChanged()
	    }
	    initBackpack(self.model.tool, 'rv', 'reverse-search', chooserChanged)
	    $('#bp-rv td div img').live('dblclick', copyToSearchChoice)
	    $('#bp-chooser-reverse-search td').live('dblclick', removeSearchChoice)
	    oo('reverse-reset').click(resetReverseSearch)
	}
        self.searchTitle('Reverse Search')
	oo('advanced-link-pod, reverse-link-pod, sorts, filters, controls-nav').fadeOut()
	oo('basic-link-pod').fadeIn()
	var width = oo('pod').width()
	$('#reverse-search-pod').show()
	oo('controls').animate({width:400} ,400)
	oo('listing-pod').animate({width:width-450}, 400, function() {
	    oo('reverse-pod').show(function () {
	        $('#bp-nav-rv').width($('#bp-rv .bp-1').width() - 10)
	    })
	})
    }
}),


searchController = oo.controller.extend({
    model: searchModel,
    view: searchView,

    init: function() {
	this.model.afterInit = this.afterInit
	return oo.controller.init.apply(this, arguments)
    },

    afterInit: function(model, hash) {
	if (hash) {
	    $.map(hash.split('&'), function(x) {
		var v = x.split('=')
		$('input[name={0}]'.fs(v[0])).attr('checked', v[1] == 'on')
	    })
	}
	$('#search-controls input[type="checkbox"]').live('change', function() {
	    model.searchStack.optionChanged()
	})
	$('#search-controls input[type="radio"]').live('change', function() {
	    model.searchStack.optionChanged()
	})
    },

    '#search-reverse-link click' : function(e) {
	e.controller.view.showReverse(e)
    },

    '#search-advanced-link click' : function(e) {
	e.controller.view.showAdvanced(e)
    },

    '#search-basic-link click' : function(e) {
	e.controller.view.showBasic(e)
    },

    '#featured-listings div.listing-seed div.navs span.nav.next live:click' : function(e) {
	e.controller.view.navFeatured(1)
    },

    '#featured-listings div.listing-seed div.navs span.nav.prev live:click' : function(e) {
	e.controller.view.navFeatured(-1)
    },

    'ready' : function() {
	$('#content-site-categories').fadeOut()
	this.view.message('Loading...')
    }

})

}
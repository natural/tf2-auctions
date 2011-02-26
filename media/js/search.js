// BUG:  find-fast links that target /search aren't working correctly

//(function() {

oo.config({prefix: '#search-', auth: {settings: 1, complete: 0}})

//
// creates and initializes a backpack and chooser tool.
//
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


//
// Model for searches.
//
searchModel = oo.model.schema.extend({
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
    },

    init: function(view) {
	var self = this, q = self.hash()
	self.view = view
	view.model = self
        self.searchStack = self.makeStack()
	return oo.model.schema.init.apply(self, arguments)
	    .success(function(s) {
		oo.data.search({suffix: '?' + q})
		    .success(function(rs) {
			self.searchResults = rs
			self.view.joinSearch(rs, q, true)
		    })
	    })
    },

    hash: function() { return location.hash.slice(1) },
}),


//
// View for searches.
//
searchView = oo.view.searchbase.extend({
    contentWidths: {controls:null, results:null},

    init: function(model, config) {
        $('#content-site-categories').hide()
	oo.view.schema.init(model, config)
    },

    configNext: function(results) {
	var self = this
	var navNext = function(e) {
	    $('#search-some-listings').text('Loading...')
	    $('#search-nav-extra').slideUp(function() {
	        $('#search-listings').slideUp(function() {
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
        $('#search-next').unbind().click(navNext)
        $('#search-bottom-next').unbind().click(navNextBottom)
    },

    configPrev: function(results) {
	var self = this
	var navPrev = function(e) {
	    $('#search-some-listings').text('Loading...')
	    $('#search-nav-extra').slideUp(function() {
	        $('#search-listings').slideUp(function() {
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
        $('#search-prev').unbind().click(navPrev)
        $('#search-bottom-prev').unbind().click(navPrevBottom)
    },

    joinSearch: function(search, query, init) {
	var self = this
	if (query) { window.location.hash = query }
	if (! $('#search-filter-inputs').children().length) {
	    $.each(search.filters, function(idx, filter) {
		if (!(filter[0])) {
		    var item = '<br />'
		} else {
		    var item = '<input type="checkbox" name="{0}" />{1}<br />'.fs(filter[0], filter[1])
	        }
		$('#search-filter-inputs').append(item)
	    })
		}
        if (!$('#search-sort-inputs').children().length) {
	    $.each(search.orders, function(idx, order) {
	        var input = '<input type="radio" name="sort" value="{0}" />{1}<br />'.fs(order[0], order[1])
	        $('#search-sort-inputs').append(input)
	    })
	    $('input[name="sort"]').first().click()
        }
        this.putListings(search, init)
        this.message().fadeAway()
        $('#search-controls').fadeIn('fast')
        $('#search-listings').fadeIn('fast')
        self.contentWidths.controls = $('#search-controls').width()
        self.contentWidths.results = $('#search-listing-pod').width()
    },

    putListings: function(results, init) {
	var self = this
	$('#search-listings div.listing-seed').remove()
	if (!results.listings.length) {
	    $('#search-no-listings').text('Nothing found.  You should add a listing.').show()
	    $('#search-some-listings').hide()
	    $('#search-nav').fadeAway()
	    $('#search-bottom-nav').fadeAway()
	    return
	} else {
	    $('#search-no-listings').hide()
	    $('#search-some-listings').text('Results:').show()
	    $('#search-nav').fadeBack()
	    $('#search-bottom-nav').fadeBack()
	}
	var proto = $('#search-listings div.prototype'),
	    target = $('#search-listings')
	$.each(results.listings, function(idx, listing) {
            var clone = proto.clone()
		       .addClass('listing-seed')
		       .removeClass('null prototype')
	    self.putListing(listing, clone, target)
	})
	if (results.more) {
	    self.configNext(results)
	    $('#search-next-link, #search-bottom-next-link').show()
	    $('#search-next-none, #search-bottom-next-none').hide()
	} else {
	    $('#search-next-link, #search-bottom-next-link').hide()
	    $('#search-next-none, #search-bottom-next-none').show()
	}
	if (self.model.searchStack.depth()) {
	    self.configPrev(results)
	    $('#search-prev-link, #search-bottom-prev-link').show()
	    $('#search-prev-none, #search-bottom-prev-none').hide()
	} else {
	    $('#search-prev-link, #search-bottom-prev-link').hide()
	    $('#search-prev-none, #search-bottom-prev-none').show()
	}
	if (init) { self.joinFeatured(results) }
	oo.data.schema({})
            .success(function(schema) {
	        oo.model.auth.extend({suffix: '?settings=1'}).init()
	            .success(function(profile) { oo.util.schema(schema).putImages(profile.settings) })
	            .error(function() { oo.util.schema(schema).putImages() })
            })
	$('div.listing-seed td.item-view div:empty').parent().remove()
	$('#search-listings').slideDown()
	$('#search-nav-extra').fadeIn()
    },

    putListing: function(listing, clone, target) {
	if (listing.description) {
	    $('.listing-description', clone).text(listing.description)
	} else {
	    $('.listing-description-label', clone).empty()
	    $('.listing-description', clone).empty()
	}
	oo.util.profile.putAvatar(listing.owner, $('.listing-owner-seed', clone))
	$('.bid-count-seed', clone).text(listing.bid_count || '0')
        var next = 0
	$.each(listing.items, function(index, item) {
	   $($('.item-view div', clone)[next]).append($.toJSON(item))
	   next += 1
        })
	if (listing.min_bid.length) {
	    next = 0
	    $.each(listing.min_bid, function(index, defindex) {
	        $($('.search-listing-view-min-bid .item-view div', clone)[next])
                    .append($.toJSON({defindex:defindex, quality:6}))
		    next += 1
            })
            $('.search-listing-view-min-bid', clone).removeClass('null')
	} else {
            $('.search-listing-view-min-bid', clone).hide()
	}
	$('.listing-view-link a', clone).attr('href', '/listing/{0}'.fs(listing.id))

	$('.listing-view-link', clone)
	    .append('<span class="mono">Expires: {0}</span>'.fs(oo.util.dformat(listing.expires)))
	if (listing.featured) {clone.addClass('featured')}
	target.append(clone)
    },

    searchTitle: function(v) {
	return $('#search-title').text(v)
    },

    filterOptions: function() {// should grow a parameter and set checkboxes from it
	return $('#search-controls input[type="checkbox"]')
    },

    sortOption: function() {
	return $('#search-controls input[type="radio"]:checked')
    },

    showBasic: function() {
        this.searchTitle('Search Listings')
	$('#search-advanced-pod').slideUp()
	$('#search-reverse-pod').slideUp()
	$('#search-advanced-link-pod, #search-sorts, #search-filters, #search-reverse-link-pod').fadeBack()
	$('#search-basic-link-pod').fadeOut()
	$('#search-listing-pod').animate({width: this.contentWidths.results}, 400)
	$('#search-controls').animate({width: this.contentWidths.controls} ,400)
	$('#search-controls-nav').fadeIn()
    },

    showAdvanced: function() {
	var self = searchView
	if (!self.showAdvanced.initOnce) {
	    self.showAdvanced.initOnce = true
	    var chooserChanged = function () {
		$('#search-some-listings').text('Loading...')
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
	    $('#search-advanced-reset').click(resetAdvancedSearch)
	}
        self.searchTitle('Advanced Search')
	$('#search-advanced-link-pod, #search-reverse-link-pod, #search-sorts, #search-filters, #search-controls-nav').fadeOut()
	$('#search-basic-link-pod').fadeIn()
	var width = $('#search-pod').width()
	$('#advanced-search-pod').show()
	$('#search-controls').animate({width:400} ,400)
	$('#search-listing-pod').animate({width:width-450}, 400, function() {
	    $('#search-advanced-pod').show(function () {
	        $('#bp-nav-ac').width($('#bp-ac .bp-1').width() - 10)
            })
	})
    },

    showReverse: function() {
        var self = searchView
	if (!self.showReverse.initOnce) {
	    self.showReverse.initOnce = true
	    var chooserChanged = function () {
		$('#search-some-listings').text('Loading...')
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
	    $('#search-reverse-reset').click(resetReverseSearch)
	}
        self.searchTitle('Reverse Search')
	$('#search-advanced-link-pod, #search-reverse-link-pod, #search-sorts, #search-filters, #search-controls-nav').fadeOut()
	$('#search-basic-link-pod').fadeIn()
	var width = $('#search-pod').width()
	$('#reverse-search-pod').show()
	$('#search-controls').animate({width:400} ,400)
	$('#search-listing-pod').animate({width:width-450}, 400, function() {
	    $('#search-reverse-pod').show(function () {
	        $('#bp-nav-rv').width($('#bp-rv .bp-1').width() - 10)
	    })
	})
    }
}),


searchController = oo.controller.extend({
    model: searchModel,
    view: searchView,

    hash: function() {
	return location.hash.slice(1)
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

    '#search-controls input[type="checkbox"] live:click' : function(e) {
	e.controller.model.searchStack.optionChanged(e)
    },

    '#search-controls input[type="radio"] live:click' : function(e) {
         e.controller.model.searchStack.optionChanged(e)
    },

    '#featured-listings div.listing-seed div.navs span.nav.next live:click' : function(e) {
	e.controller.view.navFeatured(1)
    },

    '#featured-listings div.listing-seed div.navs span.nav.prev live:click' : function(e) {
	e.controller.view.navFeatured(-1)
    },

    'ready' : function() {
	var self = this, q = self.hash()
	self.view.message('Loading...')
	if (q) {
	    window.setTimeout(function() {
		$.each(q.split('&'), function(idx, pair) {
	        try {
		    var p = pair.split('='), name = p[0], val = p[1]
		    $('input[name={0}]'.fs(name)).attr('checked', val=='on')
	        } catch (e) {  console.error('error:', e) }
	         })
	    }, 500)
        }
    }
})


//})()

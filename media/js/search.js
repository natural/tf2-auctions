var $$ = function(suffix, next) { return $('#search-'+suffix, next) }
var contentWidths = {controls:null, results:null}


// returns a mapping of functions closed over a stack of searches.
// the stack acts like an ordered cache and helps reduce the number of
// network requests.
var makeSearchStack = function() {
    var stack = []
    var changed = function() {
	stack = []
	$$('some-listings').text('Loading...')
    }

    // returns search parameters (as a query string) for the current
    // advanced search.  accounts for item indexes only.
    var chooserQuery = function(sel, pfx) {
	var qs = $(sel)
            .map(function(k, v) { return '{0}={1}'.fs(pfx, $(v).data('node')['defindex']) })
            .toArray()
	return qs.join('&')
    }

    // returns search parameters (as a query string) for the current
    // options.  accounts for search filters and search order only.
    var optionsQuery = function() {
	var qs = $$('controls input[type="checkbox"]').map(function(i,v) {
	    return '{0}={1}'.fs($(v).attr('name'), $(v).attr('checked') ? 'on' : 'off')
	})
	qs.push('{0}={1}'.fs('sort', $$('controls input[type="radio"]:checked').attr('value')))
	return qs.toArray().join('&')
    }

    return {
	chooserChanged: function(selector, qprefix) {
	    changed()
	    var q = chooserQuery(selector, qprefix)
	    new SearchLoader({
		success: function(rs) { searchOkay(rs, q) },
		suffix: '?' + q
	    })
	},
	optionChanged: function() {
	    changed()
	    var q = optionsQuery()
	    new SearchLoader({
		success: function(rs) { searchOkay(rs, q) },
		suffix: '?' + q
	    })
	},
	push: function(value) { stack.push(value) },
	pop: function() { return stack.pop() },
	depth: function() { return stack.length	}
    }
}


// one and only global search stack
var searchStack = makeSearchStack()


// advanced search backpack tool.  creates and initializes the items
// tool and the chooser.
var SearchBackpackTool = function(schema, bpSlug, chSlug, afterDrop) {
    var bpTool = new BackpackItemsTool({
	items: schema.tradableBackpack(),
	slug: bpSlug,
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	filters: true
    })
    var chTool = new BackpackChooserTool({
	backpackSlug: bpSlug,
	chooserSlug: chSlug,
	copy:true,
	selectDeleteHover: true,
	afterDropMove: afterDrop
    })
    bpTool.init()
    chTool.init()
}


// displays the basic search fields and hides the advanced fields.
var showBasicSearch = function() {
    $$('title').text('Search Listings')
    $$('advanced-pod').slideUp()
    $$('reverse-pod').slideUp()
    $('#search-advanced-link-pod, #search-sorts, #search-filters, #search-reverse-link-pod').fadeBack()
    $$('basic-link-pod').fadeOut()
    $$('listing-pod').animate({width: contentWidths.results}, 400)
    $$('controls').animate({width: contentWidths.controls} ,400)
    $$('controls-nav').fadeIn()
}


// displays the advanced search fields and hides the basic fields.
var showAdvancedSearch = function() {
    if (!showAdvancedSearch.initOnce) {
	showAdvancedSearch.initOnce = true
	var schema = new SchemaTool()
	var chooserChanged = function () {
	    searchStack.chooserChanged('#bp-chooser-advanced-search img', 'di')
	}
	var advSearchTool = new SearchBackpackTool(schema, 'ac', 'advanced-search', chooserChanged)
	var copyToSearchChoice = function(event) {
	    var source = $(event.target)
	    var target = $('#bp-chooser-advanced-search td div:empty').first()
	    if (!target.length) { return }
	    var clone = source.clone()
	    clone.data('node', source.data('node'))
	    target.prepend(clone)
	    chooserChanged()
	}
	var removeSearchChoice = function(e) {
	    $('img', this).fadeOut().remove()
	    $(this).removeClass('selected selected-delete')
	    chooserChanged()
	}
	var resetAdvancedSearch = function () {
	    $.each( $('#bp-chooser-advanced-search td'), function(idx, cell) {
		$('img', cell).fadeOut().remove()
		$(cell).removeClass('selected selected-delete')
	    })
	    chooserChanged()
	}
	$('#bp-ac td div img').live('dblclick', copyToSearchChoice)
	$('#bp-chooser-advanced-search td').live('dblclick', removeSearchChoice)
	$$('advanced-reset').click(resetAdvancedSearch)
    }
    $$('title').text('Advanced Search')
    $('#search-advanced-link-pod, #search-reverse-link-pod, #search-sorts, #search-filters, #search-controls-nav').fadeOut()
    $$('basic-link-pod').fadeIn()
    var width = $$('pod').width()
    $('#advanced-search-pod').show()
    $$('controls').animate({width:400} ,400)
    $$('listing-pod').animate({width:width-450}, 400, function() {
	$$('advanced-pod').show(function () {
	    $('#bp-nav-ac').width($('#bp-ac .bp-1').width() - 10)
	})
    })
}


// displays the reverse search fields and hides the basic fields.
var showReverseSearch = function() {
    if (!showReverseSearch.initOnce) {
	showReverseSearch.initOnce = true
	var schema = new SchemaTool()
	var chooserChanged = function () {
	    searchStack.chooserChanged('#bp-chooser-reverse-search img', 'mb')
	}
	var advSearchTool = new SearchBackpackTool(schema, 'rv', 'reverse-search', chooserChanged)

	var copyToSearchChoice = function(event) {
	    var source = $(event.target)
	    var target = $('#bp-chooser-reverse-search td div:empty').first()
	    if (!target.length) { return }
	    var clone = source.clone()
	    clone.data('node', source.data('node'))
	    target.prepend(clone)
	    chooserChanged()
	}

	var removeSearchChoice = function(e) {
	    $('img', this).fadeOut().remove()
	    $(this).removeClass('selected selected-delete')
	    chooserChanged()
	}

	var resetReverseSearch = function () {
	    $.each( $('#bp-chooser-reverse-search td'), function(idx, cell) {
		$('img', cell).fadeOut().remove()
		$(cell).removeClass('selected selected-delete')
	    })
	    chooserChanged()
	}
	$('#bp-rv td div img').live('dblclick', copyToSearchChoice)
	$('#bp-chooser-reverse-search td').live('dblclick', removeSearchChoice)
	$$('reverse-reset').click(resetReverseSearch)
    }
    $$('title').text('Reverse Search')
    $('#search-advanced-link-pod, #search-reverse-link-pod, #search-sorts, #search-filters, #search-controls-nav').fadeOut()
    $$('basic-link-pod').fadeIn()
    var width = $$('pod').width()
    $('#reverse-search-pod').show()
    $$('controls').animate({width:400} ,400)
    $$('listing-pod').animate({width:width-450}, 400, function() {
	$$('reverse-pod').show(function () {
	    $('#bp-nav-rv').width($('#bp-rv .bp-1').width() - 10)
	})
    })
}


// builds an element for a listing.  writes formatted data from the
// given listing to the given clone (prototype copy).
var putListing = function(listing, clone) {
    var putil = new ProfileTool(listing.owner)

    if (listing.description) {
	$('.listing-description', clone).text(listing.description)
    } else {
	$('.listing-description-label', clone).empty()
	$('.listing-description', clone).empty()
    }

    $('.listing-owner', clone).text(listing.owner.personaname)
    $('.listing-owner', clone).parent().attr('href', putil.defaultUrl())
    $('.listing-avatar', clone)
	.attr('src', listing.owner.avatar)
    $('.listing-avatar', clone).parent().attr('href', putil.defaultUrl())

    new StatusLoader({
	suffix: listing.owner.id64,
	success: function(status) {
	    $('.listing-avatar', clone)
		.addClass('profile-status ' + status.online_state)
	}
    })

    $('.bid-count-seed', clone)
	.text(listing.bid_count || '0') // bid_count because bids aren't fetched.

    var next = 0
    $.each(listing.items, function(index, item) {
	$( $('.item-view div', clone)[next]).append( $.toJSON(item) )
	next += 1
    })

    if (listing.min_bid.length) {
	next = 0
	$.each(listing.min_bid, function(index, defindex) {
            $( $('.search-listing-view-min-bid .item-view div', clone)[next] ).append(
		$.toJSON({defindex:defindex, quality:6})
	    )
	    next += 1
	})
        $('.search-listing-view-min-bid', clone).removeClass('null')
    } else {
        $('.search-listing-view-min-bid', clone).hide()
    }

    $('.search-listing-view-link a', clone)
	.attr('href', '/listing/{0}'.fs(listing.id))
    $('.search-listing-view-link', clone)
	.append('<span class="mono">Expires: {0}</span>'.fs(''+new Date(listing.expires)) )
    $$('listings').append(clone)
}


var configNext = function(results) {
    var navNext = function(e) {
	$$('some-listings').text('Loading...')
	$$('nav-extra').slideUp(function() {
	    $$('listings').slideUp(function() {
		searchStack.push(results)
		var innerNext = function(rs) {
		    window.location.hash = results.next_qs
		    putListings(rs)
		}
		new SearchLoader({success: innerNext, suffix: '?'+results.next_qs})
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
}


var configPrev = function(results) {
    var navPrev = function(e) {
	$$('some-listings').text('Loading...')
	$$('nav-extra').slideUp(function() {
	    $$('listings').slideUp(function() {
		var rs = searchStack.pop()
		window.location.hash = rs.next_qs
		putListings(rs)
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
}


var putListings = function(results) {
    $('div.listing-seed').remove()
    if (!results.listings.length) {
	$$('no-listings').text('Nothing found.  You should add a listing.').show()
	$$('some-listings').hide()
	$$('nav').fadeAway()
	$$('bottom-nav').fadeAway()
	return
    } else {
	$$('no-listings').hide()
	$$('some-listings').text('Results:').show()
	$$('nav').fadeBack()
	$$('bottom-nav').fadeBack()
    }

    var proto = $$('listings div.prototype')
    $.each(results.listings, function(idx, listing) {
	putListing(listing,
		   proto
		        .clone()
		        .addClass('listing-seed')
		        .removeClass('null prototype')
		  )
    })

    if (results.more) {
	configNext(results)
	$('#search-next-link, #search-bottom-next-link').show()
	$('#search-next-none, #search-bottom-next-none').hide()
    } else {
	$('#search-next-link, #search-bottom-next-link').hide()
	$('#search-next-none, #search-bottom-next-none').show()
    }

    if (searchStack.depth()) {
	configPrev(results)
	$('#search-prev-link, #search-bottom-prev-link').show()
	$('#search-prev-none, #search-bottom-prev-none').hide()
    } else {
	$('#search-prev-link, #search-bottom-prev-link').hide()
	$('#search-prev-none, #search-bottom-prev-none').show()
    }
    var st = new SchemaTool()
    new AuthProfileLoader({
	suffix: '?settings=1',
	success: function(profile) {
	    st.putImages(profile.settings)
	},
	error: function(request, status, error) {
	    st.putImages()
	}
    })
    $('div.listing-seed td.item-view div:empty').parent().remove()
    $$('listings').slideDown()
    $$('nav-extra').fadeIn()
}


var searchOkay = function(search, query) {
    if (query) {
	window.location.hash = query
    }
    if (! $$('filter-inputs').children().length) {
	$.each(search.filters, function(idx, filter) {
	    var input = '<input type="checkbox" name="{0}" />{1}<br />'.fs(filter[0], filter[1])
	    $$('filter-inputs').append(input)
	})
	$$('controls input[type="checkbox"]').click(searchStack.optionChanged)
    }
    if (!$$('sort-inputs').children().length) {
	$.each(search.orders, function(idx, order) {
	    var input = '<input type="radio" name="sort" value="{0}" />{1}<br />'.fs(order[0], order[1])
	    $$('sort-inputs').append(input)
	})
	$('input[name="sort"]').first().click()
	$$('controls input[type="radio"]').click(searchStack.optionChanged)
    }
    putListings(search)
    siteMessage().fadeAway()

    $$('controls').fadeIn('fast')
    $$('listings').fadeIn('fast')
    contentWidths.controls = $$('controls').width()
    contentWidths.results = $$('listing-pod').width()
}


var schemaReady = function(schema) {
    // TODO: remove these statements when common listing/bid
    // hover/chooser thing gets implemented:
    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var hoverItem = function(e) { tt.show(e); $(this).addClass('outline')  }
    var unhoverItem = function(e) {  tt.hide(e);  $(this).removeClass('outline') }
    $('div.organizer-view td.item-view').live('mouseover', hoverItem)
    $('div.organizer-view td.item-view').live('mouseout', unhoverItem)

    $$('reverse-link').click(showReverseSearch)
    $$('advanced-link').click(showAdvancedSearch)
    $$('basic-link').click(showBasicSearch)

    var q = getHash()
    if (q) {
	window.setTimeout(function() {
	// initialize controls from hash.  this is fail.
	$.each(q.split('&'), function(idx, pair) {
	    try {
		var p = pair.split('=')
		var name = p[0], val = p[1]
		$('input[name={0}]'.fs(name)).attr('checked', val=='on')
	    } catch (e) {   }
	})
	    }, 125)
    }

    siteMessage('Loading results...')
    new SearchLoader({
	suffix: '?' + q,
	success: function(rs) { searchOkay(rs, q) }
    })
}


$(document).ready(function() {
    siteMessage('Loading schema...')
    new AuthProfileLoader({
	suffix: '?settings=1',
	success: function(profile) {
	    new ProfileTool(profile).defaultUserAuthOkay()
	},
	error: function(request, error, status) {
	    new ProfileTool().defaultUserAuthError(request, error, status)
	}
    })
    new SchemaLoader({success: schemaReady})
})

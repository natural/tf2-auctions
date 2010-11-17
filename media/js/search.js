var $$ = function(suffix, next) { return $('#search-'+suffix, next) } // slug defined in search.pt
var previousStack = [], contentWidths = {controls:null, results:null}


var SearchBackpackTool = function(schema) {
    var backpack = $.map(values(schema.tradable()), function(item, index) {
	return {defindex:item.defindex, pos:index+1}
    })
    var bpNav = new BackpackNavigator('ac')
    var bpChs = new BackpackChooser({
	backpack: backpack,
	copy: true,
	listingUids: [],
	bidUids: [],
	backpackSlug: 'ac',
	chooserSlug: 'advanced-search',
	title:'',
	help:'',
	afterDropMove: chooserChanged
    })
    bpNav.init()
    bpChs.init()
    $(".quantity:contains('undefined')").fadeAway()
    this.chooser = bpChs
}


var optionsQuery = function() {
    var qs = $$("controls input[type='checkbox']").map(function(i,v) {
	return '{0}={1}'.fs( $(v).attr('name'), $(v).attr('checked') ? 'on' : 'off')
    })
    qs.push('{0}={1}'.fs('sort', $$("controls input[type='radio']:checked").attr('value')))
    return '?' + qs.toArray().join('&')
}


var optionChanged = function() {
    previousStack = []
    new SearchLoader({success: searchOkay, suffix: optionsQuery()})
}


var chooserQuery = function() {
    var qs = $('#advanced-search-chooser img')
        .map(function(k, v) { return 'di={0}'.fs( $(v).data('node')['defindex'] ) })
        .toArray()
    return '?' + qs.join('&')
}

var chooserChanged = function() {
    previousStack = []
    new SearchLoader({success: searchOkay, suffix: chooserQuery()})
}


var showBasicSearch = function() {
    $$('advanced-pod').slideUp()
    $('#search-advanced, #search-sorts, #search-filters').fadeBack()
    $$('basic').fadeOut()
    $$("listing-pod").animate({width:contentWidths.results}, 400)
    $$("controls").animate({width:contentWidths.controls} ,400)
    $$("controls-nav").fadeIn()
}


var showAdvancedSearch = function() {
    var schema = new SchemaTool()
    if ( !$$('advanced-pod').data('init') ) {
	var advSearchTool = new SearchBackpackTool(schema)
	$$('advanced-pod').data('init', true)
    }
    var tipTool = new TooltipView(schema)
    var hoverSearchChoice = function(e) {
        try {
            var data = $('img', this).data('node')
        	if (!data.flag_cannot_trade) {
	            $(this).addClass('selected-delete')
                }
        } catch (e) { }
    }
    var unhoverSearchChoice = function(e) {
	$(this).removeClass('selected-delete')
    }
    var copyToSearchChoice = function(event) {
	var source = $(event.target)
	var target = $("#advanced-search-chooser td div:empty").first()
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
	$.each( $('#advanced-search-chooser td'), function(idx, cell) {
	    $('img', cell).fadeOut().remove()
	    $(cell).removeClass('selected selected-delete')
	})
	chooserChanged()
    }

    $('#backpack-ac td div img').unbind().dblclick(copyToSearchChoice)
    $('#advanced-search-chooser td').unbind().dblclick(removeSearchChoice)
    $('#advanced-search-chooser td').hover(hoverSearchChoice, unhoverSearchChoice)
    $('#search-advanced, #search-sorts, #search-filters, #search-controls-nav').fadeOut()
    $$('advanced-reset').click(resetAdvancedSearch)
    $$('basic').fadeIn()

    var width = $$('pod').width()
    $("#advanced-search-pod").show()
    $$('controls').animate({width:400} ,400)
    $$("listing-pod").animate({width:width-450}, 400, function() {
	$$('advanced-pod').show( function () {
	    $("#backpack-tools-ac")
		.width($("#backpack-ac .backpack-page-1").width() - 10)
	})
    })
    return false
}


var showListing = function(listing, clone) {
    var putil = new ProfileTool(listing.owner)
    clone.removeClass('null prototype')
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

    new StatusLoader({suffix: listing.owner.id64, success: function(status) {
	$('.listing-avatar', clone).addClass('profile-status ' + status.online_state)
    }})

    $('.bid-count-seed', clone).text(listing.bid_count || '0') // bid_count because bids aren't fetched.
    var next = 0
    $.each(listing.items, function(index, item) {
	$( $('.item-view div', clone)[next]).append( $.toJSON(item) )
	next += 1
    })
    if (listing.min_bid.length) {
	var next = 0
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
    $('.search-listing-view-link a', clone).attr('href', '/listing/'+listing.id)
    $('.search-listing-view-link', clone)
	.append('<span class="mono">Expires: {0}</span>'.fs(''+new Date(listing.expires)) )
    $$('listings').append(clone)
}


var configNext = function(results) {
    var navNext = function(e) {
	$$('some-listings').text('Loading...')
	$$('nav-extra').slideUp(function() {
	    $$('listings').slideUp(function() {
		previousStack.push(results)
		var innerNext = function(rs) {
		    showListings(rs)
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
		showListings(previousStack.pop())
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



var showListings = function(results) {
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
	showListing(listing, proto.clone().addClass('listing-seed'))
    })

    if (results.more) {
	configNext(results)
	$('#search-next-link, #search-bottom-next-link').show()
	$('#search-next-none, #search-bottom-next-none').hide()
    } else {
	$('#search-next-link, #search-bottom-next-link').hide()
	$('#search-next-none, #search-bottom-next-none').show()
    }

    if (previousStack.length) {
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
    $$('listings').fadeIn()
    $$('nav-extra').fadeIn()
}


var searchOkay = function(search) {
    if (! $$('filter-inputs').children().length) {
	$.each(search.filters, function(idx, filter) {
	    var input = '<input type="checkbox" name="{0}" />{1}<br />'.fs(filter[0], filter[1])
	    $$('filter-inputs').append(input)
	})
	$$('controls input[type="checkbox"]').click(optionChanged)
    }
    if (!$$('sort-inputs').children().length) {
	$.each(search.orders, function(idx, order) {
	    var input = '<input type="radio" name="sort" value="{0}" />{1}<br />'.fs(order[0], order[1])
	    $$('sort-inputs').append(input)
	})
	$('input[name="sort"]').first().click()
	$$('controls input[type="radio"]').click(optionChanged)
    }
    showListings(search)
    siteMessage().fadeAway()
    $$('controls').fadeIn('fast')
    $$('listings').fadeIn('fast')
    contentWidths.controls = $$('controls').width()
    contentWidths.results = $$('listing-pod').width()
}


var schemaReady = function(schema) {
    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var hoverItem = function(e) { tt.show(e); $(this).addClass('outline')  }
    var unhoverItem = function(e) {  tt.hide(e);  $(this).removeClass('outline') }
    $('div.organizer-view td.item-view, #backpack-ac td').live('mouseover', hoverItem)
    $('div.organizer-view td.item-view, #backpack-ac td').live('mouseout', unhoverItem)
    $('.listing-view').live('mouseover', function() { $(this).addClass('listing-hover') })
    $('.listing-view').live('mouseout', function() { $(this).removeClass('listing-hover') })
    $$('advanced-link').click(showAdvancedSearch)
    $$('basic-link').click(showBasicSearch)
    siteMessage('Loading results...')
    new SearchLoader({success:searchOkay})
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
    console.log('search.js version {0} ready'.fs(43))
})

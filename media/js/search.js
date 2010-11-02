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
        } catch (e) {}
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
    $('#backpack-ac td div img').unbind().dblclick(copyToSearchChoice)
    $('#advanced-search-chooser td').hover(hoverSearchChoice, unhoverSearchChoice)
    $('#advanced-search-chooser td').unbind().dblclick(removeSearchChoice)
    $('#search-advanced, #search-sorts, #search-filters, #search-controls-nav').fadeOut()
    $$('basic').fadeIn()

    var width = $$('pod').width()
    $("#advanced-search-pod").show()
    $$('controls').animate({width:330} ,400)
    $$("listing-pod").animate({width:width-350}, 400, function() {
	$$('advanced-pod').show()
    })
    return false
}


var showListing = function(listing, clone) {
    clone.removeClass('null prototype')
    if (listing.description) {
	$('.listing-description', clone).text(listing.description)
    } else {
	$('.listing-description-label', clone).empty()
	$('.listing-description', clone).empty()
    }
    $('.listing-owner', clone).text(listing.owner.personaname)
    $('.listing-owner', clone).parent().attr('href', '/profile/'+listing.owner.id64)

    $('.listing-avatar', clone).attr('src', listing.owner.avatar)
    $('.listing-avatar', clone).parent().attr('href', '/profile/'+listing.owner.id64)

    $('.bid-count-seed', clone).text(listing.bid_count || '0') // bid_count because bids aren't fetched.
    var next = 0
    $.each(listing.items, function(index, item) {
	$( $('.item-view div', clone)[next]).append( $.toJSON(item) )
	next += 1
    })
    $('.search-listing-view-link a', clone).attr('href', '/listing/'+listing.id)
    $$('listings').append(clone)
}


var showListings = function(results) {
    $('div.listing-seed').remove()
    if (!results.listings.length) {
	$$('no-listings').text('Nothing found.  You should add a listing.').show()
	$$('some-listings').hide()
	$$('nav').fadeAway()
	return
    } else {
	$$('no-listings').hide()
	$$('some-listings').text('Results:').show()
	$$('nav').fadeBack()
    }

    var proto = $$('listings div.prototype')
    $.each(results.listings, function(idx, listing) {
	showListing(listing, proto.clone().addClass('listing-seed'))
    })

    if (results.more) {
	$$('next').unbind().click(function(e) {
	    var next = function(rs) {
		previousStack.push(results)
		showListings(rs)
	    }
	    new SearchLoader({success: next, suffix: '?' + results.next_qs })
	    return false
	})
	$$('next-link').show()
	$$('next-none').hide()
    } else {
	$$('next-link').hide()
	$$('next-none').show()
    }

    if (previousStack.length) {
	$$('prev').unbind().click(function(e) {
	    showListings(previousStack.pop())
	    return false
	})
	$$('prev-link').show()
	$$('prev-none').hide()
    } else {
	$$('prev-link').hide()
	$$('prev-none').show()
    }
    new SchemaTool().setImages()
    $('div.listing-seed td.item-view div:empty').parent().remove()
    $('#search-listings').fadeIn()
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
    new AuthProfileLoader({success: defaultUserAuthOkay, error: defaultUserAuthError})
    new SchemaLoader({success: schemaReady})
    console.log('search.js ready')
})

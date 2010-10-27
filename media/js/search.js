var $$ = function(suffix, next) { return $('#search-'+suffix, next) } // slug defined in search.pt
var previousStack = []
var contentWidths = {controls:null, results:null}


var SearchBackpackTool = function(schema) {
    var backpack = $.map(values(schema.tradable()), function(item, index) {
	return {defindex:item.defindex, pos:index+1}
    })
    var bpNav = new BackpackNavigator('ac')
    var bpChs = new BackpackChooser({
	backpack: backpack,
	copy:true,
	listingUids: [],
	bidUids: [],
	backpackSlug: 'ac',
	chooserSlug: 'advanced-search',
	title:'',
	help:''
    })
    bpNav.init()
    bpChs.init()
    $(".quantity:contains('undefined')").fadeAway()
    this.chooser = bpChs
}


var optionsQuery = function() {
    var qs = $("#controls input[type='checkbox']").map(function(i,v) {
	return '{0}={1}'.fs( $(v).attr('name'), $(v).attr('checked') ? 'on' : 'off')
    })
    qs.push('{0}={1}'.fs('sort', $("#controls input[type='radio']:checked").attr('value')))
    console.log(qs)
    return '?' + qs.toArray().join('&')
}


var optionChanged = function() {
    previousStack = []
    new SearchLoader({success: searchOkay, suffix: optionsQuery()})
}

var showBasicSearch = function() {
    $('#advanced-search-wrapper').slideUp()
    $('#asearch, #sorts, #filters').fadeBack()
    $('#bsearch').fadeOut()
//    $("#listing-container").animate({width:contentWidths.results}, 400)
//    $("#advanced-search-wrapper").animate({width:contentWidths.controls} ,400)
    $("#listing-container").animate({width:contentWidths.results}, 400)
    $("#controls").animate({width:contentWidths.controls} ,400)

}


var showAdvancedSearch = function() {
    if ( !$('#advanced-search-wrapper').data('init') ) {
	var schema = new SchemaTool()
	var minTool = new SearchBackpackTool(schema)
	$('#advanced-search-wrapper').data('init', true)
    }
    //var tipTool = new TooltipView(schema)
    //$('#backpack-ac td div img').dblclick(copyToMinbidChooser)
    //$('#chooser-advanced-search td').hover(hoverMinBidChoice, unhoverMinBidChoice)
    //$('#chooser-advanced-search td').dblclick(removeMinBidChoice)

//    $('#advanced-search-wrapper').slideDown()
    $('#asearch, #sorts, #filters').fadeOut()
    $('#bsearch').fadeIn()
    var width = $('#container-container').width()
    $("#advanced-search-wrapper").show()
    $('#controls').animate({width:330} ,400)
    $("#listing-container").animate({width:width-330}, 400)


    var width = $('#backpack-ac tbody').width()
    $('#advanced-search-wrapper').show() ///width(width)
    $('#backpack-ac, #chooser-advanced-search').css('width', width + ' important!')

//, #advanced-search-label-chooser, #advanced-search-label-results
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
    $('.listing-avatar', clone).attr('src', listing.owner.avatar)
    var next = 1
    $.each(listing.items, function(index, item) {
	$('.item-display:nth-child(' + next + ') div', clone).append( $.toJSON(item) )
	next += 1
    })
    $('.search-view-link a', clone).attr('href', '/listing/'+listing.id)
    $('.search-listing-id', clone).text(listing.id)
    $$('listings').append(clone)
}


var showListings = function(results) {
    $('div.listing-wrapper').remove()
    if (!results.listings.length) {
	$$('no-listings').text('Nothing found.  You should add a listing.').show()
	$$('some-listings').hide()
	$('#search-nav').fadeAway()
	return
    } else {
	$$('no-listings').hide()
	$$('some-listings').text('Results:').show()
	$('#search-nav').fadeBack()
    }

    var proto = $$('listings div.prototype')
    $.each(results.listings, function(idx, listing) {
	showListing(listing, proto.clone().addClass('listing-wrapper'))
    })

    if (results.more) {
	$('#search-next').unbind().click(function(e) {
	    var next = function(rs) {
		previousStack.push(results)
		showListings(rs)
	    }
	    new SearchLoader({success: next, suffix: '?' + results.next_qs })
	    return false
	})
	$('#next-link').show()
	$('#next-none').hide()
    } else {
	$('#next-link').hide()
	$('#next-none').show()
    }

    if (previousStack.length) {
	$('#search-prev').unbind().click(function(e) {
	    showListings(previousStack.pop())
	    return false
	})
	$('#prev-link').show()
	$('#prev-none').hide()
    } else {
	$('#prev-link').hide()
	$('#prev-none').show()
    }
    new SchemaTool().setImages()
    $('div.listing-wrapper td.item-display div:empty').parent().remove()
    $('#search-listings').fadeIn()
}


var searchOkay = function(search) {
    if (!$('#filter-inputs').children().length) {
	$.each(search.filters, function(idx, filter) {
	    var input = '<input type="checkbox" name="{0}" />{1}<br />'.fs(filter[0], filter[1])
	    $('#filter-inputs').append(input)
	})
	$('#controls input[type="checkbox"]').click(optionChanged)
    }
    if (!$('#sort-inputs').children().length) {
	$.each(search.orders, function(idx, order) {
	    var input = '<input type="radio" name="sort" value="{0}" />{1}<br />'.fs(order[0], order[1])
	    $('#sort-inputs').append(input)
	})
	$('#controls input[type="radio"]').click(optionChanged)
	$('input[name="sort"]').first().click()
    }
    showListings(search)
    smallMsg().fadeAway()
    $('#controls').fadeIn('fast')
    $$('listings').fadeIn('fast')
    contentWidths.controls = $('#controls').width()
    contentWidths.results = $('#listing-container').width()
}


var schemaReady = function(schema) {
    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var hoverItem = function(e) { tt.show(e); $(this).addClass('outline')  }
    var unhoverItem = function(e) {  tt.hide(e);  $(this).removeClass('outline') }
    $('div.organizer-view td.item-display').live('mouseover', hoverItem)
    $('div.organizer-view td.item-display').live('mouseout', unhoverItem)
    $('.listing-table').live('mouseover', function() { $(this).addClass('listing-hover') })
    $('.listing-table').live('mouseout', function() { $(this).removeClass('listing-hover') })
    $('#asearch-link').click(showAdvancedSearch)
    $('#bsearch-link').click(showBasicSearch)
    smallMsg('Loading results...')
    new SearchLoader({success:searchOkay})
}


$(document).ready(function() {
    smallMsg('Loading schema...')
    new SchemaLoader({success: schemaReady})
    console.log('search.js ready')
})
var $$ = function(suffix, next) { return $('#browse-'+suffix, next) } // slug defined in browse.pt



var optionsQuery = function() {
    var qs = $("#filters input[type='checkbox']").map(function(i,v) {
	return '{0}={1}'.format( $(v).attr('name'), $(v).attr('checked') ? 'on' : 'off')
    })
    qs.push('{0}={1}'.format('sort', $("#filters input[type='radio']:checked").attr('value')))
    console.log(qs)
    return '?' + qs.toArray().join('&')
}


var optionChanged = function() {
    //new SearchLoader({success: searchOkay, suffix: optionsQuery()})
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
    $('.browse-view-link a', clone).attr('href', '/listing/'+listing.id)
    $('.browse-listing-id', clone).text(listing.id)
    $$('listings').append(clone)
}

var previousStack = []


var showListings = function(results) {
    $('div.listing-wrapper').remove()
    if (!results.listings.length) {
	$$('no-listings').text('Nothing found.  You should add a listing.').show()
	return
    } else {
	$$('no-listings').hide()
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
	})
	$('#prev-link').show()
	$('#prev-none').hide()
    } else {
	$('#prev-link').hide()
	$('#prev-none').show()
    }

    if (results.more || previousStack.length) {
	$('#search-nav').fadeIn()
    } else {
	$('#search-nav').fadeOut()
    }
    new SchemaTool().setImages()
    $('div.listing-wrapper td.item-display div:empty').parent().remove()
    $('#search-nav').fadeIn()
    $('#browse-listings').fadeIn()
}



var searchOkay = function(search) {
    //$('div.listing-wrapper table').fadeOut('fast')
    if (!$('#filter-inputs').children().length) {
	$.each(search.filters, function(idx, filter) {
	    var input = '<input type="checkbox" name="{0}" />{1}'.format(filter[0], filter[1])
	    $('#filter-inputs').append(input)
	})
	$('#filters input[type="checkbox"]').click(optionChanged)
    }
    if (!$('#sort-inputs').children().length) {
	$.each(search.orders, function(idx, order) {
	    var input = '<input type="radio" name="sort" value="{0}" />{1}'.format(order[0], order[1])
	    $('#sort-inputs').append(input)
	})
	$('#filters input[type="radio"]').click(optionChanged)
	$('input[name="sort"]').first().click()
    }
    showListings(search)
    smallMsg().fadeAway()
    $$('listings').slideDown('fast')
}


var schemaReady = function(schema) {
    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var hoverItem = function(e) { tt.show(e); $(this).addClass('outline')  }
    var unhoverItem = function(e) {  tt.hide(e);  $(this).removeClass('outline') }
    $('div.organizer-view td.item-display').live('mouseover', hoverItem)
    $('div.organizer-view td.item-display').live('mouseout', unhoverItem)
    smallMsg('Loading results...')
    new SearchLoader({success:searchOkay})
}


$(document).ready(function() {
    smallMsg('Loading schema...')
    new SchemaLoader({success: schemaReady})
    new AuthProfileLoader({success: showProfile})
    console.log('browse.js ready')
})

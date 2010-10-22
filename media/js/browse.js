var $$ = function(suffix, next) { return $('#browse-'+suffix, next) } // slug defined in browse.pt
var searchOptions = {cursor:null, filters:[]}




var categorySelected = function() {
    var searchOkay = function(results) {
	//$$('listings tbody:gt(0)').fadeOut()
	listingsReady(results)
    }
    var qs = $("#filters input[type='checkbox']").map(function(i,v) {
	return '{0}={1}'.format( $(v).attr('name'), $(v).attr('checked') ? 'on' : 'off')
    })
    new SearchLoader({
	success: searchOkay,
	suffix: '?' + qs.toArray().join('&')
    })
    //return false
}

var addListing = function(listing, clone) {
    clone.removeClass('null prototype')
    $('.listing-description', clone).text(listing.description)
    $('.listing-owner', clone).text(listing.owner.personaname)
    $('.listing-avatar', clone).attr('src', listing.owner.avatar)

    var next = 1
    $.each(listing.items, function(index, item) {
	$('.item-display:nth-child(' + next + ') div', clone).append( $.toJSON(item) )
	next += 1
    })
    $('.browse-view-link a', clone).attr('href', '/listing/'+listing.id)
    $('.browse-listing-id', clone).text(listing.id)
    GL = listing
    $$('listings').prepend(clone)
}


var listingsReady = function(search) {
    $('div.listing-wrapper table').slideUp('fast').delay(500)
    $('div.listing-wrapper').queue(function() { $(this).remove() })
    if (search.listings.length) {
	var proto = $$('listings div.prototype')
	$.each(search.listings, function(idx, listing) {
	    var clone = proto.clone().addClass('listing-wrapper')
	    addListing(listing, clone)
	})
        new SchemaTool().setImages()
    } else {
	$$('no-listings').text('Nothing found.  You should add a listing.').show()
    }
    smallMsg().fadeAway()
    $$('listings').slideDown('fast')
}


var schemaReady = function(schema) {
    var search = window.location.search || '?f=new'
    smallMsg('Loading results...')
    new SearchLoader({success:listingsReady, suffix:search})
}


$(document).ready(function() {
    console.log('browse.js ready')
    $("#filters input[type='checkbox']").click(categorySelected)
    smallMsg('Loading schema...')
    new SchemaLoader({success: schemaReady})
})


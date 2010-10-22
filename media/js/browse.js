var $$ = function(suffix, next) { return $('#browse-'+suffix, next) } // slug defined in browse.pt



var categorySelected = function() {
    var refreshReady = function(listings) {
	$$('listings tbody:gt(0)').fadeOut('slow')
	listingsReady(listings)
    }
    var search = $(this).attr('href').replace('#', '?f=')
    new SearchLoader({success:refreshReady, suffix:search})
    return false
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


var listingsReady = function(listings) {
    if (listings.length) {
	var proto = $$('listings div.prototype')
	$.each(listings, function(idx, listing) { addListing(listing, proto.clone()) } )
        new SchemaTool().setImages()
    } else {
	$$('no-listings').text('Nothing found.  You should add a listing.').show()
    }
    smallMsg().fadeAway()
    $$('listings').slideDown()
}


var schemaReady = function(schema) {
    var search = window.location.search || '?f=new'
    smallMsg('Loading results...')
    new SearchLoader({success:listingsReady, suffix:search})
}


$(document).ready(function() {
    console.log('browse.js ready')
    $("#filters a").click(categorySelected)
    smallMsg('Loading schema...')
    new SchemaLoader({success: schemaReady})
})


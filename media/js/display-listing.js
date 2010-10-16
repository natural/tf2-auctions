var $$ = function(suffix, next) { return $('#listing-detail-'+suffix, next) } // slug defined in browse.pt


var ListingLoader = function(options) {
    options = options || {}
    var id = options.id
    var self = this
    var okay = function(listing) {
	ListingLoader.cache = self.listing = listing
	var cb = options.success ? options.success : ident
	cb(id, listing)
    }
    var error = function(err) {
	console.error(err)
	var cb = options.error ? options.error : ident
	cb(err)
    }
    if (!ListingLoader.cache) {
	console.log('fetching listing')
	$.ajax({url: '/api/v1/listing/'+id,
		dataType: 'json',
		cache: true,
		success: okay,
		error: error
	       })
    } else {
	console.log('using cached listing:', ListingLoader.cache)
	okay(ListingLoader.cache)
    }
}
ListingLoader.cache = null




var listingReady = function(id, listing) {
    console.log('have listing', id, listing)
    $$('title').text( $$('title').text() + ' ' + id)

    $.each(['description', 'created', 'expires', 'bid_count', 'status'], function(idx, name) {
	$$(name).text(listing[name])
    })
    if (listing.min_bid.length) {
        $.each(listing.min_bid, function(idx, defindex) {
	    $$('min-bid table tr').append('<td><div class="defindex-lazy">' + defindex + '</div></td>')
        })
    } else {
        $$('min-bid').html('No minimum.')
    }

    $.each(listing.items, function(idx, item) {
        $$('items table tr').append('<td><div class="defindex-lazy">' + item.defindex + '</div></td>')
    })
    SchemaTool.setImages()
    $$('load').fadeAway('slow')
    $$('main').fadeIn('slow')

    // bid_count
    // owner (steam id, personaname, avatar (+full, +medium), profile url, id64)
    // bids
}


var schemaReady = function(schema) {
    SchemaTool.init(schema)
    var id = window.location.pathname.split('/').pop()
    new ListingLoader({id:id, success:listingReady})
}

$(document).ready(function() {
    console.log('display-listing.js ready')
    new SchemaLoader({success: schemaReady})
})

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
	$.ajax({url: '/api/v1/listings/'+id,
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
    $('#listing-detail-title').text( $('#listing-detail-title').text() + ' ' + id)

    $.each(['description', 'created', 'expires', 'bid_count', 'status'], function(idx, name) {
	$('#listing-detail-'+name).text( listing[name])
    })
    if (listing.minbid.length) {
        $.each(listing.minbid, function(idx, defindex) {
	    $('#listing-detail-minbid').append('<span class="defindex-lazy">' + defindex + '</span>')
        })
    } else {
        $('#listing-detail-minbid').html('No minimum.')
    }

    $.each(listing.items, function(idx, item) {
        $('#listing-detail-items').append('<span class="defindex-lazy">' + item.defindex + '</span>')
    })
    SchemaTool.setImages()
    $('#listing-details-load').fadeAway('slow')
    $('#listing-details-main').fadeIn('slow')
    // items ( quantity, level, quality, uniqueid, defindex )
    // bid_count
    // owner (steam id, personaname, avatar (+full, +medium), profile url, id64)

}

var schemaReady = function(schema) {
    SchemaTool.init(schema)
    var listingId = window.location.pathname.split('/').pop()
    new ListingLoader({id:listingId, success:listingReady})
}

$(document).ready(function() {
    console.log('display-listing.js ready')
    // set loading msg...
    new SchemaLoader({success: schemaReady})

})


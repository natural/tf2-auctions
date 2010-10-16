var $$ = function(suffix, next) { return $('#browse-'+suffix, next) } // slug defined in browse.pt


var ListingsLoader = function(options) {
    options = options || {}
    var self = this
    var search = options.search || '?f=new'
    var okay = function(listings) {
	ListingsLoader.cache[search] = listings
	var cb = options.success ? options.success : ident
	cb(listings)
    }
    var error = function(err) {
	console.error(err)
	var cb = options.error ? options.error : ident
	cb(err)
    }
    if (!ListingsLoader.cache[search]) {
	console.log('fetching listings')
	$.ajax({url: '/api/v1/listing/search' + search,
		dataType: 'json',
		cache: true,
		success: okay,
		error: error
	       })
    } else {
	console.log('using cached listings:', ListingsLoader.cache[search])
	okay(ListingsLoader.cache[search])
    }
}
ListingsLoader.cache = {}

var categorySelected = function() {
    var refreshReady = function(listings) {
	$$('listings tbody:gt(0)').fadeOut('slow')
	listingsReady(listings)
    }
    var search = $(this).attr('href').replace('#', '?f=')
    new ListingsLoader({search:search, success:refreshReady})
    return false
}

var addListing = function(listing, clone) {
    clone.removeClass('null prototype')
    $$('listing-description', clone).text(listing.description)
    $$('listing-created', clone).text(listing.created)
    $$('listings').prepend(clone)
}


var listingsReady = function(listings) {
    var proto = $$('listings tbody.prototype')
    $.each(listings, function(idx, listing) { addListing(listing, proto.clone()) } )
    SchemaTool.setImages()
    $$('listings').slideDown()
}


var schemaReady = function(schema) {
    SchemaTool.init(schema)
    var search = window.location.search
    new ListingsLoader({search:search, success:listingsReady})
}


$(document).ready(function() {
    console.log('browse.js ready')
    // set loading msg...
    $("#filters a").click(categorySelected)
    new SchemaLoader({success: schemaReady})

})


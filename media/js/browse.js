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
    $$('listing-description', clone).text(listing.description)
    $$('listing-created', clone).text(listing.created)
    $$('listings').prepend(clone)
}


var listingsReady = function(listings) {
    var proto = $$('listings tbody.prototype')
    $.each(listings, function(idx, listing) { addListing(listing, proto.clone()) } )
    new SchemaTool().setImages()
    $$('listings').slideDown()
}


var schemaReady = function(schema) {
    var search = window.location.search || '?f=new'
    new SearchLoader({success:listingsReady, suffix:search})
}


$(document).ready(function() {
    console.log('browse.js ready')
    // set loading msg...
    $("#filters a").click(categorySelected)
    new SchemaLoader({success: schemaReady})

})


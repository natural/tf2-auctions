// note that in this script, just like everywhere else in the app,
// authorization is enforced server-side.  so we enable and disable
// various gui controls appropriate for the current user knowing full
// well that there isn't real security here, but that it exists and is
// enforced for us on the server.

// slug '#listing-detail-' defined in browse.pt
var $$ = function(suffix, next) { return $('#listing-detail-'+suffix, next) }


var profileReady = function(profile, listing) {
    if (profile.steamid == listing.owner.steamid) {
        $$('owner-bid-wrapper').fadeIn()
    } else {
        $$('auth-bid-wrapper').fadeIn()
        //
    }
}


var profileError = function(request, status, error) {
    if (request.status==401) {
	// normal and expected if the user isn't currently logged in.
        $$('login-wrapper').fadeIn()
    }
}


var listingReady = function(id, listing) {
    var pl = new ProfileLoader({
         success:function (p) { profileReady(p, listing)},
         error:profileError
         })

    $.each(['description', 'bid_count', 'status'], function(idx, name) {
        if (listing[name]) {
            $$(name).text(listing[name])
	} else {
	    $$(name).parent().parent().fadeAway()
	}
    })

    $.each(['created', 'expires'], function(idx, name) {
	console.log(listing[name])
	var d = new Date(listing[name] + ' GMT')
	$$(name).text(''+d)
    })

    var cells = 0
    if (listing.min_bid.length) {
        $.each(listing.min_bid, function(idx, defindex) {
	    if (!(cells % 5)) {
		$$('min-bid table').append('<tr></tr>')
	    }
	    cells += 1
	    var item = {defindex:defindex, quality:6}
	    $$('min-bid table tr:last').append(
                '<td><div class="defindex-lazy">' + $.toJSON(item) + '</div></td>'
            )
        })
    } else {
        $$('min-bid').html('No minimum.')
    }

    cells = 0
    $.each(listing.items, function(idx, item) {
	if (!(cells % 5)) {
	    $$('items table').append('<tr></tr>')
        }
        cells += 1
        $$('items table tr:last').append(
            '<td><div class="defindex-lazy">' + $.toJSON(item) + '</div></td>'
        )
        $$('items table tr td:last div').data('node', item)
    })

    var st = new SchemaTool()
    st.setImages()
    var tt = new TooltipView(st)

    $$('items td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('min-bid td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('title').html('Listing ' + id)
    $$('title-wrapper').fadeIn()
    $$('load').fadeAway('slow')
    $$('main').fadeIn('slow')
    // bid_count
    // owner (steam id, personaname, avatar (+full, +medium), profile url, id64)
    // bids

}




var schemaReady = function(schema) {
    var id = window.location.pathname.split('/').pop()

    new ListingLoader({success:function(ls) { listingReady(id, ls) }, suffix:id})
}


$(document).ready(function() {
    new SchemaLoader({success: schemaReady})
    $$('load').text('Loading...')
})

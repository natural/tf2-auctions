 // slug '#listing-detail-' defined in browse.pt
var $$ = function(suffix, next) { return $('#listing-detail-'+suffix, next) }


var listingReady = function(id, listing) {
    $$('title').text( $$('title').text() + ' ' + id)

    $.each(['description', 'created', 'expires', 'bid_count', 'status'], function(idx, name) {
	$$(name).text(listing[name])
    })
    if (listing.min_bid.length) {
        $.each(listing.min_bid, function(idx, defindex) {
	    $$('min-bid table tr').append(
                '<td><div class="defindex-lazy">' + defindex + '</div></td>'
            )
        })
    } else {
        $$('min-bid').html('No minimum.')
    }
    $.each(listing.items, function(idx, item) {
        $$('items table tr').append(
            '<td><div class="defindex-lazy">' + item.defindex + '</div></td>'
        )
        $$('items table tr td:last div').data('node', item)
    })
    var st = new SchemaTool()
    st.setImages()
    var tt = new TooltipView(st)
    $$('items td').mouseenter(tt.show).mouseleave(tt.hide)
    $('#listing-detail-min-bid td').mouseenter(tt.show).mouseleave(tt.hide)

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
    console.log('display-listing.js ready')
    new SchemaLoader({success: schemaReady})


})

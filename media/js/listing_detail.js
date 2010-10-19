// slug '#listing-detail-' defined in browse.pt
var $$ = function(suffix, next) { return $('#listing-detail-'+suffix, next) }


expires = new Date(2010,9,19,17,26,10);
function countdown(){
    var now = new Date()
    var delta = expires.getTime() - now.getTime()
    if (delta < 0) {
	//document.getElementById('countbox').innerHTML="Now!";
    } else {
	var days=0, hours=0, mins=0, secs=0, out=''
	delta = Math.floor(delta/1000)
	days = Math.floor(delta/86400)
	delta = delta % 86400
	hours = Math.floor(delta/3600)
	delta = delta % 3600
	mins = Math.floor(delta/60)
	delta = delta%60
	secs = Math.floor(delta)
	if(days != 0) { out += days +' day' + ((days!=1)?'s':'') + ', ' }
	if(days != 0 || hours != 0) { out += hours + ' hour' + ((hours!=1)?'s':'') + ', '}
	if(days != 0 || hours != 0 || mins != 0){out += mins +' minute'+((mins!=1)?'s':'')+', '}
	out += secs +' seconds'
	//document.getElementById('countbox').innerHTML=out;
	setTimeout('countdown()', 1000)
    }
}


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
    var pl = new AuthProfileLoader({
         success:function (p) { profileReady(p, listing)},
         error:profileError
         })
    $$('owner-link').text(listing.owner.personaname)
    $$('owner-avatar').attr('src', listing.owner.avatarmedium)
    $$('content').fadeIn('slow')
    $$('footer').fadeIn('slow')

    $.each(['description', 'bid_count', 'status'], function(idx, name) {
        if (listing[name]) {
            $$(name).text(listing[name])
	} else {
	    $$(name).parent().parent().slideUp()
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
    $$('load').slideUp('slow')

    // bid_count
    // owner (steam id, personaname, avatar (+full, +medium), profile url, id64)
    // bids

}




var schemaReady = function(schema) {
    var id = window.location.pathname.split('/').pop()
    document.title += ' ' + id
    new ListingLoader({success:function(ls) { listingReady(id, ls) }, suffix:id})
}


$(document).ready(function() {
    new SchemaLoader({success: schemaReady})
    $$('load').text('Loading...')
})

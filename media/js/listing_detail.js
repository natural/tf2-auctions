// slug '#listing-detail-' defined in browse.pt
var $$ = function(suffix, next) { return $('#listing-detail-'+suffix, next) }


function countdown(expires, selector) {
    expires = new Date(expires)
    return function() {
	var now = new Date()
	var delta = expires.getTime() - now.getTime()
	if (delta < 0) {
	    selector.text('Expired')
	} else {
	    var days=0, hours=0, mins=0, secs=0, out=''
	    delta = Math.floor(delta/1000)
	    days = Math.floor(delta/86400)
	    delta = delta % 86400
	    hours = Math.floor(delta/3600)
	    delta = delta % 3600
	    mins = Math.floor(delta/60)
	    delta = delta % 60
	    secs = Math.floor(delta)
	    if(days != 0) { out += days +'d ' }
	    if(days != 0 || hours != 0) { out += hours + 'h '}
	    if(days != 0 || hours != 0 || mins != 0){out += mins +'m '}
	    out += secs +'s'
	    selector.text(out)
	}
    }
}

var backpackReady = function(backpack, listing, profile) {
    $$('msg-backpack').fadeAway()
    $$('own-backpack').fadeIn()
    $$('place-start').fadeOut()

    var uids = []
    var t = new BackpackChooser(backpack, uids, 'bid', 'add-bid-item')
    t.show()
    var st = new SchemaTool()
    var tt = new TooltipView(st)
    var hoverItem = function(e) {
        tt.show(e)
        try {
            var data = $('img', this).data('node')
        	if (!data.flag_cannot_trade) {
	            $(this).addClass('outline')
                }
        } catch (e) {}
    }
    var unhoverItem = function(e) {
        tt.hide(e)
        $(this).removeClass('outline')
    }
    $('div.organizer-view td').hover(hoverItem, unhoverItem)
    setTimeout(function() {
	$('html body').animate({scrollTop: $$('place-bid-wrapper').position().top})
    }, 500)
}

var profileReady = function(profile, listing) {
    if (profile.steamid == listing.owner.steamid) {
	$$('owner-links').slideUp()
        $$('owner-bid-wrapper').slideDown()
    } else {
        $$('auth-bid-wrapper').fadeIn()
	$$('place-start').click(function() {
	    $$('place-bid-wrapper').fadeIn()
	    $$('msg-backpack').text('Loading your backpack...')
	    new BackpackLoader({success: function (backpack) {
		backpackReady(backpack, listing, profile)
            }, suffix: profile.id64})
	    return false
	})
    }
}


var profileError = function(request, status, error) {
    if (request.status==401) {
	// normal and expected if the user isn't currently logged in.
        $$('login-wrapper').fadeIn()
    }
}


var makeCell = function(v) {
    return '<td><div class="defindex-lazy">' + v + '</div></td>'
}


var listingReady = function(id, listing) {
    var pl = new AuthProfileLoader({
         success: function (p) { profileReady(p, listing)},
         error: profileError
    })
    var cells = 0
    var timer = setInterval(countdown(listing.expires, $$('timeleft')), 1000)
    var st = new SchemaTool()
    var tt = new TooltipView(st)

    $$('owner-link').text(listing.owner.personaname)
    $$('owner-avatar').attr('src', listing.owner.avatarmedium)
    $$('content').fadeIn('slow')
    $$('existing-bids-wrapper').fadeIn('slow')

    $.each(['description', 'status'], function(idx, name) {
	listing[name] ? $$(name).text(listing[name]) : $$(name).parent().parent().slideUp()
    })
    $.each(['created', 'expires'], function(idx, name) {
	$$(name).text('' + new Date(listing[name] + ' GMT'))
    })

    if (listing.min_bid.length) {
        $.each(listing.min_bid, function(idx, defindex) {
	    if (!(cells % 5)) {
		$$('min-bid table').append('<tr></tr>')
	    }
	    cells += 1
	    $$('min-bid table tr:last').append(makeCell($.toJSON({defindex:defindex, quality:6})))
        })
    } else {
        $$('min-bid').html('No minimum.')
    }

    cells = 0
    $.each(listing.items, function(idx, item) {
	if (!(cells % 5)) { $$('items table').append('<tr></tr>') }
        cells += 1
        $$('items table tr:last').append(makeCell($.toJSON(item)))
        $$('items table tr td:last div').data('node', item)
    })
    st.setImages()
    $$('items td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('min-bid td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('title').html('Listing ' + id)
    $$('bidcount').text(listing.bid_count ? ('Bids (' + listing.bid_count + ')') : 'No Bids')
    $$('title-wrapper').fadeIn()
    $$('load').slideUp('slow')
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

var AddListingTool = function(backpack, uids) {
    var self = this
    self.backpack = backpack

    var initnav = BackpackNavigator('a')
    initnav()
    var initbp = BackpackItemsTool('a', backpack, uids)
    initbp()

    this.show = function() {
	$('#add-listing-intro').fadeAway().slideUp(750)
	$('#add-listing-own-backpack').fadeBack()
	$('#backpack-header-a h3').first().html('Your Backpack')
	$('#backpack-header-a div').first().html('Drag items from your backpack into the Listing Items area below.');
	var width = $('#backpack-a tbody').width()
	$('#backpack-tools-a').width(width)
	$('#backpack-a label').width(width)
	$('#unplaced-backpack-a label').width(width)
	$('#add-listing-fields textarea').width(width).height(width/4).text(self.defaultDescription)
	$('#add-listing-fields').width( $('#backpack-a tbody').width())
	$('#add-listing-cancel').click(self.cancel)
	$('#add-listing-submit').click(self.submit)
	$('#add-listing-description').focusin(function() {
	    if ($(this).text() == self.defaultDescription) { $(this).text('') }
	})
	$('div.organizer-view table').mousedown(function() { return false })
	self.initDrag()
	var slider = $("#add-listing-duration-slider").slider(
	    {animate: true, max: 30, min:1, value: 30, change: function(event, ui) {
		var v = ui.value
		$("#add-listing-duration").text(v + " day" + (v==1 ? "" : "s"))
	    }}
	)
	var ele = $('h1').first()
	$('html body').animate({scrollTop: ele.position().top})
	return false
    }

    this.defaultDescription  = 'Enter a description.'

    this.cancel = function() {
	// TODO: reset backpack
	$('#add-listing-own-backpack').fadeAway()
	$('#add-listing-intro').fadeBack().slideDown(750)
	$('html body').animate({scrollTop: 0})
	return false
    }

    this.postOkay = function(data, status, req) {
	console.log('post okay:', data, status, req)
	$('#add-listing-working').text('Complete.  Click the link to view your listing.')
	$('#add-listing-success a').attr('href', '/listing/'+data.key)
	$('#add-listing-success').fadeIn()
    }

    this.postError = function(req, status, err) {
	console.error('post error:', req, status, err)
	$('#add-listing-working').text('Something went wrong.  Check the error below.').fadeIn()
	$('#add-listing-error').text(req.statusText).fadeIn()

    }
    this.addListing = function(input) {
	var output = {}
	output.days = input.days
	output.desc = input.desc
	var items = output.items = []
	$.each(input.items, function(idx, img) { items.push( $(img).data('node')) })
	var min_bid = output.min_bid = []
        $.each(input.min_bid, function(idx, img) { min_bid.push( $(img).data('node').defindex ) })
        console.log('submit new listing:', input, output)
	$.ajax({
	    url: '/api/v1/auth/add-listing',
	    type: 'POST',
	    dataType:'json',
	    data: $.toJSON(output),
	    success: this.postOkay,
	    error: this.postError
	})
    }

    this.showErrors = function(errors) {
	console.error('validation errors:', errors)
    }

    this.submit = function() {
	// quick and simple client-side validation before POST.  the
	// server will double check our work, too.
	var errs = []
	// 1.  listing items: uniqueid + item text
	var items = $('#chooser-add-listing-item img')
	if (items.length < 1 || items.length > 10) {
	    errs.push({id:'#chooser-add-listing-item',
		       msg:'Select 1-10 items from your backpack.'})
	}
	// 2.  description
	var desc = $('#add-listing-description').val()
	desc = (desc == self.defaultDescription ? '' : desc)
	if (desc.length > 400) {
	    errs.push({id:'#add-listing-description',
		       msg:'Too much text.  Make your description shorter.'})
	}
        // 3.  duration
	var days = $('#add-listing-duration-slider').slider('value')
	if (days < 1 || days > 30) {
	    // this can only happen if the user is twiddling data
	    // outside of the form.
	    errs.push({id:'#add-listing-duration-slider',
		       msg:'Invalid duration.  Select 1-30 days.'})
	}
        // 4.  min bid items: defindexes
	var min_bid = $('#chooser-add-listing-min-bid td.selected img')
	if (min_bid.length > 10) {
            errs.push({id:'#chooser-add-listing-min-bid',
		       msg:'Too many items. Select 0-10 items as a minimum bid.'})
	}
	if (errs.length) {
	    self.showErrors(errs)
	} else {
	    $('#add-listing-buttons').slideUp('slow')
	    $('#add-listing-working').removeClass('null').text('Working...').fadeIn('fast')
	    self.addListing({items: items, desc: desc, days: days, min_bid: min_bid})
	}
	return false
    }

    this.initDrag = function() {
	var updateCount = function() {
	    var len = $('#chooser-add-listing-item img').length
	    var txt = '(' + len + ' ' + (len == 1 ? 'item' : 'items') + ')'
	    $('#add-listing-title-extra').text(txt)
	}
	var dropItem = function(event, ui) {
	    if ($(this).children().length > 0) { return false }
	    $(this).parent().removeClass('selected')
	    $(this).append( $('div img', ui.draggable))
	    $('img', this).css('margin-top', '0')
	    $("span.equipped:only-child, span.quantity:only-child").hide().detach()
	    window.setTimeout(updateCount, 150) // delay for accurate counting
	    $("#chooser-add-listing-min-bid td, #backpack-a td").removeClass('selected')
	}
	var dragFromBackpack = function(event, ui) {
	    var img = $('img', event.target) // source img, not the drag img
            try {
		var node = img.data('node')
		return !(node.flag_cannot_trade) && !(node.flag_active_listing)
	    } catch (e) { return false }
	}
	var dragShow = function(event, ui) {
	    ui.helper.addClass('selected')
	}
	var dropOver = function(event, ui) { $(this).parent().addClass('outline') }
	var dropOut = function(event, ui) {
	    $(this).parent().removeClass('outline')
	}

	$('#backpack-a td, #unplaced-backpack-a td').draggable({
            containment: '#add-listing-own-backpack', helper: 'clone', cursor: 'move',
	    drag: dragFromBackpack, start: dragShow})
	$('#backpack-a td div, #unplaced-backpack-a td div').droppable(
	    {accept: '#chooser-add-listing-item td', drop: dropItem, over: dropOver, out: dropOut})
	$('#chooser-add-listing-item td').draggable({
            containment: '#add-listing-own-backpack', helper: 'clone', cursor: 'move',
	    start: dragShow})
	$('#chooser-add-listing-item td div').droppable(
	    {accept: '#backpack-a td, #unplaced-backpack-a td',
	     drop: dropItem, over: dropOver, out: dropOut})

    }
}




var showMinBid = function() {
    $('#add-listing-min-bid-show').slideUp(750)
    $('#add-listing-min-bid-wrapper').fadeIn('slow')
    var c = 0, p = '#add-listing-min-bid-'
    var st = new SchemaTool()
    $.each(st.tradable(), function(idx, item) {
	$(''+p+''+c + ' div').html(makeImg({src:item.image_url, height:64, width:64}))
	$('img:last', $(p+c+' div')).data('node', asPlayerItem(item))
	c += 1
    })
    return false
}



var selectItem = function() {
    if ($('img', this).length > 0) {
        $(this).toggleClass('selected')
    }
}


var maybeDeselectLast = function() {
    var self = $(this)
    var maybeDeselect = function() {
	if ($('#chooser-add-listing-min-bid td.selected').length > 10) {
	    self.removeClass('selected')
	}
    }
    window.setTimeout(maybeDeselect, 150)
}

var maybeMoveToChooser = function(event) {
    // TODO:  implement this
    console.log('maybe move this?', !$(event.target).parent().parent().hasClass('cannot-trade'))
}

var listingsUids = function(src) {
    var uids = {}
    $.each(src, function(idx, listing) {
	$.each(listing.items, function(i, item) {
	    uids[item.uniqueid] = item
	})
    })
    return uids
}


var backpackReady = function(backpack, listings, profile) {
    var count = backpack.length
    // count - count_untradable_items - count_my_listing_items
    if (count > 0) {
        var msg = "You've got " + count + " item" + (count==1?'':'s') + " to auction."
    } else {
        var msg = "You don't have anything to trade.  How can this be?  Go play!"
    }
    $('#load-own-msg-backpack').text(msg)
    $('#add-listing-help').fadeIn()
    $('a[href="/listing/add"]').parent().fadeAway()

    var tool = new AddListingTool(backpack, listingsUids(listings))
    $('#add-listing-get-started').click(tool.show)

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
}

var listingsError = function(err) {
    console.error('get listings error:', err)
}

var listingsReady = function(listings, profile) {
    $('#load-own-msg-backpack').text('Loading your backpack...')
    new BackpackLoader({success: function (backpack) {
            backpackReady(backpack, listings, profile)
        },
        suffix: profile.id64})
}


var profileReady = function(profile) {
    showProfile(profile)
    $('#load-own-msg-profile').text('Profile loaded.  Welcome back, ' + profile['personaname'] + '1')
    new ListingsLoader({success: function(listings) {
            console.log('inner', listings)
	    listingsReady(listings, profile)
        },
        suffix: profile.steamid})
}


var schemaReady = function(schema) {
    $('#load-own-msg-profile').text('Loading your profile...')
    new AuthProfileLoader({success: profileReady})
}


$(document).ready(function() {
    $("#profile-buttons a[href='/add-listing']").parent().fadeAway()
    $('#add-listing-min-bid-show a').click(showMinBid)
    $('div.organizer-view td').live('click', selectItem)
    $('#chooser-add-listing-min-bid td').live('click', maybeDeselectLast)
    $('#load-own-msg-profile').text('Loading item schema...')
    $('#backpack-a td div img').live('dblclick', maybeMoveToChooser)
    new SchemaLoader({success: schemaReady})
})

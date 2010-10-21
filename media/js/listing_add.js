var MinbidListingTool = function(schema) {
    var backpack = $.map(values(schema.tradable()), function(item, index) {
	return {defindex:item.defindex, pos:index+1}
    })
    var bpNav = new BackpackNavigator('mb')
    var bpChs = new BackpackChooser({
	backpack: backpack, copy:true,
	uids:[], backpackSlug: 'mb', chooserSlug: 'add-listing-min-bid',
	title:'', help:''})
    bpNav.init()
    bpChs.init()
    $(".quantity:contains('undefined')").fadeAway()
    this.chooser = bpChs
}


var BackpackListingTool = function(backpack, uids) {
    var self = this
    var defDesc  = 'Enter a description.'
    var bpNav = new BackpackNavigator('a')
    var bpChs = new BackpackChooser({
	backpack: backpack,
	uids:uids, backpackSlug: 'a', chooserSlug: 'add-listing-item',
	help:'Drag items from your backpack into the Listing Items area below.'
    })
    bpNav.init()
    bpChs.init()

    self.show = function() {
	$('#add-listing-intro').fadeAway().slideUp(750)
	$('#add-listing-own-backpack').fadeBack()
	var width = $('#backpack-a tbody').width()
	$('#add-listing-fields textarea').width(width).height(width/4).text(defDesc)
	$('#add-listing-fields').width( $('#backpack-a tbody').width())
	// dupes:
	$('#backpack-tools-a').width(width - 10)
	$('#backpack-a label').width(width)
	$('#unplaced-backpack-a label').width(width)
	$('#add-listing-cancel').click(self.cancel)
	$('#add-listing-submit').click(self.submit)
	$('#add-listing-description').focusin(function() {
	    if ($(this).text() == defDesc) { $(this).text('') }
	})
	var slider = $("#add-listing-duration-slider").slider(
	    {animate: true, max: 30, min:1, value: 30, change: function(event, ui) {
		var v = ui.value
		$("#add-listing-duration").text(v + " day" + (v==1 ? "" : "s"))
	    }}
	)
	return false
    }

    self.cancel = function() {
	// TODO: reset backpack
	$('#add-listing-own-backpack').fadeAway()
	$('#add-listing-intro').fadeBack().slideDown(750)
	$('html body').animate({scrollTop: 0})
	return false
    }

    self.postOkay = function(data, status, req) {
	console.log('post okay:', data, status, req)
	$('#add-listing-working').text('Complete.  Click the link to view your listing.')
	$('#add-listing-success a').attr('href', '/listing/'+data.key)
	$('#add-listing-success').fadeIn()
    }

    self.postError = function(req, status, err) {
	console.error('post error:', req, status, err)
	$('#add-listing-working').text('Something went wrong.  Check the error below.').fadeIn()
	$('#add-listing-error').text(req.statusText).fadeIn()

    }

    self.addListing = function(input) {
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
	    success: self.postOkay,
	    error: self.postError
	})
    }

    self.showErrors = function(errors) {
	console.error('validation errors:', errors)
	$.each(errors, function(index, error) {
	    var ele = $('{0}-error'.format(error.id))
	    ele.text('Error: {0}'.format(error.msg)).parent().fadeIn()
	    if (index==0) { ele.parent().scrollTopAni() }
	})
    }

    self.submit = function() {
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
	desc = (desc == defDesc ? '' : desc)
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
	var min_bid = $('#chooser-add-listing-min-bid td img')
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
}


var showMinBid = function() {
    var schema = new SchemaTool()
    var minTool = new MinbidListingTool(schema)
    var tipTool = new TooltipView(schema)
    var hoverMinBidChoice = function(e) {
        try {
            var data = $('img', this).data('node')
        	if (!data.flag_cannot_trade) {
	            $(this).addClass('selected-delete')
                }
        } catch (e) {}
    }
    var unhoverMinBidChoice = function(e) {
	//tipTool.hide(e)
	$(this).removeClass('selected-delete')
    }
    var removeMinBidChoice = function(e) {
	$('img', this).fadeOut().remove()
	$(this).removeClass('selected selected-delete')
	minTool.chooser.updateCount()
    }
    var copyToMinbidChooser = function(e) {
	var source = $(event.target)
	var target = $("#chooser-add-listing-min-bid td div:empty").first()
	if (!target.length) { return }
	target.prepend(source.clone())
	minTool.chooser.updateCount()
    }
    //$('#backpack-mb td div img').dblclick(copyToMinbidChooser)
    $('#chooser-add-listing-min-bid td').hover(hoverMinBidChoice, unhoverMinBidChoice)
    $('#chooser-add-listing-min-bid td').dblclick(removeMinBidChoice)
    $('#add-listing-min-bid-show').slideUp(750)
    $('#add-listing-min-bid-wrapper').fadeIn('slow')
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


var backpackReady = function(backpack, listings, profile) {
    var count = backpack.length // count - count_untradable_items - count_my_listing_items
    var addTool = new BackpackListingTool(backpack, listingItemsUids(listings))
    var schema = new SchemaTool()
    var tipTool = new TooltipView(schema)
    var hoverItem = function(e) {
        tipTool.show(e)
        try {
            var data = $('img', this).data('node')
        	if (!data.flag_cannot_trade) {
	            $(this).addClass('outline')
                }
        } catch (e) {}
    }
    var unhoverItem = function(e) {
        //tipTool.hide(e)
        $(this).removeClass('outline')
    }
    var msg = (count > 0) ? "You've got {0} item{1} to auction.".format(count, (count==1?'':'s')) : "Your backpack is empty!"

    smallMsg(msg).delay(3000).fadeAway()
    $('a[href="/listing/add"]').fadeAway()
    $('div.organizer-view td').hover(hoverItem, unhoverItem)
    addTool.show()
}


var listingsError = function(err) {
    console.error('get listings error:', err)
}


var listingsReady = function(listings, profile) {
    smallMsg('Loading your backpack...')
    new BackpackLoader({
	success: function (backpack) { backpackReady(backpack, listings, profile) },
        suffix: profile.id64})
}


var profileReady = function(profile) {
    showProfile(profile)
    smallMsg('Profile loaded.  Welcome back, ' + profile['personaname'] + '!')
    new ListingsLoader({success: function(listings) { listingsReady(listings, profile) },
			suffix: profile.steamid})
}


var schemaReady = function(schema) {
    smallMsg('Loading your profile...')
    new AuthProfileLoader({success: profileReady})
}



$(document).ready(function() {
    $("#profile-buttons a[href='/listing/add']").parent().fadeAway()
    $('#add-listing-min-bid-show a').click(showMinBid)
    $('div.organizer-view td').live('click', selectItem)
    $('#chooser-add-listing-min-bid td').live('click', maybeDeselectLast)
    smallMsg('Loading item schema...')
    $('#backpack-a td div img').live('dblclick', maybeMoveToChooser)
    new SchemaLoader({success: schemaReady})
})

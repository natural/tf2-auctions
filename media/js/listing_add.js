//
// NEW:  use full width backpack for player items.
//

var pid = '#listing-add-';

(function() {

oo.config({prefix: pid, auth: {settings: 1, complete: 1}})


//
// encapsulates the minimum bid items tool and the corresponding
// chooser.
//
var MinBidTool = function() {
    var schemaTool = oo.util.schema(),
        items = schemaTool.tradableBackpack()
    var bpTool = oo.backpack.itemTool({
	items: items,
	slug: 'mb',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	filters: true,
	help: 'Select the minimum items you will consider for a trade. You can select up to 10 items.',
	rowGroups: oo.backpack.pageGroup.slim(Math.round(items.length*0.01) / 0.01),
	altOrdering: true,
    })
    var chTool = this.chooser = oo.backpack.chooserTool({
	backpackSlug: 'mb',
	chooserSlug: 'listing-add-min-bid',
	selectDeleteHover: true,
	copy: true,
	counter: true
    })
    bpTool.init()
    chTool.init()
}


//
// encapsulates the user's backpack when adding a listing.
//
var BackpackListingTool = function(params) {
    var self = this,
        defDesc  = 'Enter a description.',
        bpTool = oo.backpack.itemTool({
	    items: params.backpack.result.items.item,
	    listingUids: params.listingUids,
	    bidUids: params.bidUids,
	    slug: 'a',
	    navigator: true,
	    toolTips: true,
	    select: true,
	    outlineHover: true,
	    cols: 5,
            title: 'Your Backpack',
	    help: 'Drag items from your backpack into the area below.  Double click works, too.',
	    rowGroups: oo.backpack.pageGroup.slim(params.backpack.result.num_backpack_slots)
	})
    var chTool = self.chooser = oo.backpack.chooserTool({
	backpackSlug: 'a',
	chooserSlug: 'listing-add-item',
        title: 'Your Listing',
	help: 'Remove items by dragging them to your backpack.  Double click will remove, too.',
	afterDropMove: function(item) { $('#bp-chooser-listing-add-item-error').parent().slideUp() }
    })

    oo.model.auth.init()
	.success(function(profile) {
	    var settings = profile.settings
	    bpTool.init(profile.settings)
	    chTool.init(profile.settings)
	    if (profile.subscription && profile.subscription.status == 'verified') {
		oo('subscriber-pod').show()
		oo('min-bid-currency-amount').keyup(function () {
		    this.value = this.value.replace(/[^0-9\.\,]/g,'');
		})
		oo('min-bid-currency-use').click(function() {
		    var dis = !oo('min-bid-currency-use').attr('checked')
		    oo('min-bid-currency-amount').attr('disabled', dis)
		    oo('min-bid-currency-type').attr('disabled', dis)
		})
	    } else {
		oo('subscriber-pod').remove()
	    }
	})

    self.show = function() {
	oo('own-backpack').fadeBack()
	var width = $('table.bp-placed').width()
	oo('fields textarea').width(width).height(width/4).text(defDesc)
	$('#a-bp-intro-pod, #listing-add-item-ch-intro-pod')
	    .addClass('center').animate({width:width})
	oo('cancel').click(self.cancel)
	oo('submit').click(self.submit)
	oo('description').focusin(function() {
	    if ($(this).text() == defDesc) { $(this).text('') }
	})

	var sliderChange = function(event, ui) {
	    var v = ui.value
	    oo('duration').text(v + ' day' + (v==1 ? '' : 's'))
	}

	var slider = oo('duration-slider').slider({
	    animate: true,
	    max: 30,
	    min:1,
	    value: 15,
	    change: sliderChange,
	    slide: sliderChange
	})
    }

    self.cancel = function() {
	oo('own-backpack').fadeAway()
	oo('intro').fadeBack().slideDown(750)
	$('html body').animate({scrollTop: 0})
	oo('after-cancel').slideDown().prev().slideUp()
	return false
    }

    self.postOkay = function(data, status, req) {
	oo('working').text('Complete.  Click the link to view your listing.')
	oo('success a').attr('href', '/listing/{0}'.fs(data.key))
	oo('success').fadeIn()
    }

    self.postError = function(req, status, err) {
	oo('working').text('Something went wrong.  Check the error below.').fadeIn()
	oo('error').text(req.statusText).parent().fadeIn()
    }

    self.addListing = function(input) {
	var output = {}
	var items = output.items = []
	var min_bid = output.min_bid = []
	output.bid_currency_use = input.bid_currency_use
	output.bid_currency_start = input.bid_currency_start
	output.bid_currency_type = input.bid_currency_type
	output.feature_listing = input.feature_listing
	output.days = input.days
	output.desc = input.desc
	$.each(input.items, function(idx, img) {
	    items.push( $(img).data('node'))
	})
	if (!input.bid_currency_use) {
            $.each(input.min_bid, function(idx, img) {
		min_bid.push( $(img).data('node').defindex )
	    })
	}
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
	console.error(errors)
	$.each(errors, function(index, error) {
	    var ele = $('{0}-error'.fs(error.id))
	    ele.text('Error: {0}'.fs(error.msg)).parent().slideDown()
	    if (index==0) { ele.parent().scrollTopAni() }
	})
    }

    self.submit = function() {
	// quick and simple client-side validation before POST.  the
	// server will double check our work, too.
	var errs = []
	// 1.  listing items: uniqueid + item text
	var items = $('#bp-chooser-listing-add-item img')
	if (items.length < 1 || items.length > 10) {
	    errs.push({id:'#bp-chooser-listing-add-item',
		       msg:'Select 1-10 items from your backpack.'})
	}
	// 2.  description
	var desc = oo('description').val()
	desc = (desc == defDesc ? '' : desc)
	if (desc.length > 400) {
	    $("#listing-add-description").keyup(function (a) {
		if ( $(this).val().length <= 400) {
		    oo('description-error:visible').slideUp()
		}
	    })
	    errs.push({id:'#listing-add-description',
		       msg:'Too much text.  Make your description shorter.'})
	}
        // 3.  duration
	var days = oo('duration-slider').slider('value')
	if (days < 1 || days > 30) {
	    // this can only happen if the user is twiddling data
	    // outside of the form.
	    errs.push({id:'#listing-add-duration-slider',
		       msg:'Invalid duration.  Select 1-30 days.'})
	}
        // 4.  min bid items: defindexes
	var min_bid = $('#bp-chooser-listing-add-min-bid td img')
	if (min_bid.length > 10) {
            errs.push({id:'#bp-chooser-listing-add-min-bid',
		       msg:'Too many items. Select 0-10 items as a minimum bid.'})
	}
	// 5.  premium subscriber min bid currency: checkbox + amount
	var bid_currency_use = oo('min-bid-currency-use').attr('checked')
	var bid_currency_start = 0.0
	var bid_currency_type = null
	if (bid_currency_use) {
	    bid_currency_start = oo('min-bid-currency-amount').val()
	    bid_currency_type = oo('min-bid-currency-type option:selected').val()
	    min_bid = []
	}
	// 6.  premium subscriber featured listing
	var feature_listing = oo('feature-listing').attr('checked')

	// 7. agree w/ site terms
	if (! oo('terms').attr('checked')) {
	    oo('terms').click(function (e) {
		if (e.target.checked) {
		    oo('terms-error').slideUp()
		} else {
		    oo('terms-error').slideDown()
		}
	    })
	    errs.push({id: '#listing-add-terms',
		       msg:'You must read and agree with site rules, terms, and conditions.'})
	}

	if (errs.length) {
	    self.showErrors(errs)
	} else {
	    oo('buttons').slideUp('slow')
	    oo('working').removeClass('null').text('Working...').fadeIn('fast')
	    self.addListing({
		items: items, desc: desc, days: days, min_bid: min_bid,
		bid_currency_use: bid_currency_use,
		bid_currency_start: bid_currency_start,
		bid_currency_type: bid_currency_type,
		feature_listing: feature_listing,
	    })
	}
	return false
    }
}


//
// initializes and shows the minimum bid item display and its
// corresponding chooser.
//
var showMinBid = function() {
    var minTool = new MinBidTool()

    var removeMinBidChoice = function(e) {
	$('img', this).fadeOut().remove()
	$(this).removeClass('selected selected-delete')
	minTool.chooser.updateCount()
    }

    var copyToMinbidChooser = function(e) {
	var source = $(e.target)
	var target = $("#bp-chooser-listing-add-min-bid td div:empty").first()
	if (!target.length) { return;  }
	var clone = source.clone()
	clone.data('node', source.data('node'))
	target.prepend(clone)
	minTool.chooser.updateCount()
    }

    $('#bp-mb td div img').live('dblclick', copyToMinbidChooser)
    $('#bp-chooser-listing-add-min-bid td').live('dblclick', removeMinBidChoice)
    oo('min-bid-show').slideUp(750)
    oo('min-bid-pod').fadeIn('slow')
    return false
}


//
//
//
var backpackReady = function(backpack, listings, bids, profile) {
    var addTool = new BackpackListingTool({
	backpack: backpack,
	listingUids: oo.util.itemUids(listings),
	bidUids: oo.util.itemUids(bids)
    })
    $('#bp-placed-a td div img')
	.live('dblclick', addTool.chooser.moveToChooser)
    $('#bp-unplaced-a td div img')
	.live('dblclick', addTool.chooser.moveToChooser)
    $('#bp-chooser-listing-add-item td div img')
	.live('dblclick', addTool.chooser.moveToOriginal)
    oo.view.message().fadeAway()
    // lame, quick hack until this module gets a rewrite for the MVC
    // framework:
    window.setTimeout(addTool.show, 1000)
}


var listingsReady = function(listings, bids, profile) {
    oo.view.message('Loading your backpack...')
    oo.data.backpack({suffix: profile.id64})
	.success(function (backpack) {
	    backpackReady(backpack, listings, bids, profile)
	})
}


var profileReady = function(profile) {
    oo.view.message('Profile loaded.')
    var listingsLoaded = function(listings) {
	oo.data.bids({suffix: profile.steamid})
	    .success(function(bids) {
		listingsReady(listings, bids, profile)
	    })
    }
    oo.data.listings({suffix: profile.steamid}).success(listingsLoaded)
}


var schemaReady = function(schema) {
    oo.view.message('Loading your profile...')
    oo.model.auth.init().success(profileReady)
}



$(document).ready(function() {
    oo('min-bid-currency-use').click(function() {
        if ($(this).attr('checked')) {
	    oo('min-bid-wrapper-pod').slideUp()
	} else {
	    oo('min-bid-wrapper-pod').slideDown()
	}
    })
    oo.view.message('Loading item schema...')
    oo.data.schema().success(schemaReady)
    oo('min-bid-show a').click(showMinBid)
    oo('show-terms').click(oo.view.showTermsDialog)
})
})()

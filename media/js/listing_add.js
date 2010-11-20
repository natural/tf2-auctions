var pid = '#listing-add'
var $$ = function(suffix, next) { return $('{0}-{1}'.fs(pid, suffix), next) }


//
// encapsulates the minimum bid items tool and the corresponding
// chooser.
//
var MinBidTool = function() {
    var schemaTool = new SchemaTool()
    var bpTool = new BackpackItemsTool({
	items: schemaTool.tradableBackpack(),
	slug: 'mb',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	filters: true,
	help: 'Select the minimum items you will consider for a trade. You can select up to 10 items.'
    })
    var chTool = this.chooser = new BackpackChooserTool({
	backpackSlug: 'mb',
	chooserSlug: 'listing-add-min-bid',
	selectDeleteHover: true,
	copy: true,
    })
    bpTool.init()
    chTool.init()
}


//
// encapsulates the user's backpack when adding a listing.
//
var BackpackListingTool = function(params) {
    var self = this
    var defDesc  = 'Enter a description.'

    var bpTool = new BackpackItemsTool({
	items: params.backpack,
	listingUids: params.listingUids,
	bidUids: params.bidUids,
	slug: 'a',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	cols: 5,
	help: 'Drag items from your backpack into the area below.  Double click works, too.',
    })

    var chTool = self.chooser = new BackpackChooserTool({
	backpackSlug: 'a',
	help: 'Remove items by dragging them to your backpack.  Double click will remove, too.',
	chooserSlug: 'listing-add-item',
    })

    new AuthProfileLoader({
	suffix: '?settings=1',
	success: function(profile) {
	    bpTool.init(profile.settings)
	    chTool.init(profile.settings)
	}
    })

    self.show = function() {
	$$('own-backpack').fadeBack()
	var width = $('table.bp-placed').width()
	$$('fields textarea').width(width).height(width/4).text(defDesc)
	$$('cancel').click(self.cancel)
	$$('submit').click(self.submit)
	$$('description').focusin(function() {
	    if ($(this).text() == defDesc) { $(this).text('') }
	})

	var sliderChange = function(event, ui) {
	    var v = ui.value
	    $$('duration').text(v + ' day' + (v==1 ? '' : 's'))
	}

	var slider = $$('duration-slider').slider({
	    animate: true,
	    max: 30,
	    min:1,
	    value: 15,
	    change: sliderChange,
	    slide: sliderChange
	})
    }

    self.cancel = function() {
	// TODO: reveal nav away/start again
	$$('own-backpack').fadeAway()
	$$('intro').fadeBack().slideDown(750)
	$('html body').animate({scrollTop: 0})
	return false
    }

    self.postOkay = function(data, status, req) {
	$$('working').text('Complete.  Click the link to view your listing.')
	$$('success a').attr('href', '/listing/{0}'.fs(data.key))
	$$('success').fadeIn()
    }

    self.postError = function(req, status, err) {
	$$('working').text('Something went wrong.  Check the error below.').fadeIn()
	$$('error').text(req.statusText).parent().fadeIn()
    }

    self.addListing = function(input) {
	var output = {}
	var items = output.items = []
	var min_bid = output.min_bid = []
	output.days = input.days
	output.desc = input.desc
	$.each(input.items, function(idx, img) {
	    items.push( $(img).data('node'))
	})
        $.each(input.min_bid, function(idx, img) {
	    min_bid.push( $(img).data('node').defindex )
	})
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
	    errs.push({id:'#listing-add-item-chooser',
		       msg:'Select 1-10 items from your backpack.'})
	}
	// 2.  description
	var desc = $$('description').val()
	desc = (desc == defDesc ? '' : desc)
	if (desc.length > 400) {
	    $("#listing-add-description").keyup(function (a) {
		if ( $(this).val().length <= 400) {
		    $$('description-error:visible').slideUp()
		}
	    })
	    errs.push({id:'#listing-add-description',
		       msg:'Too much text.  Make your description shorter.'})
	}
        // 3.  duration
	var days = $$('duration-slider').slider('value')
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
	// 5. agree w/ site terms
	if (! $$('terms').attr('checked')) {
	    $$('terms').click(function (e) {
		$$('terms-error').slideToggle()
	    })
	    errs.push({id: '#listing-add-terms',
		       msg:'You must read and agree with site rules, terms, and conditions.'})
	}

	if (errs.length) {
	    self.showErrors(errs)
	} else {
	    $$('buttons').slideUp('slow')
	    $$('working').removeClass('null').text('Working...').fadeIn('fast')
	    self.addListing({items: items, desc: desc, days: days, min_bid: min_bid})
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
	var source = $(event.target)
	var target = $("#bp-chooser-listing-add-min-bid td div:empty").first()
	if (!target.length) { return }
	var clone = source.clone()
	clone.data('node', source.data('node'))
	target.prepend(clone)
	minTool.chooser.updateCount()
    }
    $('#bp-mb td div img').live('dblclick', copyToMinbidChooser)
    $('#bp-chooser-listing-add-min-bid td').live('dblclick', removeMinBidChoice)
    $$('min-bid-show').slideUp(750)
    $$('min-bid-pod').fadeIn('slow')
    return false
}


//
//
//
var backpackReady = function(backpack, listings, bids, profile) {
    var addTool = new BackpackListingTool({
	backpack: backpack,
	listingUids: listingItemsUids(listings),
	bidUids: bidItemsUids(bids)
    })
    $('#bp-placed-a td div img')
	.live('dblclick', addTool.chooser.moveToChooser)
    $('#bp-unplaced-a td div img')
	.live('dblclick', addTool.chooser.moveToChooser)
    $('#bp-chooser-listing-add-item td div img')
	.live('dblclick', addTool.chooser.moveToOriginal)
    siteMessage().fadeAway()
    addTool.show()
}


var listingsReady = function(listings, bids, profile) {
    siteMessage('Loading your backpack...')
    new BackpackLoader({
        suffix: profile.id64,
	success: function (backpack) {
	    backpackReady(backpack, listings, bids, profile)
	}
    })
}


var profileReady = function(profile) {
    siteMessage('Profile loaded.')
    new ProfileTool(profile).defaultUserAuthOkay()
    var listingsLoaded = function(listings) {
	new BidsLoader({
	    suffix: profile.steamid,
	    success: function(bids) {
		listingsReady(listings, bids, profile)
	    }
	})
    }
    new ListingsLoader({suffix: profile.steamid, success: listingsLoaded})
}


var schemaReady = function(schema) {
    siteMessage('Loading your profile...')
    new AuthProfileLoader({suffix: '?settings=1', success: profileReady})
}


$(document).ready(function() {
    siteMessage('Loading item schema...')
    new SchemaLoader({success: schemaReady})
    $$('min-bid-show a').click(showMinBid)
    $$('show-terms').click(showTermsDialog)
})

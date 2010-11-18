

var MinBidTool = function(schema) {
    var backpack = $.map(values(schema.tradable()), function(item, index) {
	return {defindex:item.defindex, pos:index+1}
    })

    var bpTool = new NewBackpackItemsTool({
	items: backpack,
	slug: 'mb',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	help: 'Select the minimum items you will consider fora trade. You can select up to 10 items.'
    })

    var chTool = new NewBackpackChooser({
	backpackSlug: 'mb',
	chooserSlug: 'listing-add-min-bid',
	title: '',
	copy:true
    })

    bpTool.init()
    chTool.init()
}


var BackpackListingTool = function(backpack, listingUids, bidUids) {
    var self = this
    var defDesc  = 'Enter a description.'

    var bpTool = new NewBackpackItemsTool({
	items: backpack,
	listingUids: listingUids,
	bidUids: bidUids,
	slug: 'a',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	help: 'Drag items from your backpack into the area below.  Double click works, too.',

    })

    var chTool = new NewBackpackChooser({
	backpackSlug: 'a',
	help: 'Remove items by dragging them to your backpack.  Double click will remove, too.',
	chooserSlug: 'listing-add-item',
	title: 'Backpack??'
    })

    new AuthProfileLoader({
	suffix: '?settings=1',
	success: function(profile) {
	    chTool.init(profile.settings)
	    bpTool.init(profile.settings)
	}
    })

    self.show = function() {
	$('#listing-add-own-backpack').fadeBack()
	var width = $('table.bp-placed').width()
	$('#listing-add-fields textarea').width(width).height(width/4).text(defDesc)
	$('#listing-add-cancel').click(self.cancel)
	$('#listing-add-submit').click(self.submit)
	$('#listing-add-description').focusin(function() {
	    if ($(this).text() == defDesc) { $(this).text('') }
	})

	var sliderChange = function(event, ui) {
	    var v = ui.value
	    $('#listing-add-duration').text(v + ' day' + (v==1 ? '' : 's'))
	}

	var slider = $('#listing-add-duration-slider').slider({
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
	$('#listing-add-own-backpack').fadeAway()
	$('#listing-add-intro').fadeBack().slideDown(750)
	$('html body').animate({scrollTop: 0})
	return false
    }

    self.postOkay = function(data, status, req) {
	console.log('post okay:', data, status, req)
	$('#listing-add-working').text('Complete.  Click the link to view your listing.')
	$('#listing-add-success a').attr('href', '/listing/'+data.key)
	$('#listing-add-success').fadeIn()
    }

    self.postError = function(req, status, err) {
	console.error('post error:', req, status, err)
	$('#listing-add-working').text('Something went wrong.  Check the error below.').fadeIn()
	$('#listing-add-error').text(req.statusText).parent().fadeIn()
    }

    self.addListing = function(input) {
	var output = {}
	var items = output.items = []
	var min_bid = output.min_bid = []
	output.days = input.days
	output.desc = input.desc
	$.each(input.items, function(idx, img) { items.push( $(img).data('node')) })
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
	var desc = $('#listing-add-description').val()
	desc = (desc == defDesc ? '' : desc)
	if (desc.length > 400) {
	    $("#listing-add-description").keyup(function (a) {
		if ( $(this).val().length <= 400) {
		    $('#listing-add-description-error:visible').slideUp()
		}
	    })
	    errs.push({id:'#listing-add-description',
		       msg:'Too much text.  Make your description shorter.'})
	}
        // 3.  duration
	var days = $('#listing-add-duration-slider').slider('value')
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
	if (! $('#listing-add-terms').attr('checked')) {
	    $('#listing-add-terms').click(function (e) {
		$('#listing-add-terms-error').slideToggle()
	    })
	    errs.push({id: '#listing-add-terms',
		       msg:'You must read and agree with site rules, terms, and conditions.'})
	}

	if (errs.length) {
	    self.showErrors(errs)
	} else {
	    $('#listing-add-buttons').slideUp('slow')
	    $('#listing-add-working').removeClass('null').text('Working...').fadeIn('fast')
	    self.addListing({items: items, desc: desc, days: days, min_bid: min_bid})
	}
	return false
    }

    self.moveItemToChooser = function(event) {
	var source = $(event.target)
	var target = $('#bp-chooser-listing-add-item td div:empty').first()
	var cell = source.parent().parent()
	if ((cell.hasClass('cannot-trade')) || (!target.length)) { return }
	cell.removeClass('selected')
	source.data('original-cell', cell)
	var others = $('span.equipped, span.quantity, span.jewel', cell)
	target.prepend(source)
	target.append(others)
	//bpChs.updateCount()
	$('#bp-chooser-listing-add-item-error').parent().slideUp()
    }

    self.moveItemOriginal = function(event) {
	var source = $(event.target)
	var target = $('div', source.data('original-cell'))
	if (target.length==1) {
    	    var others = $('span.equipped, span.quantity, span.jewel', source.parent())
	    target.append(source)
	    target.append(others)
	    //bpChs.updateCount()
	}
    }

}


var showMinBid = function() {
    var schema = new SchemaTool()
    var minTool = new MinBidTool(schema)

    var hoverMinBidChoice = function(e) {
        try {
            var data = $('img', this).data('node')
        	if (!data.flag_cannot_trade) {
	            $(this).addClass('selected-delete')
                }
        } catch (e) {}
    }
    var unhoverMinBidChoice = function(e) {
	$(this).removeClass('selected-delete')
    }
    var removeMinBidChoice = function(e) {
	$('img', this).fadeOut().remove()
	$(this).removeClass('selected selected-delete')
	//minTool.chooser.updateCount()
    }
    var copyToMinbidChooser = function(e) {
	var source = $(event.target)
	var target = $("#bp-chooser-listing-add-min-bid td div:empty").first()
	if (!target.length) { return }
	var clone = source.clone()
	clone.data('node', source.data('node'))
	target.prepend(clone)
	//minTool.chooser.updateCount()
    }
    $('#bp-mb td div img').dblclick(copyToMinbidChooser)
    $('#bp-chooser-listing-add-min-bid td').hover(hoverMinBidChoice, unhoverMinBidChoice)
    $('#bp-chooser-listing-add-min-bid td').dblclick(removeMinBidChoice)
    $('#listing-add-min-bid-show').slideUp(750)
    $('#listing-add-min-bid-pod').fadeIn('slow')
    return false
}





var maybeDeselectLast = function() {
    var self = $(this)
    var maybeDeselect = function() {
	if ($('#listing-add-min-bid-chooser td.selected').length > 10) {
	    self.removeClass('selected')
	}
    }
    window.setTimeout(maybeDeselect, 150)
}




var backpackReady = function(backpack, listings, bids, profile) {
    var count = backpack.length // count - count_untradable_items - count_my_listing_items
    var addTool = new BackpackListingTool(backpack, listingItemsUids(listings), bidItemsUids(bids))

    var msg = (count > 0) ? "You've got {0} item{1} to auction.".fs(count, (count==1?'':'s')) : "Your backpack is empty!"
    $('a[href="/listing/add"]').fadeAway()
    $('#bp-placed-a td div img').live('dblclick', addTool.moveItemToChooser)
    $('#bp-unplaced-a td div img').live('dblclick', addTool.moveItemToChooser)
    $('#bp-chooser-listing-add-item td div img').live('dblclick', addTool.moveItemOriginal)
    siteMessage().fadeAway()
    addTool.show()
}


var listingsError = function(err) {
    console.error('get listings error:', err)
}


var listingsReady = function(listings, bids, profile) {
    siteMessage('Loading your backpack...')
    new BackpackLoader({
	success: function (backpack) { backpackReady(backpack, listings, bids, profile) },
        suffix: profile.id64
    })
}


var profileReady = function(profile) {
    new ProfileTool(profile).defaultUserAuthOkay()
    siteMessage('Profile loaded.  Welcome back, ' + profile['personaname'] + '!')
    var listingsLoaded = function(listings) {
	new BidsLoader({
	    success: function(bids) { listingsReady(listings, bids, profile) },
	    suffix: profile.steamid
	})
    }
    new ListingsLoader({
	success: listingsLoaded,
	suffix: profile.steamid
    })
}


var schemaReady = function(schema) {
    siteMessage('Loading your profile...')
    var pt = new ProfileTool()
    new AuthProfileLoader({
	suffix: '?settings=1',
	success: profileReady,
	error: pt.defaultUserAuthError
    })
}



$(document).ready(function() {
    $("#profile-buttons a[href='/listing/add']").parent().fadeAway()
    $('#listing-add-min-bid-show a').click(showMinBid)
//    $('#listing-add-min-bid-chooser td').live('click', maybeDeselectLast)
    $('#listing-add-show-terms').click(showTermsDialog)
    siteMessage('Loading item schema...')
    new SchemaLoader({success: schemaReady})
})

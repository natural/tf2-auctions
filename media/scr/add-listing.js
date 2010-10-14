var NewListingTool = function(backpack) {
    var self = this
    var bp = new BackpackView('a')
    self.backpack = backpack
    ItemsTool.init(backpack) // TODO:  fix this with an instance somewhere else
    bp.navChanged()
    BackpackItemsTool.placeItems('a', ItemsTool.items)



    this.show = function() {
	$('#add-listing-intro').fadeAway().slideUp(750)
	$('#add-listing-own-backpack').fadeBack()

	$('#backpack-header-a h3').first().html('Your Backpack')
	$('#backpack-header-a div').first().html('Drag items from your backpack into the Listing Items area below.');

	var width = $('#backpack-a tbody').width()
	$('#backpack-tools-a').width(width)
	$('#add-listing-fields textarea').width(width).height(width/4).text('Enter a description.')
	$('#add-listing-fields').width( $('#backpack-a tbody').width())

	$('#add-listing-cancel').click(self.cancel)
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

    this.cancel = function() {
	// TODO: reset backpack
	$('#add-listing-own-backpack').fadeAway()
	$('#add-listing-intro').fadeBack().slideDown(750)
	$('html body').animate({scrollTop: 0})
	return false
    }

    this.initDrag = function() {
	var updateCount = function() {
	    var len = $('#backpack-listing img').length
	    var txt = '(' + len + ' ' + (len == 1 ? 'item' : 'items') + ')'
	    $('#add-listing-title-extra').text(txt)
	}
	var dropItem = function(event, ui) {
	    if ($(this).children().length > 0) { return false }
	    $(this).parent().removeClass('selected')
	    $(this).append( $('div img', ui.draggable))
	    $("span.equipped:only-child, span.quantity:only-child").hide().detach()
	    window.setTimeout(updateCount, 150) // delay for accurate counting
	}
	var dragFromBackpack = function(event, ui) {
	    var img = $('img', event.target) // source img, not the drag img
            try {
		//console.log( img.data('node').flag_cannot_trade )
		return !(img.data('node').flag_cannot_trade)
	    } catch (e) { return false }
	}
	var dragShow = function(event, ui) {
	    //console.log(event, ui)
	    ui.helper.addClass('selected')
	}
	var dropOver = function(event, ui) { $(this).parent().addClass('outline') }
	var dropOut = function(event, ui) { $(this).parent().removeClass('outline') }

	$('#backpack-a table.backpack td').draggable({
            containment: '#add-listing-own-backpack', helper: 'clone', cursor: 'move',
	    drag: dragFromBackpack, start: dragShow})
	$('#backpack-a table.backpack td div').droppable(
	    {accept: '#chooser-add-listing-item td', drop: dropItem, over: dropOver, out: dropOut})

	$('#chooser-add-listing-item td').draggable({
            containment: '#add-listing-own-backpack', helper: 'clone', cursor: 'move',
	    start: dragShow})
	$('#chooser-add-listing-item td div').droppable(
	    {accept: '#backpack-a td', drop: dropItem, over: dropOver, out: dropOut})

    }
}


var backpackReady = function(backpack) {
    var count = backpack.length
    // count - count_untradable_items - count_my_listing_items
    if (count > 0) {
        var msg = "You've got " + count + " item" + (count==1?'':'s') + " to auction."
    } else {
        var msg = "You don't have anything to trade.  How can this be?  Go play!"
    }
    $('#load-own-msg-backpack').text(msg)
    $('#add-listing-help').fadeIn()
    var nlt = new NewListingTool(backpack)
    $('#add-listing-get-started').click(nlt.show)
}


var profileReady = function(profile) {
    $('#avatar:empty').html(makeImg({src: profile.avatar}))
    $('#load-own-msg-profile').text('Profile loaded.  Welcome back, ' + profile['personaname'] + '1')
    console.log('profile ready', profile)
    new BackpackLoader({success: backpackReady, id64: __id64__})
}


var schemaReady = function(schema) {
    SchemaTool.init(schema)
    new ProfileLoader({success: profileReady, id64: __id64__})
}

var showAndPopMinBid = function() {
    $('#add-listing-minbid-wrapper').slideDown(750)
    $('#add-listing-minbid-show').slideUp(750)
    var c = 0, p = '#add-listing-minbid-'
    $.each(SchemaTool.tradable(), function(idx, item) {
	$(p+c + ' div').html( makeImg({src:item.image_url, height:64, width:64, }) )
	c += 1
    })
    return false
}


$(document).ready(function() {
    $("#profile-buttons a[href='/add-listing']").parent().fadeAway()
    $('#load-own-msg-profile').text('Loading your profile...')
    $('#load-own-msg-backpack').text('Loading your backpack...')
    new SchemaLoader({success: schemaReady})

    $('div.organizer-view td').live('mouseover', function() {
	try {
	    var data = $('img', this).data('node')
	    if (! data.flag_cannot_trade ) {
		$(this).addClass('outline')
	    }
	} catch (e) {}
    })
    $('div.organizer-view td').live('mouseout', function() {
	$(this).removeClass('outline')
    })
    $('div.organizer-view td').live('click', function() {
	if ($('img', this).length > 0) {
	    $(this).toggleClass('selected')
	}
    })

    $('#add-listing-minbid-show a').click(showAndPopMinBid)
})

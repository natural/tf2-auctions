var NewListingTool = function(backpack) {
    var self = this
    var bp = new BackpackView('a')
    self.backpack = backpack
    ItemsTool.init(backpack) // TODO:  fix this with an instance somewhere else
    bp.navChanged()
    BackpackItemsTool.placeItems('a', ItemsTool.items)

    this.show = function() {
	$('#show-new-listing-backpack').fadeOut()
	$('#show-new-listing-backpack-wrapper div').first().fadeOut()
	$('#new-listing-backpack').slideDown().fadeIn()
	$('#backpack-header-a h3').first().html('Your Backpack')
	$('#backpack-header-a div').first().html('Drag items from your backpack into the Listing Items area below.');

	var width = $('#backpack-a tbody').width()
	$('#toolbar-a').width(width)
	$('#listing-fields textarea').width(width).height(width/4)

	$('#listing-fields').width( $('#backpack-a tbody').width())
	$('html body').animate({scrollTop: $('#show-new-listing-backpack-wrapper').position().top - 10})
	$('#new-listing-backpack-cancel').click(self.cancel)
	self.initDrag()

	var slider = $("#listing-duration-slider").slider(
	    {animate: true, max: 30, min:1, value: 30, change: function(event, ui) {
		var v = ui.value
		$("#listing-duration").text(v + " day" + (v==1 ? "" : "s"))
	    }}
	)

	return false
    }

    this.cancel = function() {
	// TODO: reset backpack
	$('#new-listing-backpack').fadeOut()
	$('#show-new-listing-backpack').fadeIn()
	$('#show-new-listing-backpack-wrapper div').first().fadeIn()
	return false
    }

    this.initDrag = function() {
	var updateCount = function() {
	    var len = $('#backpack-listing img').length
	    var txt = '(' + len + ' ' + (len == 1 ? 'item' : 'items') + ')'
	    $('#listing-title-extra').text(txt)
	}
	var dropItem = function(event, ui) {
	    if ($(this).children().length > 0) { return false }
	    $(this).parent().removeClass('itemHover')
	    $(this).append( $('div img', ui.draggable))
	    $("span.equipped:only-child, span.quantity:only-child").hide().detach()
	    window.setTimeout(updateCount, 150) // delay for accurate counting
	}
	var dragShow = function(event, ui) { ui.helper.addClass('selected') }
	var dropOver = function(event, ui) { $(this).parent().addClass('itemHover') }
	var dropOut = function(event, ui) { $(this).parent().removeClass('itemHover') }
	$('#backpack-a table.backpack td').draggable({
            containment: '#new-listing-backpack', helper: 'clone', cursor: 'move',
	    start: dragShow})
	$('#backpack-listing td').draggable({
            containment: '#new-listing-backpack', helper: 'clone', cursor: 'move',
	    start: dragShow})
	$('#backpack-listing td div').droppable(
	    {accept: '#backpack-a td', drop: dropItem, over: dropOver, out: dropOut})
	$('#backpack-a table.backpack td div').droppable(
	    {accept: '#backpack-listing td', drop: dropItem, over: dropOver, out: dropOut})
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
    $('#load-own-backpack-msg').text(msg)
    $('#show-new-listing-backpack-wrapper').fadeIn().slideDown()
    var nlt = new NewListingTool(backpack)
    $('#show-new-listing-backpack').click(nlt.show)
}


var profileReady = function(profile) {
    $('#avatar:empty').html(makeImg({src: profile.avatar}))
    $('#load-own-profile-msg').text('Profile loaded.  Welcome back, ' + profile['personaname'] + '1')
    console.log('profile ready', profile)
    new BackpackLoader({success: backpackReady, id64: __id64__})
}


var schemaReady = function(schema) {
    SchemaTool.init(schema)
    new ProfileLoader({success: profileReady, id64: __id64__})
}


$(document).ready(function() {
    $('#load-own-profile-msg').text('Loading your profile...')
    $('#load-own-backpack-msg').text('Loading your backpack...')
    new SchemaLoader({success: schemaReady})
})

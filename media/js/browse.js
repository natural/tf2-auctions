var $$ = function(suffix, next) { return $('#browse-'+suffix, next) } // slug defined in browse.pt


var optionChanged = function() {
    var searchOkay = function(results) {
	//$$('listings tbody:gt(0)').fadeOut()
	listingsReady(results)
    }
    var qs = $("#filters input[type='checkbox']").map(function(i,v) {
	return '{0}={1}'.format( $(v).attr('name'), $(v).attr('checked') ? 'on' : 'off')
    })
    qs.push('{0}={1}'.format('sort', $("#filters input[type='radio']:checked").attr('value')))
    new SearchLoader({
	success: searchOkay,
	suffix: '?' + qs.toArray().join('&')
    })
}


var addListing = function(listing, clone) {
    clone.removeClass('null prototype')
    if (listing.description) {
	$('.listing-description', clone).text(listing.description)
    } else {
	$('.listing-description-label', clone).empty()
	$('.listing-description', clone).empty()
    }
    $('.listing-owner', clone).text(listing.owner.personaname)
    $('.listing-avatar', clone).attr('src', listing.owner.avatar)

    var next = 1
    $.each(listing.items, function(index, item) {
	$('.item-display:nth-child(' + next + ') div', clone).append( $.toJSON(item) )
	next += 1
    })
    $('.browse-view-link a', clone).attr('href', '/listing/'+listing.id)
    $('.browse-listing-id', clone).text(listing.id)
    GL = listing
    $$('listings').prepend(clone)
}


var listingsReady = function(search) {
    $('div.listing-wrapper table').slideUp('fast').delay(500)
    $('div.listing-wrapper').queue(function() { $(this).remove() })
    if (search.listings.length) {
	var proto = $$('listings div.prototype')
	$.each(search.listings, function(idx, listing) {
	    var clone = proto.clone().addClass('listing-wrapper')
	    addListing(listing, clone)
	})
        new SchemaTool().setImages()
	$('div.listing-wrapper td.item-display div:empty').parent().remove()
    } else {
	$$('no-listings').text('Nothing found.  You should add a listing.').show()
    }
    smallMsg().fadeAway()
    $$('listings').slideDown('fast')


}


var schemaReady = function(schema) {
    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var hoverItem = function(e) { tt.show(e); $(this).addClass('outline')  }
    var unhoverItem = function(e) {  tt.hide(e);  $(this).removeClass('outline') }
    $('div.organizer-view td.item-display').live('mouseover', hoverItem)
    $('div.organizer-view td.item-display').live('mouseout', unhoverItem)

    smallMsg('Loading results...')
    new SearchLoader({success:listingsReady})
}


$(document).ready(function() {
    $("input[name='sort_date']").first().click()
    $("#filters input[type='checkbox']").click(optionChanged)
    $("#filters input[type='radio']").click(optionChanged)
    smallMsg('Loading schema...')
    new SchemaLoader({success: schemaReady})
    console.log('browse.js ready')
})

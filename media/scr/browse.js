var BrowseLoader = {
    okay: function(listings) {
	var table = $('#listings-browser')
	$.each(listings, function(index, listing) {
	    console.log(listing)
	    table.append(
		'<tbody><tr><td><span class="defindex-lazy">' + listing['items'][0]['defindex'] + '</span></td></tr></tbody>'
	    )
	})
    },
    error: function(err) {
	console.log('browse loader error', err)
    }
}


$(document).ready(function() {
    $.ajax({url: '/api/v1/get-listings',
	    dataType: 'json',
	    cache: true,
	    success: BrowseLoader.okay,
	    error: BrowseLoader.error
	   })
    console.log('listing browser ready')
})




$('not-document').ready(function() {
    $('body').bind('schema.ready', function(event, schema) {
	$.ajax({url: '/api/v1/browse-listings',
		dataType: 'json',
		cache: true,
		success: BrowseLoader.okay,
		error: BrowseLoader.error
	       })
	console.log('listing browser ready')
    })


})
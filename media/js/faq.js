oo.config('#faq-')


var faqsLoaded = function(category_entries) {
    $.each(category_entries, function(idx, ces) {
	var cat = ces[0].name
	var entries =  ces[1]
	if (entries.length) {
	    var title = $('.prototype.category-seed').clone().removeClass('null prototype')
	    $('h2', title).text(cat)
	    oo('content-pod').append(title)
	    $.each(entries, function(idx, pair) {
		var entry = $('.prototype.entry-seed').clone().removeClass('null prototype')
		$('.title', entry).text(pair.title)
		$('.entry', entry).html(pair.entry)
		oo('content-pod').append(entry)
	    })
	}
    })
    oo('content-pod').fadeIn()
}


var FaqLoader = oo.data.loader({
    prefix: '/api/v1/public/faq',
    name: 'FaqLoader'})


$(document).ready(function() {
    oo.data.auth()
    new FaqLoader({success: faqsLoaded })
})


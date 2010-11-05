var $$ = function(suffix, next) { return $('#faq-'+suffix, next) }


var faqsLoaded = function(category_entries) {
    $.each(category_entries, function(idx, ces) {
	var cat = ces[0].name
	var entries =  ces[1]
	if (entries.length) {
	    var title = $('.prototype.category-seed').clone().removeClass('null prototype')
	    $('h2', title).text(cat)
	    $$('content-pod').append(title)
	    $.each(entries, function(idx, pair) {
		var entry = $('.prototype.entry-seed').clone().removeClass('null prototype')
		$('.title', entry).text(pair.title)
		$('.entry', entry).html(pair.entry)
		$$('content-pod').append(entry)
	    })
	}
    })
    $$('content-pod').fadeIn()
}


var FaqLoader = makeLoader({
    prefix: '/api/v1/public/faq',
    name: 'FaqLoader'})


$(document).ready(function() {
    new AuthProfileLoader({success: defaultUserAuthOkay, error: defaultUserAuthError})
    new FaqLoader({success: faqsLoaded })
})

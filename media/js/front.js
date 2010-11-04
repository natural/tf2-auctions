var $$ = function(suffix, next) { return $('#front-'+suffix, next) }


var userAuthOkay = function(profile) {
    defaultUserAuthOkay(profile)
    $$('auth').slideDown()
}


var userAuthError = function(request, status, error) {
    defaultUserAuthError(request, status, error)
    $$('no-auth').slideDown()
}


var statsLoaded = function(stats) {
    $.each(keys(stats), function(idx, key) {
	$$(key.replace('_', '-')).text(stats[key])
    })
    $$('stats').slideDown()
}


var blogLoaded = function(entries) {
    $.each(entries, function(idx, entry) {
	var clone = $$('blog div.blog-seed').clone()
	clone.removeClass('blog-seed null prototype')
	$('.blog-title-seed', clone).text(entry.title)
	$('.blog-intro-seed', clone).html(entry.intro)
	$$('blog').append(clone)
	// categories, creator, link to entry, etc.
    })
    $$('blog').slideDown()
}


var BlogLoader = makeLoader({
    prefix: '/api/v1/public/blog-entries',
    name: 'BlogLoader'})


$(document).ready(function() {
    new AuthProfileLoader({success: userAuthOkay, error: userAuthError})
    new StatsLoader({success: statsLoaded })
    new BlogLoader({success: blogLoaded })

})

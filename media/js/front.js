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
    $.each(entries, function(idx, blogpost) {
	var clone = $$('blog div.blog-seed').clone()
	clone.removeClass('blog-seed null prototype')
	$('.blog-title-seed', clone).text(blogpost.title)
	$('.blog-intro-seed', clone).html(blogpost.intro)
	$('.blog-encoded-seed', clone).html(blogpost.entry)
	$$('blog').append(clone)

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

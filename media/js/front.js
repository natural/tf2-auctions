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


$(document).ready(function() {
    new AuthProfileLoader({success: userAuthOkay, error: userAuthError})
    new StatsLoader({success: statsLoaded })

})

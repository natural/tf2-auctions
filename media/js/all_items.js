var $$ = function(suffix, next) { return $('#all-items-'+suffix, next) }


var userAuthOkay = function(profile) {
    defaultUserAuthOkay(profile)
}


var userAuthError = function(request, status, error) {
    defaultUserAuthError(request, status, error)
}


var statsLoaded = function(stats) {
    $.each(keys(stats), function(idx, key) {
	$$(key.replace('_', '-')).text(stats[key])
    })
}


$(document).ready(function() {
    new AuthProfileLoader({success: userAuthOkay, error: userAuthError})
})

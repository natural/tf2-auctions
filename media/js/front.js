var $$ = function(suffix, next) { return $('#front-'+suffix, next) }


var statsOkay = function(stats) {
    new AuthProfileLoader({success:profileOkay, error:profileError})
    $.each(keys(stats), function(index, key) {
	$$(key.replace('_', '-')).text(stats[key])
    })
}


var statsError = function(request, status, error) {
}




$(document).ready(function() {
    new StatsLoader({success:statsOkay, error:statsError})
    new AuthProfileLoader({success: defaultUserAuthOkay, error: defaultUserAuthError})
})

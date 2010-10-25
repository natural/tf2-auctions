var $$ = function(suffix, next) { return $('#front-'+suffix, next) }


var profileOkay = function(profile) {
    showProfile(profile)
    $$('auth').fadeIn()
}


var profileError = function(request, status, error) {
    if (request.status==401) {
        $$('no-auth').fadeIn()
    }
}


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
})

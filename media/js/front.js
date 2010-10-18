var $$ = function(suffix, next) { return $('#front-'+suffix, next) }


var profileOkay = function(profile) {
    $$('auth').fadeIn()
}


var profileError = function(request, status, error) {
    if (request.status==401) {
        $$('no-auth').fadeIn()
    }
}


var statsOkay = function(stats) {
    new ProfileLoader({success:profileOkay, error:profileError})
    $.each(keys(stats), function(index, key) {
	$$(key).text(stats[key])
    })
}


var statsError = function(request, status, error) {
}


var StatsLoader = makeLoader({
    prefix: '/api/v1/stats',
    name: 'StatsLoader'
})


$(document).ready(function() {
    new StatsLoader({success:statsOkay, error:statsError})
})

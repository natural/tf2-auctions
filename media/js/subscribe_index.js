var $$ = function(suffix, next) { return $('#subscribe-'+suffix, next) }


var authOkay = function(profile) {
    if (profile.subscription && profile.subscription.status == 'Verified') {
	$$('thanks-pod').slideDown()
    } else {
	var pod = $$('form-pod')
	$('input[name="os1"]').attr('value', profile.id64)
	pod.slideDown()
    }
}


var authFail = function(request, status, error) {
    var pod = $$('login-pod')
    pod.slideDown()
}


$(function() {
    new AuthProfileLoader({
	success: authOkay,
	error: authFail,
	suffix: '?settings=1&complete=1'
    })
})
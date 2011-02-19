oo.config('#subscribe-')


var authOkay = function(profile) {
    if (profile.subscription && profile.subscription.status == 'Verified') {
	oo('thanks-pod').slideDown()
    } else {
	var pod = oo('form-pod')
	$('input[name="os1"]').attr('value', profile.id64)
	pod.slideDown()
    }
}


var authFail = function(request, status, error) {
    var pod = oo('login-pod')
    pod.slideDown()
}


$(function() {
    oo.data.auth({
	success: authOkay,
	error: authFail,
	suffix: '?settings=1&complete=1'
    })
})
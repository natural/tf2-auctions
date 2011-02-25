$(function() {
    oo.config({prefix:'#subscribe-'})

    oo.model.auth.init()
	.success(function(profile) {
	    if (profile.subscription && profile.subscription.status == 'Verified') {
		oo('thanks-pod').slideDown()
	    } else {
		$('input[name="os1"]').attr('value', profile.id64)
		oo('form-pod').slideDown()
	    }
	})
	.error(function() {
	    oo('login-pod').slideDown()
	})
})


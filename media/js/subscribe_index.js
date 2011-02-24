$(function() {
    var model = oo.model.auth.extend({loaderSuffix: '?settings=1&complete=1'})
    oo.config('#subscribe-')
    model.init()
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


(function() {
    oo.config({prefix:'#subscribe-', auth: {settings: 1, complete: 0}})
    oo.model.auth.init()
	.success(function(p) {
	    if (p.subscription && p.subscription.status == 'verified') {
		oo('thanks-pod').slideDown()
	    } else {
		$('input[name="os1"]').attr('value', p.id64)
		oo('form-pod').slideDown()
	    }
	})
	.error(function() {
            oo('login-link').attr('href', oo.util.profile.loginUrl())
	    oo('login-pod').slideDown()
	})
        .complete(function() {
            $('#content-sub-buttons').fadeOut()
        })
})()

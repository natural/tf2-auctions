$(document).ready(function(){
    oo.config('#content-')
    oo('login-link').fadeAway(function() {
	oo('site-categories').fadeOut(function() {
	    oo('site-buttons').fadeIn(function() {
		oo('main-logo').addClass('text-center').animate({width:'100%'})
	    })
	})
    })
})


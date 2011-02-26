$(document).ready(function(){
    oo.config({prefix:'#content-'})
    oo('site-categories').fadeOut()
    oo('login-link').fadeAway()
    oo('site-buttons').fadeIn(function() {
	oo('main-logo').addClass('text-center').animate({width:'100%'})
    })
})

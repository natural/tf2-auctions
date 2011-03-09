$(document).ready(function(){
    oo.config({prefix:'#content-'})
    oo('main-logo').addClass('text-center').animate({width:'100%'})
    oo('site-categories').fadeOut()
    oo('login-link').fadeAway()
    oo('site-buttons').fadeIn()
    oo('sub-buttons').fadeOut()
})

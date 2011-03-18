var init = function () {
    oo.config({prefix:'#content-'})
    oo('main-logo').addClass('text-center').animate({width:'100%'})
    oo('site-categories, login-link, login-prompt').fadeAway()
    oo('site-buttons').fadeIn()
}

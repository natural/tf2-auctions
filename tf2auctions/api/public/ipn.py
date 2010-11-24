#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error, info, warn
from urllib import urlencode
from urllib2 import Request as UrlRequest, urlopen

from tf2auctions import features
from tf2auctions.lib import ApiHandler
from tf2auctions.models.subscriber import Subscription


if features.devel:
    PP_URL = 'https://www.sandbox.paypal.com/cgi-bin/webscr'
else:
    PP_URL = 'https://www.paypal.com/cgi-bin/webscr'


def make_verify_request(data):
    data['cmd'] = '_notify-validate'
    req = UrlRequest(PP_URL, urlencode(data))
    req.add_header('Content-type', 'application/x-www-form-urlencoded')
    return req


def is_verified(status):
    return status == 'VERIFIED'


class Ipn(ApiHandler):
    def get(self):
	self.write_json('get fail')

    def post(self):
	params = dict(self.request.POST)
	payment_status = params['payment_status'].lower()
	id64 = params['custom']


	request = make_verify_request(params)
	response = urlopen(request)
	status = response.read()

	okay = is_verified(status)
	if not okay:
	    error('could not verify ipn: %s', params)
	    return

	sub, hst = Subscription.put_status_history(id64, status, params)

	warn('%s', [payment_status, id64, status, okay])
	for k in params:
	    warn('%s = %s', k, params[k])
	self.write_json('post okay')


main = ApiHandler.make_main(Ipn)


if __name__ == '__main__':
    main()

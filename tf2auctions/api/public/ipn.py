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
    req = UrlRequest(PP_URL, data=data + '&cmd=_notify-validate')
    req.add_header('Content-type', 'application/x-www-form-urlencoded')
    return req


def is_verified(status):
    return status == 'VERIFIED'


class Ipn(ApiHandler):
    def get(self):
	self.write_json('get fail')

    def post(self):
	params = dict(self.request.POST)
        try:
            txn_type = params['txn_type'].lower()
        except (KeyError, ):
            warn('no txn type: %s', params)
            return
        try:
            id64 = params['option_selection2']
        except (KeyError, ):
            try:
                id64 = params['custom']
            except (KeyError, ):
                warn('no id64: %s', params)
                return

	request = make_verify_request(self.request.body_file.read())
	response = urlopen(request)
	status = response.read()
	okay = is_verified(status)
	if not okay:
	    error('could not verify ipn: %s - %s', okay, params)
	    return
        if txn_type in ('subscr_signup', 'subscr_modify', 'subscr_payment'):
            txn_type = Subscription.verified
	sub, hst = Subscription.put_status_history(id64, txn_type, params)

	warn('%s', [txn_type, id64, status, okay])
	for k in params:
	    warn('%s = %s', k, params[k])
	self.write_json('post okay')


main = ApiHandler.make_main(Ipn)


if __name__ == '__main__':
    main()

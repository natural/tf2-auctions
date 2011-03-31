#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import mail

from tf2auctions.lib import ApiHandler, json_dumps
from tf2auctions.models import Listing


def send(body):
    mail.send_mail(
	sender='support@tf2auctions.com',
	to='support+crosspost@tf2auctions.com',
	subject='New Listing Cross Post',
        body=""" %s """ % (body, ),
    )


class CrossPostListing(ApiHandler):
    """ CrossPostListing -> cross post a listing to some other sites
        via email.

    """
    def post(self):
	""" Called by the task queue API when a this task is ready to
	    run.  The tasks are created by the Listing model.
	"""
	listing = Listing.get(self.request.get('listing_key'))
        summary = {'listing' : {'id' : listing.key().id()}}
        send(body=json_dumps(summary))


main = ApiHandler.make_main(CrossPostListing)


if __name__ == '__main__':
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs

from tf2auctions.lib import ApiHandler, cache
from tf2auctions.models.support import Issues


class IssuesList(ApiHandler):
    def __init__(self, request, response):
        ApiHandler.__init__(self, request, response)
        qs = parse_qs(self.request.query_string)
        try:
            qtype = qs['type'][0]
        except (IndexError, KeyError, ):
            qtype = 'open'
        self.open = qtype in ('open', 'all')
        self.closed = qtype in ('closed', 'all')

    def get(self):
	self.write_json(self.data())

    def cache_key(self):
        return 'issues-%s-%s' % (self.open, self.closed, )

    @cache(lambda self:self.cache_key(), ttl=60*10, always=True)
    def data(self):
        return Issues().list(open=self.open, closed=self.closed)


main = ApiHandler.make_main(IssuesList)


if __name__ == '__main__':
    main()

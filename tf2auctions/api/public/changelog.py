#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions import features
from tf2auctions.lib import ApiHandler
from tf2auctions.models.support import ChangeLogFile


class ChangeLog(ApiHandler):
    def get(self):
        tag = features.version
        branch = None

        ## dev:
        tag = None
        branch = 'support-center'

        log = ChangeLogFile(tag=tag, branch=branch)
	self.write(log.read())


main = ApiHandler.make_main(ChangeLog)


if __name__ == '__main__':
    main()

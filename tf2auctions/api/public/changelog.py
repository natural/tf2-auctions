#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions import features
from tf2auctions.lib import ApiHandler, cache
from tf2auctions.models.support import ChangeLogFile


class ChangeLog(ApiHandler):
    def get(self):
	self.response.out.write(self.data())

    @cache(lambda self:'changelog', ttl=60*10, always=True)
    def data(self):
        branch = tag = None
        if features.devel:
            branch = 'support-center'
        else:
            tag = features.version

        if features.local_static_files:
            from os import path
            from tf2auctions.ext.markdown import markdown
            logfile = open(path.join(features.app_dir, 'CHANGES.md'))
            log = markdown(logfile.read())
        else:
            log = ChangeLogFile(tag=tag, branch=branch).read()
        return log


main = ApiHandler.make_main(ChangeLog)


if __name__ == '__main__':
    main()

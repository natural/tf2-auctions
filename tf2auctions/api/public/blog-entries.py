#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import ApiHandler
from tf2auctions.models.blog import BlogEntry


class BlogEntries(ApiHandler):
    def get(self):
	entries = BlogEntry.recent(limit=10)
	entries = [entry.encode_builtin() for entry in entries]
	self.write_json(entries)


main = ApiHandler.make_main(BlogEntries)


if __name__ == '__main__':
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import template_main


main = template_main('profile.pt',
		     related_css='profile.css',
		     related_js=('backpack.js', 'profile.js'))


if __name__ == '__main__':
    main()

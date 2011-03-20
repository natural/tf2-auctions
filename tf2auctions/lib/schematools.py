#!/usr/bin/env python
# -*- coding: utf-8 -*-


known_categories = [
    ('hat', 'Hats'),
    ('weapon', 'Weapons'),
    ('craft_bar', 'Metal'),
#    ('bundle', 'Bundles'),
    ('', ''),
    ('vintage', 'Vintage'),
    ('unusual', 'Unusual'),
    ('', ''),
    ('craft_token', 'Tokens'),
#    ('supply_crate', 'Crates'),
    ('tool', 'Tools'),
]

some_qualities = {
    3 : 'vintage',
    5 : 'unusual',
}


def item_craft_class(item):
    item_class = item['item_class']
    craft_class = item.get('craft_class')
    if craft_class is None:
	if item_class.startswith('tf_wearable_item'):
	    craft_class = 'hat'
	elif item_class.startswith('tf_weapon'):
	    craft_class = 'weapon'
	else:
	    craft_class = item_class
    elif craft_class == 'haunted_hat':
	craft_class = 'hat'
    return craft_class


def item_categories(items, schema):
    schema_items = schema['result']['items']['item']
    schema_cats = dict((s['defindex'], item_craft_class(s)) for s in schema_items)
    classes = set(schema_cats[i['defindex']] for i in items)
    rarities = set(some_qualities.get(i['quality']) for i in items)
    return set(i for i in classes | rarities if i)


def item_type_map(schema):
    return dict((i['defindex'], i['item_type_name']) for i in schema['result']['items']['item'])


def def_map(schema):
    return dict((i['defindex'], i) for i in schema['result']['items']['item'])

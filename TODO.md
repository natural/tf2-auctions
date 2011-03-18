Major Features
--------------


1.  Support Center (target version 74)
    *  read/write issues on github.
    *  consolidate faq, contact, issues, etc.
    *  provide view of TODO.md (this file)
    *  provide view of CHANGES.md


2.  Shops (target version 75)
    *  include quant sold
    *  prefer automatically determining kind of shop: "vintage hats",
        "metal", "keys", etc.
    *  allow owner to edit name and provide markdown description


3.  On-site Chat (no release target)


Minor Features
--------------


1.  In api proxy, add last ditch attempt one profile search to look
    for steamcommunity.com/id/<q>

2.  On profile, support limits on bid and listing fetch.

3.  On backpack viewer, search for local profile and link to it if
    found.

4.  On full backpack views, after "Show All" is selected, show page
    numbers upper right of each backpack page; maybe provide toolbar
    to scroll with the page.

5.  Add quality selection to minimum bid and search; click image to
    cycle thru available qualities, update border as visual cue.

6.  Add "active bid" and "active listing" title (with matching color)
    to tooltip; maybe link to listing/bid, too.


Minor Changes
-------------


1.  Rewrite listing_add.js

2.  Decrease logging verbosity in production.

3.  Clean up javascript query string generation.

4.  On backpack viewer, clear existing backpack when selection is made
    when backpack is private.

5.  On front page, add link to search at bottom of listings, centered,
    "See more listings..." or similar

6.  Make clear that subscriptions are not required to login and use
    site.

7.  Increase search result count on front.

8.  Make welcome and login needed text above search results on front
    smaller and/or single line.

9.  Add script to round corners in IE.  IE sucks.

10. Reduce proxy cache time for items feed (but not schema).

11. Decrease the size of divs + images on min bid blocks.
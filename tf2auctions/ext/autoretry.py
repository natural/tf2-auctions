## Copyright (C)  2009  twitter.com/rcb

## Permission is hereby granted, free of charge, to any person
## obtaining a copy of this software and associated documentation
## files (the "Software"), to deal in the Software without
## restriction, including without limitation the rights to use,
## copy, modify, merge, publish, distribute, sublicense, and/or sell
## copies of the Software, and to permit persons to whom the
## Software is furnished to do so, subject to the following
## conditions:

## The above copyright notice and this permission notice shall be
## included in all copies or substantial portions of the Software.
## THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
## EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
## OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
## NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
## HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
## WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
## FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
## OTHER DEALINGS IN THE SOFTWARE.

from logging import warn
from time import sleep

from google.appengine.api import apiproxy_stub_map
from google.appengine.runtime.apiproxy_errors import ApplicationError
from google.appengine.datastore.datastore_pb import Error as PbError


simulate_failures = False # for testing
make_sync_call = apiproxy_stub_map.MakeSyncCall
errors = {
    PbError.TIMEOUT : 'Timeout',
    PbError.CONCURRENT_TRANSACTION : 'TransactionFailedError'
}


def autoretry_datastore_timeouts(attempts=5, interval=0.1, exponent=2.0):
    """
    This function wraps the AppEngine Datastore API to autoretry
    datastore timeouts at the lowest accessible level.

    The benefits of this approach are:

    1. Small Footprint:  Does not monkey with Model internals
			 which may break in future releases.
    2. Max Performance:  Retrying at this lowest level means
			 serialization and key formatting is not
			 needlessly repeated on each retry.
    At initialization time, execute this:

    >>> autoretry_datastore_timeouts()

    Should only be called once, subsequent calls have no effect.

    >>> autoretry_datastore_timeouts() # no effect

    Default (5) attempts: .1, .2, .4, .8, 1.6 seconds

    Parameters can each be specified as floats.

    :param attempts: maximum number of times to retry.
    :param interval: base seconds to sleep between retries.
    :param exponent: rate of exponential back-off.
    """
    msg = 'Datastore %s: retry %s in %s seconds.%s'

    def autoretry_call(*args, **kwargs):
	count = 0
	while True:
	    try:
		if simulate_failures:
		    import random
		    if random.choice([0,1,0]):
			raise ApplicationError(PbError.TIMEOUT)
		return make_sync_call(*args, **kwargs)
	    except (ApplicationError, ), err:
		errno = err.application_error
		if errno not in errors:
		    raise
		count += 1
		if count > attempts:
		    raise
		vals = ''
		if count == 1:
		    vals = ' args=(%s)' % (', '.join(str(a) for a in args), )
		wait = (exponent ** count) * interval
		warn(msg, errors[errno], count, wait, vals)
		sleep(wait)

    if apiproxy_stub_map.MakeSyncCall is make_sync_call:
	apiproxy_stub_map.MakeSyncCall = autoretry_call

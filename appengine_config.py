import re

from ext.env import add_extra_paths, add_local_paths


def webapp_add_wsgi_middleware(app):
    add_extra_paths()
    add_local_paths()

    from google.appengine.ext.appstats import recording
    return recording.appstats_wsgi_middleware(app)

appstats_DEBUG = True


def appstats_normalize_path(path):
    try:
	parts = path.split('/')
	if re.match('\d{17}', parts[-1]):
	    parts[-1] = '<id64>'
	elif re.match('\d+', parts[-1]):
	    parts[-1] = '<id>'
	path = str.join('/', parts)
    except:
	pass
    import logging
    logging.warn('normalize_path: %s', path)
    return path



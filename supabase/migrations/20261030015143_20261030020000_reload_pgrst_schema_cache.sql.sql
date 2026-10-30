/*
# Reload PostgREST schema cache

The cirurgias table was created but PostgREST's schema cache
had not picked it up, causing 404 errors from the REST API.
This migration forces a schema cache reload via NOTIFY.
*/

NOTIFY pgrst, 'reload schema';
# Runner Public URL Contract

The Runner needs a shareable survey link, but the original package specified only the
application path. Public URL structure is an acceptance criterion, including canonical
slashes, parameter names, missing-resource behaviour, and privacy boundaries.

For static Nginx hosting, keep the application at a stable directory and select the
manifest resource with a query:

```text
/wifi-survey-v3/runner/?survey_id=<URL-encoded survey UUID>
```

An absent ID may select the default survey. An unknown ID must show a visible error and
must not silently open another customer's survey.

Survey IDs identify public manifest entries; they are not authorization. Credentials,
Client IPs, operator details, and access tokens must never enter the URL.

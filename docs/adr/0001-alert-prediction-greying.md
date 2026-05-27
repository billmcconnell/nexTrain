# Grey out predictions only when service has stopped, not when it's delayed

When an alert is active on a route+direction card, we grey out the prediction times only for `SUSPENSION`, `NO_SERVICE`, and `SHUTTLE` effects — not for `DELAY`, `SERVICE_CHANGE`, or other degraded-but-running conditions. Greying is a signal that means "don't trust these times." For a delay, predictions are still directionally accurate and a rider still needs them to decide whether to wait. Suppressing or dimming them during a delay would imply the service has stopped, which is false and could cause a rider to give up on a train that's actually coming.

## Considered options

- Grey out for all alert types — simpler rule, but misleads riders into thinking a delayed service isn't running.
- Grey out only for stopped-service effects — chosen; matches what the signal actually means.

Follow ups	1	Customer privacy: Is customer filtering convenience rather than security? With static hosting, ?customer_id=abc can filter the UI, but it cannot prevent someone fetching another customer’s JSON if they know its path.The data will only be there for the time it is needed, and will be moved this is a picAnd we should on the suvey tool, prompt the user, this will record your position for testing
1. Runner inputs: Which fields must the user enter?
    * MazeMap access token when required
    * Cloud App ID / Cloud App Key (this will be based on the selected positioning options
    * Client IP (because we cannot get thatI assume configId, polling interval and other safe settings are embedded in the survey - confirmed
2. Missing map token: Should the Runner block when a private-campus token is required, while Player/Report continue with a public map and route overlays?- yes the runner will block- the page just loads the public map 
3. Survey duration: Is waiting time one global value per stop, or can each stop override it? I propose:- we should give a 30 sec wait time at each check point (actually configured at the authoring) as it means it replica table
4. Recovery: I recommend asynchronous IndexedDB autosave after every poll/check-in, with:
It’s one a done. So if the survey is stopped, it will export where it ended.no resume as it is based on a complete run
1. Results: Should each sample preserve both:
yes, we need to preserve actually what we polled when we polled it, including delay times, becuase thats another metric (the round trip) so if it is taking what ever thats a metric of I polled mazemap and it took x time to return, picks up our infra issues or not
1. Filename: Confirm this predictable format:customerId__campusId__surveyId__2026-07-28T01-23-45Z.result.v3.jsonconfirmed
2. Comparison: Should incomplete/abandoned runs be excluded, with the oldest completed run automatically becoming the baseline?yes, becuase I wont load a shorted run
3. Sticky heatmap: A repeated position is valid while waiting in a room. I recommend heat only when:
Except, if the position is wrong, so if I am in room, ex, and I am stuck away, then its a pool, but its based on moving, so the time idle, isn’t helpful, its about moving positions
1. Milestones: I recommend:
    * M0: freeze schemas, fixtures and behaviour tests
    * M1: behavior-preserving report/player module split 
    * M2: v3 schema and Creator
    * M3: lightweight mobile Runner
    * M4: customer dashboard and generated manifests
    * M5: dynamic Player and modular Report
    * M6: sticky heatmap and run comparison
    * M7: security, mobile and acceptance hardening

It depends if it is a new build or a cut, becuase of the 150 file sizes.
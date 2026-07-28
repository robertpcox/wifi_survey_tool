# Round 3 — scope review answers

Raw answers to the scope review. Applied to the active scope on 2026-07-28.

1. Build-state manifests were already agreed. Add results, run the build, it generates.
   Should have been documented as such.

2. Sources moved into this repository.
   Survey tool: `current_tool/route_survey`.
   Report and player: `current_tool/report_player`.
   The survey tool needs the access token entered. It had not been moved over before.
   Move token handling back into the pages with the user entering it.
   The hard-coded token was a hack to get this one site working. Fix it.
   Clarified: this is the map access token only, for launching the maps.
   Cloud positioning still goes through the proxy. That is not changing.

3. Build from the files to generate the player and report. They become one tool.
   Token is entered.

4. Existing data: not needed.

5. Report and player become one page.

6. Two tools at build stage.
   Report player.
   Survey tool, built into the Creator and built into the Runner.

7. Desktop browser.

8. The unfinished split rule needs fixing.

9. Data is excluded. See `tools/check_file_sizes.mjs`.

10. Under 10 metres, no check-in. Spacing is set at generate time and exported to the route
    test. Warn that the route is short, and allow the warning to be disabled for the rest of
    the route, since room-to-room is a valid case. As each POI is added the route is
    calculated and built, so the route is visible while building and can be adjusted.
    The meta block of the planned test carries the metadata that passes into the results
    and feeds the system.

11. Split Step 1 by priority, not by size: Creator first, then Runner.
    Surveys need to be runnable. The player and report come last.

12. The build creates a test plan so nothing is caught later, and those tests become part
    of the build process.

13. The Runner records device type, so the same route can be sampled by two devices.
    Loading the Runner presents the data that must be entered, including the IP.

    Device Type: Mobile, Laptop, Asset
    Device OS
    Device Name

    With an asset, the surveyor walks with it and checks in.
    The purpose is finding areas where wifi becomes sticky.

14. Sample wifi before starting. On a green light, click Go, rather than starting a run
    that turns out to be wrong.

15. Creator should also be able to capture GPS.

16. Another Creator meta point: wireless band, 2.4, 5, or 6. It is a capture point.
    A comment entry at the end, nice to have.

17. Tests are not one file. They are separate files, so authoring tests does not bloat.

18. Correction to 16. It is one survey ID. The Runner adds device type and the rest.
    The Creator does not care; that is about the tester who is setting it.
    The Creator is just this is what we need to capture.
    The Runner is this is what is being captured.

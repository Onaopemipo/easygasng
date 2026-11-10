# Loader size and orbit colour adjustment

User-approved presentation revision: all shared size tokens increase by50%: xs20→30, sm32→48, md48→72, lg80→120, xl120→180px. Explicit numeric sizes retain their previous16–120 input bounds and render at1.5× (24–180px). Web and native consume the same dimension helper.

Light orbit changes from #16c600/#b6ff00 to #109b00/#70c900. Dark orbit changes from #65ef83/#b6ff00 to #39c660/#87d931. Halo, flame, animation speed, request/progress handling, centring and accessibility remain unchanged.

54 existing component/geometry/native-host checks passed. Web and mobile typechecks passed. Actual web component preview measured120×120px and CSS colours #109b00/#70c900. Native host simulation does not imply device acceptance. No mobile binary build or deployment. Existing production NO-GO, all original loader requirements/gates and unrelated UI work are preserved.

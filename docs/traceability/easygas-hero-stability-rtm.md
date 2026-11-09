# Homepage hero stability — 31 October 2026

HS-01 / HS-G01: verified (1/1 requirements and gates). The visible generated-image caption has been removed, with illustrative context retained in the accessible hero image description. The compact quote area now reserves112px for its prompt, price breakdown/total or validation message; these states share the same layout slot. Separate breakdown and total rows avoid unpredictable inline wrapping.

Desktop geometry stayed815.4375px hero /666.4375px calculator at0,5,12.5 and13kg. At390px mobile, zero/valid/invalid states stayed1380.1796875px hero /683.6875px calculator, with no horizontal overflow. Existing pricing/validation and disabled ordering gates remain. This measures UI geometry, not production Core Web Vitals. Evidence and actual source mappings are in `easygas-hero-stability-rtm.json`; screenshot and browser notes are in docs/screenshots and docs/testing. Existing production NO-GO is unchanged.

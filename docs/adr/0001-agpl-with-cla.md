# AGPLv3 with a mandatory CLA

Tack is open-core: the OSS feedback loop must be credible (AGPL's copyleft prevents closed-source repackaging by competitors), while a commercial license remains the enterprise upsell for AGPL-averse buyers. Dual licensing only works if Tack owns the copyright to every line, so a CLA (relicensing grant) is required from every external contributor **before the repo accepts its first PR** — retrofitting one after merges would require chasing consent from every past contributor.

## Considered Options

- **MIT/Apache** — maximum adoption, but lets Marker.io-class competitors ship Tack as a closed feature; kills the differentiator.
- **BSL** — overkill at this scale and weakens the "real open source" positioning.
- **AGPL without CLA** — community-friendlier, but permanently deletes the commercial-license tier from the business model.

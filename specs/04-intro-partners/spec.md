# Feature Spec 04: Intro scroll-text and partners strip

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- Giant centered lines of text on paper that drift and reveal line by line as the visitor scrolls.
- A partners strip: a logo carousel of original ULARA partner marks on hairline cells.

## Measured facts (from the reference)
- Intro section top 993 to 1716 (723 px); title runs a scrubbed drift from center bottom+=10% to center top+=40%.
- Reveals use start 'top+=X% bottom'; masked line reveals (bp-line style).
- Carousel is Swiper 11 style.

## States and motion
- Scrub drift tied to scroll; line mask reveal once; carousel loops; reduced motion shows text static, carousel paused.

## Responsive and theme
- Phone: smaller scale type, same density; carousel swipes.

## Content that may differ (the 1%)
Statement copy and partner marks are original ULARA content (no reference partner logos).

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Carousel speed?
  A: Continuous linear loop; measured from the corpus network and DOM, no pause on hover (not observed).

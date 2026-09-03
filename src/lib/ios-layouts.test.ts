import test from "node:test";
import assert from "node:assert/strict";
import {
  LAYOUTS,
  MAX_VERIFIED_IOS,
  REGISTRY_VERIFIED_ON,
  chromeCanAddToHomeScreen,
  iosWalkthrough,
} from "./ios-layouts.ts";

// The registry is the only thing standing between a user on a new iOS and a
// walkthrough that points at a button that isn't there any more. These tests
// stop MAX_VERIFIED_IOS being bumped without the rows to back it up.

const BROWSERS = ["safari", "chrome", "firefox", "edge"] as const;

test("every browser covers iOS 0..MAX_VERIFIED_IOS contiguously, no overlaps", () => {
  for (const browser of BROWSERS) {
    const rows = LAYOUTS.filter((l) => l.browser === browser).sort((a, b) => a.minIos - b.minIos);
    assert.ok(rows.length > 0, `${browser} has no rows`);
    assert.equal(rows[0].minIos, 0, `${browser} must start at iOS 0`);
    for (let i = 1; i < rows.length; i++) {
      assert.equal(rows[i].minIos, rows[i - 1].maxIos + 1, `${browser} gap/overlap at ${rows[i].minIos}`);
    }
    assert.equal(rows[rows.length - 1].maxIos, MAX_VERIFIED_IOS, `${browser} doesn't reach MAX_VERIFIED_IOS`);
  }
});

test("every row records when and how it was verified", () => {
  for (const l of LAYOUTS) {
    assert.match(l.walkthrough.verifiedOn, /^\d{4}-\d{2}-\d{2}$/, l.walkthrough.key);
    assert.ok(l.walkthrough.verifiedBy.length > 0, l.walkthrough.key);
    assert.equal(l.walkthrough.steps.length, 3, l.walkthrough.key);
  }
  assert.match(REGISTRY_VERIFIED_ON, /^\d{4}-\d{2}-\d{2}$/);
});

test("lookups pick the right row and fall back when iOS is newer than verified", () => {
  assert.equal(iosWalkthrough("safari", { major: 26, minor: 0 }).key, "safari-26");
  assert.equal(iosWalkthrough("safari", { major: 17, minor: 5 }).key, "safari-15-25");
  assert.equal(iosWalkthrough("safari", { major: 14, minor: 8 }).key, "safari-legacy");
  assert.equal(iosWalkthrough("chrome", { major: 18, minor: 0 }).key, "chrome");
  assert.equal(iosWalkthrough("firefox", { major: 26, minor: 0 }).coach.edge, "bottom-right");
  const newer = iosWalkthrough("safari", { major: MAX_VERIFIED_IOS + 1, minor: 0 });
  assert.equal(newer.verified, false);
  assert.equal(newer.coach.edge, "none");
  assert.equal(iosWalkthrough("other", { major: 26, minor: 0 }).verified, false);
  assert.equal(iosWalkthrough("safari", null).verified, false);
});

test("Chrome on iOS needs 16.4", () => {
  assert.equal(chromeCanAddToHomeScreen({ major: 16, minor: 3 }), false);
  assert.equal(chromeCanAddToHomeScreen({ major: 16, minor: 4 }), true);
  assert.equal(chromeCanAddToHomeScreen({ major: 15, minor: 9 }), false);
  assert.equal(chromeCanAddToHomeScreen({ major: 26, minor: 0 }), true);
  assert.equal(chromeCanAddToHomeScreen(null), true);
});

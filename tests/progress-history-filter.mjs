import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const sandbox = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
vm.runInNewContext(`${source}\nthis.__includeResultInProgressHistory = includeResultInProgressHistory; this.__normalize24Point1TesterName = normalize24Point1TesterName;`, sandbox);

const include = sandbox.__includeResultInProgressHistory;
const normalizeName = sandbox.__normalize24Point1TesterName;
assert.equal(include({ exerciseName: "10-12 Min 24.1 Primer" }), false);
assert.equal(include({ exerciseName: "12 Min 24.1 Movement Baseline" }), false);
assert.equal(include({ exerciseName: "15 Min 24.1 EMOM" }), false);
assert.equal(include({ exerciseName: "24.1-Style 21-15-9 Intervals" }), false);
assert.equal(include({ exerciseName: "24.1-Style Tester" }), true);
assert.equal(include({ exerciseName: "24.1 Tester", completedOn: "2026-08-28" }), true);
assert.equal(include({ exerciseName: "Cable Fly" }), true);
assert.equal(normalizeName("24.1-Style Tester"), "24.1 Tester");
assert.equal(normalizeName("24.1 Style Tester"), "24.1 Tester");
assert.equal(normalizeName("24.1 Tester"), "24.1 Tester");
assert.equal(normalizeName("24.1-Style 21-15-9 Intervals"), "24.1-Style 21-15-9 Intervals");

console.log("progress history filter checks passed");

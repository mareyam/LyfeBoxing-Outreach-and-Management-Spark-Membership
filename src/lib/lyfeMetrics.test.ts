import assert from "node:assert/strict";
import {
  cancellationDate,
  cancellationMonthKeys,
  filterPastDueRows,
  formatMoney,
  isActiveTrial,
  membershipJoinDate,
  missingAttendanceHeaders,
  monthKeyFromDate,
  monthRevenue,
  pastDueExcludeNames,
  trialTiming,
} from "./lyfeMetrics";

assert.equal(formatMoney(1714.5), "$1,714.50");
assert.equal(formatMoney(58014.4), "$58,014.40");
assert.equal(formatMoney(0), "$0.00");

const exclude = pastDueExcludeNames("QA Person");
const filtered = filterPastDueRows(
  [
    { Contact: "Tiffani James", "Total Overdue": "$260.75" },
    { Contact: "Zero Balance", "Total Overdue": "$0.00" },
    { Contact: "Maryam Naveed", "Total Overdue": "$147.00" },
    { Contact: "QA Person", "Total Overdue": "$10.00" },
    { Contact: "Blank", "Total Overdue": "" },
  ],
  exclude
);
assert.equal(filtered.rows.length, 1);
assert.equal(filtered.rows[0].Contact, "Tiffani James");
assert.equal(filtered.hiddenZeroBalance, 2);
assert.equal(filtered.hiddenTestContacts, 2);

const october = new Date(2026, 9, 15);
assert.equal(monthKeyFromDate(october), "2026-10");
assert.equal(
  membershipJoinDate({ Signed: "10/02/2026", Starts: "06/01/2026" })?.getMonth(),
  9
);
assert.equal(membershipJoinDate({ Signed: "", Starts: "06/01/2026" })?.getMonth(), 5);
assert.equal(membershipJoinDate({ Unsigned: "10/02/2026", Starts: "06/01/2026" })?.getMonth(), 5);
assert.equal(cancellationDate({ "Signed Date": "10/02/2026", "Cancelled Date": "04/11/2026" })?.getMonth(), 3);
assert.equal(cancellationDate({ "Signed Date": "10/02/2026" }), null);

const now = new Date(2026, 10, 1, 8, 0, 0);
const months = cancellationMonthKeys(
  [new Date(2026, 9, 4), new Date(2024, 9, 1), null],
  now
);
assert.equal(months[0] >= "2026-11", true);
assert.ok(months.includes("2026-11"));
assert.ok(months.includes("2026-10"));
assert.equal(monthRevenue([]), null);
assert.equal(monthRevenue([0, 0]), 0);
assert.equal(monthRevenue([1860.76]), 1860.76);

assert.equal(trialTiming("10/29/2026", now), "expired");
assert.equal(trialTiming("11/01/2026", now), "expiring");
assert.equal(trialTiming("11/02/2026", now), "expiring");
assert.equal(trialTiming("11/04/2026", now), "active");
assert.equal(trialTiming("Open Ended", now), "undated");
assert.equal(trialTiming("", now), "undated");
assert.equal(isActiveTrial("10/29/2026", now), false);
assert.equal(isActiveTrial("Open Ended", now), true);
assert.equal(isActiveTrial("11/01/2026", now), true);

assert.deepEqual(missingAttendanceHeaders(["Name", "Membership", "Last Attended", "Classes Last 30 Days"]), []);
assert.deepEqual(missingAttendanceHeaders(["Member", "Plan", "Last Visit Date", "Visits Last 30 Days"]), []);
assert.deepEqual(missingAttendanceHeaders(["Date", "Class"]), ["Name", "Membership", "Last Attended", "Classes Last 30 Days"]);

console.log("lyfeMetrics tests passed");

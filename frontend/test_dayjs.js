const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const leaveStart = dayjs("27-07-2026", "DD-MM-YYYY");
const end = dayjs("2026-08-31").endOf('day');
const start = dayjs("2026-05-01").startOf('day');

console.log("leaveStart:", leaveStart.format());
console.log("isBefore end:", leaveStart.isSameOrBefore(end));
console.log("isAfter start:", leaveStart.isSameOrAfter(start));

import isArray from "lodash-es/isArray";

module.exports = (names) => (
    isArray(names) ? names : names.split(" ")
).map(
    (name) => `${name[0]}.`
)[0];
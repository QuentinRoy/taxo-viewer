module.exports = (names) => (
    Array.isArray(names) ? names : names.split(" ")
).map(
    (name) => `${name[0]}.`
)[0];
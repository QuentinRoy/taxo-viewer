module.exports = (names) => {
    const namesArray = names ? Array.isArray(names) ? names : names.split(" ")
                             : [];
    // Removes surnames and map with the first letter followed by a dot.
    return namesArray.filter(name => name.search(/^[A-Za-z\u00C0-\u017F]/) >= 0)
                     .map(name => name[0] + ".").join(" ")
}

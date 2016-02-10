import tableTemplate from "./templates/table.handlebars";

function createHeaderRows(PropertyNode, properties, rows=[], level=0){
    const currentRow = rows[level] = rows[level] || [];
    // Fetch the possible categories for the property of the subcells and add the "undefined" category.
    const subCategories = properties.find(
        p => p.name === PropertyNode.subProperty
    ).categories.concat(["undefined"]);
    // Fetch the subcells in category order.
    const subcells = subCategories.map((subcat) => PropertyNode.subProperties[subcat]).filter(x => !!x);
    // Add the subcells of unknown category
    subcells.push(...PropertyNode.getSubPropertiesList().filter(sp => subcells.indexOf(sp) < 0));
    // Push the subcells to current row.
    currentRow.push(...subcells);
    // Reapply for all subcells that are not at the bottom of the header
    subcells.filter(
        sc => !sc.isLeave
    ).forEach(
        (hc) => createHeaderRows(hc, properties, rows, level + 1)
    );
    return rows;
}

function createBodyRows(headerRows){
    const bodyRows = [];
    const bottomHeaders = headerRows[headerRows.length - 1];
    const colNb = bottomHeaders.length;
    bottomHeaders.forEach((header, colNum) => {
        header.entries.forEach((entry, rowNum) => {
            const row = bodyRows[rowNum] = bodyRows[rowNum] || new Array(colNb).fill(null);
            row[colNum] = entry;
        });
    });
    return bodyRows;
}

export default function refTable(id, refEntries, properties){
    const headerRows = createHeaderRows(refEntries, properties);
    return tableTemplate({
        id: id,
        headerRows,
        bodyRows: createBodyRows(headerRows)
    });
}

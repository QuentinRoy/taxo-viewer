import tableTemplate from "./templates/table.handlebars";

function getCellWidth(categoryNode){
    if(categoryNode.isLeaf){
        return 1;
    } else {
        const subs = categoryNode.getSubCategoriesList();
        const nonEmpty = subs.filter(s => !s.isEmpty());
        if(nonEmpty.length === 1 && !nonEmpty[0].category){
            return getCellWidth(nonEmpty[0]);
        } else if(nonEmpty.length) {
            return subs.reduce((acc, s) => acc + getCellWidth(s), 0);
        } else {
            return 1;
        }
    }
}

function hasBottomBar(node){
    if(node.category === "Interaction"){
        // debugger;
    }
    const subs = node.getSubCategoriesList();
    const nonEmptySubs = subs.filter(s => !s.isEmpty());
    if(nonEmptySubs.length === 1 && !nonEmptySubs[0].category) {
        return hasBottomBar(nonEmptySubs[0]);
    } else if(nonEmptySubs.length) {
        return subs.length > 1;
    } else {
        return false;
    }
}

function createHeaderRows(categoryNode, properties, rows=[], currentRowNum=0, currentColNum=0){
    const currentRow = rows[currentRowNum] = rows[currentRowNum] || new Array(currentColNum).fill({ width: 1, isFiller: true });
    // Fetch the possible sub categories for the subproperty of the categoryNode and add the "undefined" category.
    const directSub = categoryNode.subProperties[0];
    const subCategories = properties.find(
        p => p.name === directSub.name
    ).categories.concat(["undefined"]);
    // Fetch the subcells in category order.
    let subcells = subCategories.map(
        (subcat) => categoryNode.subCategories && categoryNode.subCategories[subcat]
    ).filter(c => !!c);
    // Add the subcells of unknown category.
    subcells.push(...categoryNode.getSubCategoriesList().filter(sp => subcells.indexOf(sp) < 0));

    // Reapply for all subcells that are a leaf.
    if(!subcells.every(sc => sc.isEmpty() || !sc.category)){
        let colNum = currentColNum;
        subcells.forEach((node) => {
            const width = getCellWidth(node);
            currentRow.splice(colNum, width, {
                node,
                width,
                bottomBar: hasBottomBar(node)
            });
            if(!node.isLeaf){
                createHeaderRows(node, properties, rows, currentRowNum + 1, colNum);
            }
            colNum += width;
        });
    } else if(categoryNode.subCategories && "undefined" in categoryNode.subCategories
                                         && !categoryNode.subCategories["undefined"].isLeaf){
        // In case of only an undefined category, just create the subHeaders but do not add it.
        createHeaderRows(categoryNode.subCategories["undefined"], properties, rows, currentRowNum, currentColNum);
    } else if(currentRow.every(c => c.isFiller)){
        // If nothing has been added to the row and it is only filled with fillers, removes it.
        rows.splice(currentRowNum, 1);
    }

    // Make sure each sub rows has the proper length.
    const rowWidth = rows[0].reduce((acc, c) => acc + c.width, 0);
    const colHeight = rows.length;
    for(let rowNum=Math.max(currentRowNum, 1); rowNum < colHeight; rowNum++){
        const currentWidth = rows[rowNum].reduce((acc, c) => acc + c.width, 0);
        rows[rowNum].push(...new Array(rowWidth - currentWidth).fill({ width: 1, isFiller: true }));
    }
    return rows;
}


function createBodyRows(headerRows){
    const bodyRows = [];
    // Spread the headers so that a header of width 3 will be cloned in 3 consecutive cell.
    const spreadedHeaders = headerRows.map(row => row.reduce(
        (newRow, c) => newRow.concat(new Array(c.width).fill(c)), []
    ))
    // For each column, retrieve the lowest non filler cell.
    const bottomHeaders = spreadedHeaders.reduce(
        (r1, r2) => r2.map(
            (ci2, ci) => {
                const ci1 = r1[ci];
                return ci2.isFiller ? ci1 : ci2;
            }
        )
    );
    const colNb = bottomHeaders.length;
    bottomHeaders.forEach((header, colNum) => {
        if(header.node && header.node.entries){
            header.node.entries.sort(
                (e1, e2) => e1.biblio.entryTags.year - e2.biblio.entryTags.year
            ).forEach((entry, rowNum) => {
                const row = bodyRows[rowNum] = bodyRows[rowNum] || new Array(colNb).fill(null);
                row[colNum] = entry;
            });
        }
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

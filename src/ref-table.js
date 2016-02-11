import tableTemplate from "./templates/table.handlebars";

function getCellWidth(categoryNode){
    if(categoryNode.isLeave){
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

function createHeaderRows(categoryNode, properties, rows=[], rowNum=0, colNum=0){
    const currentRow = rows[rowNum] = rows[rowNum] || new Array(colNum).fill({ width: 1, filler: true });
    // Fetch the possible sub categories for the subproperty of the categoryNode and add the "undefined" category.
    const directSub = categoryNode.subProperties[0];
    const subCategories = properties.find(
        p => p.name === directSub.name
    ).categories.concat(["undefined"]);
    // Fetch the subcells in category order.
    let subcells = subCategories.map(
        (subcat) => categoryNode.subCategories && categoryNode.subCategories[subcat]
    ).filter(c => !!c);
    // Add the subcells of unknown category
    subcells.push(...categoryNode.getSubCategoriesList().filter(sp => subcells.indexOf(sp) < 0));

    function addSubHeaderRow(node){
        const width = getCellWidth(node);
        currentRow.splice(colNum, width, {
            node,
            width,
            bottomBar: hasBottomBar(node)
        });
        if(!node.isLeave){
            createHeaderRows(node, properties, rows, rowNum + 1, colNum);
        }
        colNum += width;
    }

    // Reapply for all subcells that are not at the bottom of the header
    if(!subcells.every(sc => sc.isEmpty() || !sc.category)){
        subcells.forEach(addSubHeaderRow);
    } else if(categoryNode.subCategories && "undefined" in categoryNode.subCategories){
        // In case of undefined category, add it only if it is a leave
        const undefCat = categoryNode.subCategories["undefined"];
        if(!undefCat.isLeave){
            createHeaderRows(undefCat, properties, rows, rowNum, colNum);
        } else {
            addSubHeaderRow(undefCat);
        }
    }

    // Make sure each sub rows 
    const rowWidth = rows[0].reduce((acc, c) => acc + c.width, 0);
    const colHeight = rows.length;
    for(let rowNum2=Math.max(rowNum, 1); rowNum2 < colHeight; rowNum2++){
        const currentWidth = rows[rowNum2].reduce((acc, c) => acc + c.width, 0);
        rows[rowNum2].push(...new Array(rowWidth - currentWidth).fill({ width: 1, filler: true }));
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
                return ci2.filler ? ci1 : ci2;
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

import tie from "tie";
import { CategoryTree } from "./model";
import { parseHTML } from "./utils";
import tableTemplate from "./templates/table.handlebars";
import isFunction from "lodash-es/isFunction";
import tooltip from "./tooltip";
import tooltipTemplate from "./templates/tooltip.handlebars";

const sortings = {
    descending: (e1, e2) => e1.biblio.entryTags.year - e2.biblio.entryTags.year,
    ascending: (e1, e2) => -sortings.descending(e1, e2)
}

export default class TableWidget {
    constructor(targetProperties, refEntries, sorting, dom){
        // Convert arguments to constraint.
        [targetProperties, refEntries, sorting] = [targetProperties, refEntries, sorting].map(tie);

        // Get the sorting function.
        const sortingFunc = sorting.alter(sVal => isFunction(sVal) ? sVal : sortings[sVal]);

        // Create the property tree and the table dom.
        this.propTree = tie(() => new CategoryTree(targetProperties.get(), refEntries.get()));
        this._tableHTML = tie(
            () => createTableHTML("ref-table", this.propTree.get(), targetProperties.get(), sortingFunc.get())
        );
        this.dom = tie(dom || parseHTML("<div></div>"));

        tie.liven(()=>{
            this.dom.get().innerHTML = this._tableHTML.get();

            // Associate each entry with its dom(s) and create the tooltips.
            for(const entry of refEntries.get()){
                entry.doms = this.dom.get().querySelectorAll(`.ref-cell[data-bib-id=${entry.id}]`);
                for(const dom of entry.doms){
                    const refEntry = dom.querySelector(".ref-entry");
                    const entryTooltip = tooltip(dom.querySelector(".ref-highlight"), {
                        content: tooltipTemplate(entry),
                        position: "bottom",
                        trigger: "custom",
                        delay: 0
                    });
                    refEntry.addEventListener("mouseover", () => {
                        for(const d of entry.doms){
                            d.classList.add("highlighted");
                            entryTooltip.show();
                        }
                    });
                    refEntry.addEventListener("mouseout", () => {
                        for(const d of entry.doms){
                            entryTooltip.hide();
                            d.classList.remove("highlighted");
                        }
                    });
                }
            }
        });
    }
}

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

function createHeaderRows(categoryNode, properties, rows=[], currentRowNum=0, currentColNum=0, checkWidth=true){
    if(categoryNode.isLeaf){
        return [[{ node: categoryNode, width: 1 }]];
    }
    const currentRow = rows[currentRowNum] = rows[currentRowNum] || [];
    fillRow(currentRow, currentColNum - getRowWidth(currentRow), { width: 1, isFiller: true });

    // Fetch the possible sub categories for the subproperty of the categoryNode and add the "undefined" category.
    const directSub = categoryNode.subProperties[0];
    const subCategories = properties.find(
        p => p.name === directSub.name
    ).categories.concat(["undefined"]);
    // Fetch the subcells in category order.
    let subcells = subCategories.map(
        (subcat) => categoryNode.subCategories && categoryNode.subCategories[subcat]
    ).filter(c => !!c);
    // Add the subcells of unknown category (i.e. the subcells that are not already in the subcells array).
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
                createHeaderRows(node, properties, rows, currentRowNum + 1, colNum, false);
            }
            colNum += width;
        });
    // In case of only an undefined category, just create the subHeaders but do not add it.
    } else if(categoryNode.subCategories && "undefined" in categoryNode.subCategories
                                         && !categoryNode.subCategories["undefined"].isLeaf){
        createHeaderRows(categoryNode.subCategories["undefined"], properties, rows, currentRowNum, currentColNum, false);

    // If nothing has been added to the row and it is only filled with fillers, removes it.
    } else if(currentRow.every(c => c.isFiller)){
        rows.splice(currentRowNum, 1);
    }

    // Make sure all rows are full or it is buggy on safari.
    if(checkWidth){
        const rowWidth = getRowWidth(rows[0]);
        rows.slice(1).forEach(thisRow => {
            fillRow(thisRow, rowWidth - getRowWidth(thisRow), {
                width: 1, isFiller: true
            });
        });
    }
    return rows;
}

const getRowWidth = (row) => row.reduce((acc, cell) => acc + cell.width || 0, 0);
const fillRow = (row, nb, filler=null) => {
    if(nb > 0){
        row.push(...new Array(nb).fill(filler));
    }
}


function createBodyRows(headerRows, sorting){
    const bodyRows = [];
    // Spread the headers so that a header of width 3 will be cloned in 3 consecutive cells.
    const spreadedHeaders = headerRows.map(row => row.reduce(
        (newRow, c) => newRow.concat(new Array(c.width).fill(c)), []
    ));

    const rowNb = spreadedHeaders.length;
    const colNb = spreadedHeaders[0].length;

    // For each column, retrieve the lowest non filler cell.
    const bottomHeaders = [];
    for(let colI = 0; colI < colNb; colI++){
        for(let rowI = rowNb - 1; rowI >= 0; rowI--){
            const cell = spreadedHeaders[rowI][colI];
            if(cell && !cell.isFiller){
                bottomHeaders.push(cell);
                break;
            }
        }
    }

    bottomHeaders.forEach((header, colNum) => {
        if(header.node && header.node.entries){
            const entries = header.node.entries.slice();
            if(sorting){
                entries.sort(sorting);
            }
            entries.forEach((entry, rowNum) => {
                const row = bodyRows[rowNum] = bodyRows[rowNum] || new Array(colNb).fill(null);
                row[colNum] = entry;
            });
        }
    });
    return bodyRows;
}

function createTableHTML(id, refEntries, properties, sorting){
    const sortFunc = isFunction(sorting) ? sorting : sortings[sorting];
    const headerRows = createHeaderRows(refEntries, properties);
    return tableTemplate({
        id: id,
        headerRows: refEntries.isLeaf ? null: headerRows,
        bodyRows: createBodyRows(headerRows, sortFunc)
    });
}

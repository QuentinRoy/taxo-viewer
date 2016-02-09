import tableTemplate from "./table.handlebars";

export class Entry {
    constructor(id, properties){
        this.id = id;
        this.properties = properties;
    }
}

export class HeaderCell {
    constructor(property, category, parentHeader, subProperties=[], entries=[]){
        this.property = property;
        this.category = category;
        this.parentHeader = parentHeader;
        [this.subProperty, ...this.subSubProperties] = subProperties;
        this.entries = null;
        this.subHeaders = null;
        this.addEntries(entries);
    }

    addEntries(entries){
        entries.forEach((e) => this.addEntry(e));
    }

    addEntry(entry){
        if(this.subProperty){
            this.subHeaders = this.subHeaders || {};
            const entryCat = entry.properties[this.subProperty];
            let subHeader = this.subHeaders[entryCat];
            if(!subHeader){
                this.subHeaders[entryCat] = subHeader = new HeaderCell(
                    this.subProperty, entryCat, this, this.subSubProperties
                );
            }
            subHeader.addEntry(entry);
        } else {
            this.entries = this.entries || [];
            this.entries.push(entry);
        }
    }

    get isBottomHeader(){
        return !this.subProperty;
    }

    getSubHeadersList(){
        return this.subHeaders ? Object.keys(this.subHeaders).map((k) => this.subHeaders[k])
                               : [];
    }

    hasMultipleSub(){
        return this.subHeaders && Object.keys(this.subHeaders).length > 1;
    }

    getBottomHeaders(){
        if(this.isBottomHeader){
            return [this];
        } else {
            return this.getSubHeadersList().reduce(
                (bottomHeaders, sub) => bottomHeaders.concat(sub.getBottomHeaders()),
                []
            );
        }
    }

    width(){
        if(this.isBottomHeader){
            return 1;
        } else {
            return this.getSubHeadersList().reduce(
                (acc, header) => acc + header.width(), 0
            );
        }
    }
}

function createHeaderRows(headercell, properties, rows=[], level=0){
    const currentRow = rows[level] = rows[level] || [];
    // Fetch the possible categories for the property of the subcells and add the "undefined" category.
    const subCategories = properties.find(
        p => p.name === headercell.subProperty
    ).categories.concat(["undefined"]);
    // Fetch the subcells in category order.
    const subcells = subCategories.map((subcat) => headercell.subHeaders[subcat]).filter(x => !!x);
    // Add the subcells of unknown category
    subcells.push(...headercell.getSubHeadersList().filter(sh => subcells.indexOf(sh) < 0));
    // Push the subcells to current row.
    currentRow.push(...subcells);
    // Reapply for all subcells that are not at the bottom of the header
    subcells.filter(
        sc => !sc.isBottomHeader
    ).forEach(
        (hc) => createHeaderRows(hc, properties, rows, level + 1)
    );
    return rows;
}

function createBodyRows(headerRows){
    const bodyRows = [];
    const bottomHeader = headerRows[headerRows.length - 1];
    const colNb = bottomHeader.length;
    bottomHeader.forEach((header, colNum) => {
        header.entries.forEach((entry, rowNum) => {
            const row = bodyRows[rowNum] = bodyRows[rowNum] || new Array(colNb).fill(null);
            row[colNum] = entry;
        });
    });
    return bodyRows;
}

export default function refTable(references, properties){
    const refEntries = Object.keys(references).map((k) => new Entry(
        k, references[k]
    ));
    const hc = new HeaderCell("root", null, null, properties.map(p => p.name), refEntries);
    const headerRows = createHeaderRows(hc, properties);
    return tableTemplate({
        id: "ref-table",
        headerRows,
        bodyRows: createBodyRows(headerRows)
    });
    // return group(references, properties);
}

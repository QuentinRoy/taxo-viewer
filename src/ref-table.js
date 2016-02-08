class Entry {
    constructor(id, properties){
        this.id = id;
        this.properties = properties;
    }
}

class HeaderCell {
    constructor(property, category, parentHeader, subProperties=[], entries=[]){
        this.property = property;
        this.category = category;
        this.parentHeader = parentHeader;
        [this._subProperty, ...this._subSubProperties] = subProperties;
        this.addEntries(entries);
    }

    addEntries(entries){
        entries.forEach((e) => this.addEntry(e));
    }

    addEntry(entry){
        if(this._subProperty){
            this.subHeaders = this.subHeaders || {};
            const entryCat = entry.properties[this._subProperty];
            let subHeader = this.subHeaders[entryCat];
            if(!subHeader){
                this.subHeaders[entryCat] = subHeader = new HeaderCell(
                    this._subProperty, entryCat, this, this._subSubProperties
                );
            }
            subHeader.addEntry(entry);
        } else {
            this.entries = this.entries || [];
            this.entries.push(entry);
        }
    }
}


export default function refTable(references, ...properties){
    const refEntries = Object.keys(references).map((k) => new Entry(
        k, references[k]
    ));
    return new HeaderCell("root", null, null, properties, refEntries);
    // return group(references, properties);
}

function removeEnclosingBraces(str){
    return str.substring(
        str[0] === "{" ? 1 : 0,
        str[str.length - 1] === "}" ? str.length - 1 : str.length
    )
}

export class Entry {
    constructor(id, properties, biblio){
        this.id = id;
        this.properties = properties;
        this.biblio = biblio;
        this.authors = this.biblio.entryTags.author.split(" and ").map((author) => {
            const [lastName, firstName] = author.split(", ").map(
                x => removeEnclosingBraces(x).trim()
            );
            // console.log({ lastName, firstName });
            return { lastName, firstName };
        });
        this.title = removeEnclosingBraces(this.biblio.entryTags.title);
        if(this.biblio.entryTags.doi){
            if(this.biblio.entryTags.doi.startsWith("http")){
                this.url = this.biblio.entryTags.doi;
            } else {
                this.url = "http://dx.doi.org/"+this.biblio.entryTags.doi;
            }
        } else {
            this.url = this.biblio.entryTags.url;
        }
    }
}

export class PropertyNode {
    constructor(property, category, parentHeader, subProperties=[], entries=[]){
        this.property = property;
        this.category = category;
        this.parentHeader = parentHeader;
        [this.subProperty, ...this.subSubProperties] = subProperties;
        this.entries = null;
        this.subProperties = null;
        this.addEntries(entries);
    }

    addEntries(entries){
        entries.forEach((e) => this.addEntry(e));
    }

    addEntry(entry){
        if(this.subProperty){
            this.subProperties = this.subProperties || {};
            const entryCat = entry.properties[this.subProperty];
            let subHeader = this.subProperties[entryCat];
            if(!subHeader){
                this.subProperties[entryCat] = subHeader = new PropertyNode(
                    this.subProperty, entryCat, this, this.subSubProperties
                );
            }
            subHeader.addEntry(entry);
        } else {
            this.entries = this.entries || [];
            this.entries.push(entry);
        }
    }

    get isLeave(){
        return !this.subProperty;
    }

    getSubPropertiesList(){
        return this.subProperties ? Object.keys(this.subProperties).map((k) => this.subProperties[k])
                                  : [];
    }

    hasMultipleSub(){
        return this.subProperties && Object.keys(this.subProperties).length > 1;
    }

    getLeaves(){
        if(this.isLeave){
            return [this];
        } else {
            return this.getSubPropertiesList().reduce(
                (bottomHeaders, sub) => bottomHeaders.concat(sub.getLeaves()),
                []
            );
        }
    }

    width(){
        if(this.isLeave){
            return 1;
        } else {
            return this.getSubPropertiesList().reduce(
                (acc, header) => acc + header.width(), 0
            );
        }
    }
}

export class PropertyTree extends PropertyNode {
    constructor(properties=[], entries=[]){
        super("root", null, null, properties, entries);
    }
}
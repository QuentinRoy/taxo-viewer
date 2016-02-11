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

export class CategoryNode {
    constructor(property, category, parentHeader, subProperties=[], entries=[]){
        this.property = property;
        this.category = category;
        this.parentHeader = parentHeader;
        this.subProperties = subProperties;
        this.entries = [];
        this.subCategories = {};
        if(this.subProperties.length){
            this._addAllSubCategories();
        }
        this.addEntries(entries);
    }

    addEntries(entries){
        entries.forEach((e) => this.addEntry(e));
    }

    _addAllSubCategories(){
        const directSub = this.subProperties[0]
        if(directSub && directSub.categories){
            directSub.categories.forEach(c => this._addSubCategory(c));
        }
    }

    _addSubCategory(categoryName){
        const [subProperty, ...subSubProperties] = this.subProperties;
        this.subCategories[categoryName] = new CategoryNode(
            subProperty, categoryName, this, subSubProperties
        );
    }

    addEntry(entry){
        this.entries.push(entry);
        if(this.subProperties.length){
            const entryCat = entry.properties[this.subProperties[0].name];
            if(!(entryCat in this.subCategories)){
                this._addSubCategory()
            }
            this.subCategories[entryCat].addEntry(entry);
        }
    }

    get isLeave(){
        return !this.subProperties.length;
    }

    isEmpty(){
        return !(this.entries && this.entries.length);
    }

    getSubCategoriesList(){
        return this.subCategories ? Object.keys(this.subCategories).map((k) => this.subCategories[k])
                                  : [];
    }

    getLeaves(){
        if(this.isLeave){
            return [this];
        } else {
            return this.getSubCategoriesList().reduce(
                (bottomHeaders, sub) => bottomHeaders.concat(sub.getLeaves()),
                []
            );
        }
    }
}

export class CategoryTree extends CategoryNode {
    constructor(properties=[], entries=[]){
        super("root", "root", null, properties, entries);
    }
}
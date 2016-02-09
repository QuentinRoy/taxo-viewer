import yaml from "js-yaml";
import { Entry, PropertyTree } from "./model"
import refTable from "./ref-table";
import parseBibtex from "./bibtex";

Promise.all([
    // Fetch the bibliography and parses it
    fetch("data/biblio.bib").then(res => res.text()).then(bib => parseBibtex(bib)),
    // Fetch the reference data and load it as json.
    fetch("data/refs.yml").then(res => res.text()).then(yml => yaml.safeLoad(yml)),
    // Fetch the taxonomy data and load it as json.
    fetch("data/taxonomy.yml").then(res => res.text()).then(yml => yaml.safeLoad(yml)),
    // Also wait for the window to be loaded.
    new Promise((resolve) => { window.addEventListener("load", resolve); })
]).then((result) => {
    const [biblio, references, propCategories] = result;
    const targetPropertyNames = ["Topic", "Architecture", "Interaction Direction", "Input Sequencing"];
    const targetProperties = targetPropertyNames.map(
        (name) => ({ name, categories: propCategories[name] })
    );
    const refEntries = Object.keys(references).map((k) => new Entry(
        k, references[k], biblio[k]
    ));
    const propTree = new PropertyTree(targetPropertyNames, refEntries);
    const tableHTML = refTable(propTree, targetProperties);
    document.body.innerHTML += tableHTML;
}).catch((err) => {
    if(err.message){
        console.error(err.stack, err.message);
    } else {
        console.error(err);
    }
});
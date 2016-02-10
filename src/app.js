import yaml from "js-yaml";
import { Entry, PropertyTree } from "./model"
import refTable from "./ref-table";
import bibtex from "bibtex-parse-js";
import parseHTML from "./parseHTML";
import tooltip from "./tooltip";
import tooltipTemplate from "./templates/tooltip.handlebars"

Promise.all([
    // Fetch the bibliography and parses it
    fetch("data/biblio.bib").then(res => res.text()).then(
        bib => bibtex.toJSON(bib).reduce((dict, entry) => {
            dict[entry.citationKey] = entry;
            return dict;
        }, {})
    ),
    // Fetch the reference data and load it as json.
    fetch("data/refs.yml").then(res => res.text()).then(yml => yaml.safeLoad(yml)),
    // Fetch the taxonomy data and load it as json.
    fetch("data/taxonomy.yml").then(res => res.text()).then(yml => yaml.safeLoad(yml)),
    // Also wait for the window to be loaded.
    new Promise((resolve) => { window.addEventListener("load", resolve); })
]).then((result) => {
    const [biblio, references, propCategories] = result;
    // TODO: Let the user specify this.
    const targetPropertyNames = ["Topic", "Architecture", "Interaction Direction", "Input Sequencing"];
    // Associate each properties with its different categories.
    const targetProperties = targetPropertyNames.map(
        (name) => ({ name, categories: propCategories[name] })
    );
    // Create the reference entries.
    const refEntries = Object.keys(references).map((k) => new Entry(
        k, references[k], biblio[k]
    ));
    // Create the property tree.
    const propTree = new PropertyTree(targetPropertyNames, refEntries);
    // Create the table and append it.
    const tableDOM = parseHTML(refTable("ref-table", propTree, targetProperties))[0];
    document.querySelector(".wrapper").appendChild(tableDOM);

    // Associate each entry with its dom and create the tooltips.
    for(const entry of refEntries){
        entry.dom = tableDOM.querySelector(`[data-bib-id=${entry.id}] .ref-entry`);
        entry.tooltip = tooltip(entry.dom, {
            content: tooltipTemplate(entry),
            position: "bottom",
            delay: 0
        })
    }
}).catch((err) => {
    if(err.message){
        console.error(err.stack, err.message);
    } else {
        console.error(err);
    }
});
import yaml from "js-yaml";
import { Entry, CategoryTree } from "./model"
import refTable from "./ref-table";
import bibtex from "bibtex-parse-js";
import { parseHTML, docLoadedPromise } from "./utils";
import tooltip from "./tooltip";
import tooltipTemplate from "./templates/tooltip.handlebars";
import tie from "tie";
import PropSelector from "./prop-selector";

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
    // Also wait for the document to be loaded.
    docLoadedPromise
]).then((result) => {
    const [biblio, references] = result;
    const propCategories = tie(result[2]);

    const targetPropertyNames = tie(["Topic", "Interaction Direction", "Input Sequencing"]);
    // Associate each properties with its different categories.
    const targetProperties = tie(() => targetPropertyNames.get().map(
        (name) => ({
            name,
            categories: propCategories.prop(name).get() || []
        })
    ));

    const categoryNames = tie(() => Object.keys(propCategories.get()));

    const propSelector = new PropSelector(categoryNames, targetPropertyNames);
    document.querySelector(".selector-wrapper").appendChild(propSelector.dom);

    // Create the reference entries.
    const refEntries = tie(Object.keys(references).map((k) => new Entry(
        k, references[k], biblio[k]
    )));
    // Create the property tree.
    const propTree = tie(()=> new CategoryTree(targetProperties.get(), refEntries.get()));
    // Create the table and append it.
    const tableDOM = tie(() => parseHTML(refTable("ref-table", propTree.get(), targetProperties.get()))[0]);

    let previousDOM = null;

    tie.liven(()=>{
        if(previousDOM){
            previousDOM.parentNode.removeChild(previousDOM);
        }
        document.querySelector(".table-wrapper").appendChild(tableDOM.get());
        previousDOM = tableDOM.get();
        // Associate each entry with its dom and create the tooltips.
        for(const entry of refEntries.get()){
            entry.doms = Array.from(
                tableDOM.get().querySelectorAll(`[data-bib-id=${entry.id}] .ref-entry`)
            );
            for(const dom of entry.doms){
                entry.tooltip = tooltip(dom, {
                    content: tooltipTemplate(entry),
                    position: "bottom",
                    delay: 0
                });
            }
        }
    });
}).catch((err) => {
    if(err.message){
        console.error(err.stack, err.message);
    } else {
        console.error(err);
    }
});
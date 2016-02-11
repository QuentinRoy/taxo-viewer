import yaml from "js-yaml";
import { Entry, CategoryTree } from "./model"
import refTable from "./ref-table";
import bibtex from "bibtex-parse-js";
import { parseHTML, docLoadedPromise, strReplaceAll } from "./utils";
import tooltip from "./tooltip";
import tooltipTemplate from "./templates/tooltip.handlebars";
import tie from "tie";
import PropSelector from "./prop-selector";
import querystring from "querystring";
import isEqual from "lodash-es/isEqual";
import mapValues from "lodash-es/mapValues";

const normalizeProperty = (pName, p) => {
    p = Array.isArray(p) ? { categories: p } : p ? p
                                                 : { categories: [] };
    return Object.assign(p, { name: pName });
}
const normalizeProperties = properties => mapValues(properties,
    (p, pName) => normalizeProperty(pName, p)
);
const normalizeRefs = refs => mapValues(refs, r => normalizeRef(r));
const normalizeRef = ref => mapValues(ref, p => Array.isArray(p) ? p : [p]);
const biblioListToDict = bibEntries => bibEntries.reduce(
    (bibDict, e) => Object.assign(bibDict, {[e.citationKey]: e}),
    {}
);

const urlParams = querystring.parse(window.location.search.substring(1));

Promise.all([
    // Fetch the bibliography and parses it.
    fetch("data/biblio.bib").then(res => res.text()).then(
        bib => biblioListToDict(bibtex.toJSON(bib))
    ),
    // Fetch the reference data and load it as json.
    fetch("data/refs.yml").then(res => res.text()).then(
        yml => normalizeRefs(yaml.safeLoad(yml))
    ),
    // Fetch the taxonomy data, load it as json and normalize it.
    fetch("data/taxonomy.yml").then(res => res.text()).then(
        ymlTxt => normalizeProperties(yaml.safeLoad(ymlTxt))
    ),
    // Also wait for the document to be loaded.
    docLoadedPromise
]).then((results) => {
    const [biblio, references, properties] = results.map(tie);

    const targetPropertiesNames = tie(
        urlParams.properties ? strReplaceAll(urlParams.properties, "_", " ").split(',')
                             : ["Topic", "Interaction Direction", "Input Sequencing"]
    );

    // Manage the history state and the url.
    const propQuery = tie(() => strReplaceAll(targetPropertiesNames.get().join(","), " ", "_"));
    targetPropertiesNames.onChange((properties)=>{
        const stateProp = window.history.state && window.history.state.properties;
        if(!isEqual(stateProp, properties)){
            window.history.pushState({
                properties: properties.slice()
            }, null, "?properties="+propQuery.get());
        }
    });
    window.history.replaceState({
        properties: targetPropertiesNames.get().slice()
    }, null, "?properties="+propQuery.get());
    window.addEventListener("popstate", evt => targetPropertiesNames.set(evt.state.properties));

    // Associate each properties with its different categories.
    const targetProperties = tie(() => targetPropertiesNames.get().map(
        (name) => properties.prop(name).get()
    ));

    const categoryNames = tie(() => Object.keys(properties.get()));

    const propSelector = new PropSelector(categoryNames, targetPropertiesNames);
    document.querySelector(".selector-wrapper").appendChild(propSelector.dom);

    // Create the reference entries.
    const refEntries = tie(() => {
        const refs = references.get(), bib = biblio.get();
        return Object.keys(refs).map(k => new Entry(k, refs[k], bib[k]));
    });
    // Create the property tree.
    const propTree = tie(() => new CategoryTree(targetProperties.get(), refEntries.get()));
    // Create the table and append it.
    const tableDOM = tie(() => parseHTML(refTable("ref-table", propTree.get(), targetProperties.get()))[0]);

    let cacheddom = null;
    tie.liven(()=>{
        if(cacheddom){
            cacheddom.parentNode.removeChild(cacheddom);
        }
        document.querySelector(".table-wrapper").appendChild(tableDOM.get());
        cacheddom = tableDOM.get();

        // Associate each entry with its dom and create the tooltips.
        for(const entry of refEntries.get()){
            entry.doms = Array.from(
                cacheddom.querySelectorAll(`[data-bib-id=${entry.id}] .ref-entry`)
            );
            for(const dom of entry.doms){
                entry.tooltip = tooltip(dom, {
                    content: tooltipTemplate(entry),
                    position: "bottom",
                    delay: 0
                });
                dom.addEventListener("mouseover", () => {
                    entry.doms.forEach(d => d.classList.add("highlighted"));
                });
                dom.addEventListener("mouseout", () => {
                    entry.doms.forEach(d => d.classList.remove("highlighted"));
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
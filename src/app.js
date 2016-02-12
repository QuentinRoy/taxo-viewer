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
import {
    sorting as DEFAULT_SORTING,
    targetProperties as DEFAULT_PROPS
} from "./defaults";

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
    (bibDict, e) => Object.assign(bibDict, {[e.citationKey]: e}), {}
);

// Retrieve the url arguments and create the decoder and encoder.
const urlParams = querystring.parse(window.location.search.substring(1));
const decodePropertyUrlParam = (pParam) => strReplaceAll(pParam, "_", " ").split(',');
const encodePropertyUrlParam = (pParam) => strReplaceAll(pParam.join(","), " ", "_");

const sorting = tie(urlParams.sorting || DEFAULT_SORTING);
const selectorWrapper = document.querySelector(".selector-wrapper");
const tableWrapper = document.querySelector(".table-wrapper");

const noCacheHeader = new Headers();
noCacheHeader.append('pragma', 'no-cache');
noCacheHeader.append('cache-control', 'no-cache');
const fetchArgs = {
    method: "GET",
    headers: noCacheHeader
}

// Fetch the bibliography and parses it, and make it a constraint.
const biblioReq = fetch("data/biblio.bib", fetchArgs).then(res => res.text()).then(
    bib => biblioListToDict(bibtex.toJSON(bib))
).then(tie);

// Fetch the reference data and load it as json and make it a constraint.
const refsReq = fetch("data/refs.yml", fetchArgs).then(res => res.text()).then(
    yml => normalizeRefs(yaml.safeLoad(yml))
).then(tie);

// Fetch the taxonomy data, load it as json and normalize it and make it a constraint.
const taxoReq = fetch("data/taxonomy.yml", fetchArgs).then(res => res.text()).then(
    ymlTxt => normalizeProperties(yaml.safeLoad(ymlTxt))
).then(tie);

// Will create the property selector widget and returns a promise of a (writable) constraint 
// on the selection.
const selectionPromise = docLoadedPromise.then(() => taxoReq).then((taxonomy) => {
    const propertiesNames = tie(() => Object.keys(taxonomy.get()));
    // Create the property selector.
    const propSelector = new PropSelector(
        propertiesNames,
        urlParams.properties ? decodePropertyUrlParam(urlParams.properties) : DEFAULT_PROPS
    );
    selectorWrapper.appendChild(propSelector.dom);
    selectorWrapper.classList.remove("loading");
    return propSelector.selection;
});

// Create the table.
Promise.all(
    [biblioReq, refsReq, taxoReq, selectionPromise, docLoadedPromise]
).then(([biblio, references, properties, targetPropertiesNames]) => {

    // Get the actual property object from the names of the target properties names.
    const targetProperties = tie(() => targetPropertiesNames.get().map(
        (name) => properties.prop(name).get()
    ));

    // Create the reference entries.
    const refEntries = tie(() => {
        const refs = references.get(), bib = biblio.get();
        return Object.keys(refs).map(k => new Entry(k, refs[k], bib[k]));
    });

    // Create the property tree and the table dom.
    const propTree = tie(() => new CategoryTree(targetProperties.get(), refEntries.get()));
    const tableDOM = tie(() => parseHTML(refTable("ref-table", propTree.get(), targetProperties.get(), sorting.get()))[0]);

    let cachedTableDOM = null;
    tie.liven(()=>{
        // Remove the previous table DOM and append the new one.
        if(cachedTableDOM){
            cachedTableDOM.parentNode.removeChild(cachedTableDOM);
        }
        tableWrapper.appendChild(tableDOM.get());
        cachedTableDOM = tableDOM.get();

        // Associate each entry with its dom(s) and create the tooltips.
        for(const entry of refEntries.get()){
            entry.doms = Array.from(
                cachedTableDOM.querySelectorAll(`[data-bib-id=${entry.id}] .ref-entry`)
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

    // Make the loadWrapper fade out.
    document.querySelector("#load-wrapper").classList.remove("loading");
    tableWrapper.classList.remove("loading");
});

// Manage url arguments updates and history states.
selectionPromise.then((targetPropertiesNames) => {

    // Update url & state in function of target properties' names.
    targetPropertiesNames.onChange((propertiesNames)=>{
        const stateProp = window.history.state && window.history.state.properties;
        if(!isEqual(stateProp, propertiesNames)){
            // FIXME: Erases any arguments other than properties (such as sorting).
            window.history.pushState({
                properties: propertiesNames.slice()
            }, null, "?properties="+ encodePropertyUrlParam(propertiesNames));
        }
    });

    // Replace the current state.
    window.history.replaceState({
        properties: targetPropertiesNames.get().slice()
    }, null, "?properties=" + encodePropertyUrlParam(targetPropertiesNames.get()));

    // Update target properties when the state changes.
    window.addEventListener("popstate", evt => targetPropertiesNames.set(evt.state.properties));
});
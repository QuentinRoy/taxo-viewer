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
    (bibDict, e) => Object.assign(bibDict, {[e.citationKey]: e}),
    {}
);

const urlParams = querystring.parse(window.location.search.substring(1));

const noCacheHeader = new Headers();
noCacheHeader.append('pragma', 'no-cache');
noCacheHeader.append('cache-control', 'no-cache');
const fetchArgs = {
    method: "GET",
    headers: noCacheHeader
}

Promise.all([
    // Fetch the bibliography and parses it.
    fetch("data/biblio.bib", fetchArgs).then(res => res.text()).then(
        bib => biblioListToDict(bibtex.toJSON(bib))
    ),
    // Fetch the reference data and load it as json.
    fetch("data/refs.yml", fetchArgs).then(res => res.text()).then(
        yml => normalizeRefs(yaml.safeLoad(yml))
    ),
    // Fetch the taxonomy data, load it as json and normalize it.
    fetch("data/taxonomy.yml", fetchArgs).then(res => res.text()).then(
        ymlTxt => normalizeProperties(yaml.safeLoad(ymlTxt))
    ),
    // Also wait for the document to be loaded.
    docLoadedPromise
]).then((results) => {
    const sorting = tie(urlParams.sorting || DEFAULT_SORTING);
    const selectorWrapper = document.querySelector(".selector-wrapper");
    const tableWrapper = document.querySelector(".table-wrapper");
    const [biblio, references, properties] = results.map(tie);

    const propertiesNames = tie(() => Object.keys(properties.get()));
    const targetPropertiesNames = tie(
        urlParams.properties ? strReplaceAll(urlParams.properties, "_", " ").split(',')
                             : DEFAULT_PROPS
    );
    const targetProperties = tie(() => targetPropertiesNames.get().map(
        (name) => properties.prop(name).get()
    ));

    // Create the property selector.
    const propSelector = new PropSelector(propertiesNames, targetPropertiesNames);
    selectorWrapper.appendChild(propSelector.dom);
    selectorWrapper.classList.remove("loading");

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

        // Associate each entry with its dom and create the tooltips.
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

    // Manage the history state and the url.
    // FIXME: Erases any arguments other than properties.
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

}).catch((err) => {
    if(err.message){
        console.error(err.stack, err.message);
    } else {
        console.error(err);
    }
});
import yaml from "js-yaml";
import "./templates/table.css";
import bibtex from "bibtex-parse-js";
import tie from "tie";
import querystring from "querystring";
import isEqual from "lodash-es/isEqual";
import mapValues from "lodash-es/mapValues";
import { Entry } from "./model";
import { docLoadedPromise, strReplaceAll } from "./utils";
import PropSelectorWidget from "./prop-selector-widget";
import TableWidget from "./table-widget";
import {
    sorting as DEFAULT_SORTING,
    targetProperties as DEFAULT_PROPS
} from "./defaults";


const normalizeProperty = (pName, p) => {
    if(!p){
        p = { categories: [] }
    } else if(Array.isArray(p)){
        p = { categories: p }
    }
    p.name = pName;
    return p;
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
const decodePropertyUrlParam = (pParam="") => strReplaceAll(pParam, "_", " ").split(',');
const encodePropertyUrlParam = (pParam=[]) => strReplaceAll(pParam.join(","), " ", "_");

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
const selectorPromise = Promise.all([taxoReq, docLoadedPromise]).then(([taxonomy]) => {
    // Create the property selector.
    const propSelector = new PropSelectorWidget(
        taxonomy,
        tie(urlParams.properties ? decodePropertyUrlParam(urlParams.properties) : DEFAULT_PROPS)
    );
    selectorWrapper.appendChild(propSelector.dom);
    return propSelector;
});


// Will create the table.
const tablePromise = Promise.all(
    [biblioReq, refsReq, selectorPromise, docLoadedPromise]
).then(([biblio, references, selector]) => {

    const targetProperties = selector.selection;

    // Create the reference entries.
    const refEntries = tie(() => {
        const refs = references.get(), bib = biblio.get();
        return Object.keys(refs).map(k => new Entry(k, refs[k], bib[k]));
    });

    // Create the table.
    new TableWidget(targetProperties, refEntries, sorting, tableWrapper);
});


// Will manage url arguments updates and history states.
const urlPromise = selectorPromise.then((selector) => {
    const targetProperties = selector.selection;
    const targetPropertiesNames = targetProperties.alter(tps => tps.map(tp => tp.name));

    // Update url & state in function of target properties' names.
    targetProperties.onChange((properties)=>{
        const stateProp = window.history.state && window.history.state.properties;
        if(!isEqual(stateProp, properties)){
            // FIXME: Erases any arguments other than properties (such as sorting).
            window.history.pushState({
                properties: targetPropertiesNames.get().slice()
            }, null, "?properties="+ encodePropertyUrlParam(targetPropertiesNames.get()));
        }
    });

    // Replace the current state.
    window.history.replaceState({
        properties: targetPropertiesNames.get().slice()
    }, null, "?properties=" + encodePropertyUrlParam(targetPropertiesNames.get()));

    // Update target properties when the state changes.
    window.addEventListener("popstate", evt => {
        selector.selectionNames.set(evt.state.properties.slice());
    });
});


// Will manage loading and errors.
tablePromise.then(() => tableWrapper.classList.remove("loading"));
selectorPromise.then(() => selectorWrapper.classList.remove("loading"));
Promise.all([tablePromise, selectorPromise, urlPromise]).then(
    () => document.querySelector("#load-wrapper").classList.remove("loading")
).catch(
    (err) => {
        document.body.innerHTML = "<div id=\"err\">Oops... Something went wrong. Sorry!</div>";
        if(err.message){
            console.error(err.stack, err.message);
        } else {
            console.error(err);
        }
    }
);

import yaml from "js-yaml";
import refTable from "./ref-table";

Promise.all([
    // Fetch the reference data and load it as json.
    fetch("data/refs.yml").then(res => res.text()).then(yml => yaml.safeLoad(yml)),
    // Fetch the taxonomy data and load it as json.
    fetch("data/taxonomy.yml").then(res => res.text()).then(yml => yaml.safeLoad(yml)),
    // Also wait for the window to be loaded.
    new Promise((resolve) => { window.addEventListener("load", resolve); })
]).then((result) => {
    const references = result[0];
    const propCategories = result[1];
    const targetProperties = ["Topic", "Architecture", "Interaction Direction", "Input Sequencing"];
    const tableHTML = refTable(references, targetProperties.map((name) => ({
        name: name,
        categories: propCategories[name]
    })));
    document.body.innerHTML += tableHTML;
}).catch((e) => {
    console.error(e.stack, e.message);
});
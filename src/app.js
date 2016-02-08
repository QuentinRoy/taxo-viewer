import yaml from "js-yaml";
import refTable from "./ref-table";

Promise.all([
    // Fetch the reference data and load it as json.
    fetch("data/refs.yml").then(res => res.text()).then(yml => yaml.safeLoad(yml)),
    // Also wait for the window to be loaded.
    new Promise((resolve) => { window.addEventListener("load", resolve); })
]).then((result) => {
    const references = result[0];
    console.log(refTable(references, "Topic", "Interaction Direction", "Input Sequencing"));
});
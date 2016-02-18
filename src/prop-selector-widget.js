import tie from "tie";
import template from "./templates/prop-selector.handlebars";
import "./templates/prop-selector.css";
import { parseHTML, arrayRemove } from "./utils";
import values from "lodash-es/values";

// Check if prop1 requires prop2
function propRequire(prop1, prop2, properties){
    if(!prop1.parents){
        return false;
    } else if(prop2.name in prop1.parents) {
        return true;
    } else {
        return Object.keys(prop1.parents).map(p => properties[p]).some(
            parentProp => propRequire(parentProp, prop2, properties)
        )
    }
}

export default class PropertySelectorWidget {
    constructor(properties, initSelection){
        this.properties = properties;
        this.inputSelection = initSelection;
        this.propertiesNames = tie(() => Object.keys(properties.get()));
        this.selection = tie(
            () => this.inputSelection.get().map(n => this.properties.get()[n])
                                           .filter(prop => !!prop)
        );
        this.selectionNames = this.selection.alter(sel => sel.map(p => p.name));
        const remainingProperties = tie(() => {
            const selectionNames = this.selectionNames.get();
            return values(this.properties.get()).filter(
                p => selectionNames.indexOf(p.name) < 0
            );
        });
        const unavailableProperties = tie(() => {
            const selectionNames = this.selectionNames.get();
            return remainingProperties.get().filter(
                prop => prop.parents && selectionNames.every(sel => !(sel in prop.parents))
            );
        });
        const html = tie(() => template({
            selectedProperties: this.selectionNames.get(),
            remainingProperties: remainingProperties.get().map(p => p.name).sort(),
            unavailableProperties: unavailableProperties.get().map(p => p.name).sort()
        }));
        this.dom = parseHTML("<div class='property-selector'></div>")[0];

        tie.liven(()=>{
            this.dom.innerHTML = html.get();

            // Add event listeners on selection.
            Array.prototype.forEach.call(this.dom.querySelectorAll(".prop-selector-selection"), sel => {
                sel.addEventListener("click", ()=> {
                    const propName = sel.innerHTML.trim();
                    const property = this.properties.get()[propName];
                    const properties = this.properties.get();
                    let selection = this.selection.get();
                    // Removes the clicked property from the selection.
                    arrayRemove(selection, property);
                    // Also removes any property it depends on.
                    selection = selection.filter(p => !propRequire(p, property, properties));
                    // Set the new selection
                    this.inputSelection.set(selection.map(s => s.name));
                });
            });

            // Add event listeners on available.
            Array.prototype.forEach.call(this.dom.querySelectorAll(".prop-selector-av:not(.unavailable)"), av => {
                av.addEventListener("click", ()=> {
                    const propName = av.innerHTML.trim();
                    this.inputSelection.set(this.selectionNames.get().concat([propName]));
                });
            });
        });
    }
}

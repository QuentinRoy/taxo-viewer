import tie from "tie";
import template from "./templates/prop-selector.handlebars";
import "./templates/prop-selector.css";
import { parseHTML } from "./utils";
import values from "lodash-es/values";

function removeProperty(propName, selection){
    selection.splice(selection.findIndex(s => s.name === propName));
    removeInapropriateProperties(selection);
}

function removeInapropriateProperties(selection){
    let checkAgain = true;
    while(checkAgain){
        checkAgain = false;
        for(const [i, s] in selection.entries()){
            // If the property has parents and none of them are in the selection.
            if(s.parents && s.parents.every(p => selection.indexOf(p) < 0)){
                // Remove the property.
                selection.splice(i, 1);
                // Specify that we will need another "round" as another property
                // has been removed.
                checkAgain = true;
                // Start the new round immediately.
                break;
            }
        }
    }
}

export default class PropertySelectorWidget {
    constructor(properties, initSelection){
        this.properties = properties;
        this.inputSelection = initSelection;
        this.propertiesNames = tie(() => Object.keys(properties.get()));
        this.selection = tie(() => {
            const selection = this.inputSelection.get().map(n => this.properties.get()[n])
                                                       .filter(prop => !!prop);
            removeInapropriateProperties(selection);
            return selection;
        });
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
                    const newSelection = this.selection.get().slice();
                    // Remove the clicked property from the selection.
                    removeProperty(propName, newSelection);
                    // Set the new selection.
                    this.inputSelection.set(newSelection.map(s => s.name));
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

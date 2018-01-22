import tie from "tie-constraint";
import template from "./templates/prop-selector.handlebars";
import "./templates/prop-selector.css";
import { parseHTML } from "./utils";
import values from "lodash/values";

function removeProperty(propName, selection){
    selection.splice(selection.findIndex(s => s.name === propName), 1);
    removeInapropriateProperties(selection);
}

function removeInapropriateProperties(selection){
    let checkAgain = true;
    while(checkAgain){
        checkAgain = false;
        for(const [i, s] of selection.entries()){
            // If the property has parents and none of them are in the selection.
            if(s.parents && !Object.keys(s.parents).some(p => selection.some(s => s.name === p))){
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
            for(const sel of this.dom.querySelectorAll(".prop-selector-selection")){
                sel.addEventListener("click", ()=> {
                    const propName = sel.innerHTML.trim();
                    const newSelection = this.selection.get().slice();
                    // Remove the clicked property from the selection.
                    removeProperty(propName, newSelection);
                    // Set the new selection.
                    this.inputSelection.set(newSelection.map(s => s.name));
                });
            }

            // Add event listeners on available.
            for(const av of this.dom.querySelectorAll(".prop-selector-av:not(.unavailable)")){
                av.addEventListener("click", ()=> {
                    const propName = av.innerHTML.trim();
                    this.inputSelection.set(this.selectionNames.get().concat([propName]));
                });
            }
        });
    }
}

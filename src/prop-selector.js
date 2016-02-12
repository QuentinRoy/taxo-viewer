import tie from "tie";
import template from "./templates/prop-selector.handlebars";
import "./templates/prop-selector.css";
import { parseHTML } from "./utils";

export default class PropertySelector {
    constructor(properties, initSelection){
        this.properties = tie(properties);
        this.selection = tie(initSelection);
        this.availableProperties = tie(() => {
            const _selection = this.selection.get();
            return this.properties.get().filter((p) => _selection.indexOf(p) < 0);
        });
        const html = tie(() => template({
            selectedProperties: this.selection.get(),
            availableProperties: this.availableProperties.get().sort()
        }));
        this.dom = parseHTML("<div class='property-selector'></div>")[0];

        tie.liven(()=>{
            this.dom.innerHTML = html.get();

            // At least one element.
            if(this.selection.get().length > 1){
                // Add event listeners on selection.
                Array.prototype.forEach.call(this.dom.querySelectorAll(".prop-selector-selection"), sel => {
                    sel.addEventListener("click", ()=> {
                        const propName = sel.innerHTML.trim();
                        this.selection.set(this.selection.get().filter(p => p !== propName));
                    });
                });
            }

            // Add event listeners on available.
            Array.prototype.forEach.call(this.dom.querySelectorAll(".prop-selector-av"), av => {
                av.addEventListener("click", ()=> {
                    const propName = av.innerHTML.trim();
                    this.selection.set(this.selection.get().concat([propName]));
                });
            });
        });
    }
}
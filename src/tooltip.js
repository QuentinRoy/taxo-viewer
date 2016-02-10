import "tooltipster/css/tooltipster.css";
import jquery from "imports?jQuery=jquery!exports?jQuery!tooltipster"; // Patches jquery

export default function tooltip(target, args){
    // The theme is defined in app.css.
    args = Object.assign({ theme: "tooltipster-ref", speed: 0 }, args);
    args.content = jquery(args.content);

    jquery(target).tooltipster(args);
}
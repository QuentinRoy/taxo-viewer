import "tooltipster/dist/css/tooltipster.main.css";
import "./templates/tooltip.css";
import jquery from "imports-loader?jQuery=jquery!exports-loader?jQuery!tooltipster"; // Patches jquery

export default function tooltip(target, args){
    // The theme is defined in app.css.
    args = Object.assign({ theme: "tooltipster-ref", speed: 100 }, args);
    args.content = jquery(args.content);

    const $target = jquery(target);
    $target.tooltipster(args);

    return {
        show() { $target.tooltipster("show") },
        hide() { $target.tooltipster("hide") }
    }
}

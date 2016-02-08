import isEqual from "lodash-es/isEqual";
import pick from "lodash-es/pick";

export function group(dictionary, targetProps){
    const result = [];
    for(const key in dictionary){
        // If the grouping should be in accordance with some given target properties
        // we only consider these properties.
        const props = targetProps.length ? pick(dictionary[key], targetProps)
                                         : dictionary[key];
        // Try to find a column with the props properties.
        const column = result.find(column => isEqual(column.props, props));
        // Add this key to this column
        if(column){
            column.data.push(key);
        } else {
            result.push({ props, data: [key] });
        }
    }
    return result;
}

export default function refTable(references, ...categories){
    return group(references, categories);
}

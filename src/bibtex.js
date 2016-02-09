import parseBibtex from "bibtex-parse-js";

export default function parse(bibtexStr){
    return parseBibtex.toJSON(bibtexStr).reduce((dict, entry) => {
        dict[entry.citationKey] = entry;
        const authorStr = entry.entryTags.author;
        entry.entryTags.title = removeEnclosingBraces(entry.entryTags.title);
        entry.authors = authorStr ? parseBibAuthors(entry.entryTags.author)
                                  : [];
        return dict;
    }, {})
}

export function parseBibAuthors(authorStr){
    return authorStr.split(" and ").map((author) => {
        const [lastName, firstName] = author.split(", ").map(x => removeEnclosingBraces(x));
        return { lastName, firstName };
    });
}

export function removeEnclosingBraces(str){
    return str.substring(
        str[0] === "{" ? 1 : 0,
        str[str.length - 1] === "}" ? str.length - 1 : str.length
    )
}
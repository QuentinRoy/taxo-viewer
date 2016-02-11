export function parseHTML(str) {
  const tmp = document.implementation.createHTMLDocument();
  tmp.body.innerHTML = str;
  return tmp.body.children;
}

export function arrayRemove(array, obj) {
    const index = array.indexOf(obj);
    if (index > -1) {
        array.splice(index, 1);
        return true;
    }
    return false;
}

export const docLoadedPromise = new Promise(resolve => {
        function handler() {
            if (document.readyState === 'complete') {
                document.removeEventListener('readystatechange', handler);
                setTimeout(resolve);
            }
        }
        document.addEventListener('readystatechange', handler);
        handler();
});

export function objEntries(obj){
    return Object.keys(obj).map(k => [k, obj[k]]);
}

export function objValues(obj){
    return Object.keys(obj).map(k => obj[k]);
}

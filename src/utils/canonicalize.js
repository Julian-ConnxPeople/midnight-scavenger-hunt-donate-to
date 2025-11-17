export function canonicalizeString(phrase) {
    phrase = phrase.trim();
    phrase = phrase.replace(/[\r\n]+/g, ""); // remove all new line charachters
    return phrase.replace(/[ ]{2,}/gi, " "); // reduce 2 or more space between words to 1
}
export function canonicalizePhrase(phrase) {
    phrase = phrase.trim();
    phrase = phrase.replace(/[\r\n]+/g, ""); // remove all new line charachters
    return phrase.replace(/[ ]{2,}/gi, " "); // reduce 2 or more space between words to 1
}
export function canonicalizeWord(word) {
    word = word.trim();
    word = word.replace(/[\r\n]+/g, "");  // remove all new line charachters
    return word.replace(/[ ]{1,}/gi, ""); // reduce 1 or more space between words to 0
}
export function canonicalizePhraseLowerCase(phrase) {
    phrase = canonicalizePhrase(phrase);
    return phrase.toLowerCase();
}
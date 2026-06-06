"use strict";

exports.name = "credit-card-insert";

exports.params = [
    { name: "title" }
];

function getField(wiki, title, field) {
    var tiddler = wiki.getTiddler(title);
    return tiddler ? tiddler.getFieldString(field) : "";
}

function encodeAttribute(value) {
    return (value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function removeNonDigits(value) {
    return (value || "").replace(/\D/g, "");
}
exports.run = function(title) {
    const card = removeNonDigits(getField(this.wiki, title, "card"));
    const date = removeNonDigits(getField(this.wiki, title, "date"));
    const cvc = removeNonDigits(getField(this.wiki, title, "cvc"))    ;

    return '<$credit-card-render card="' + encodeAttribute(card) +
        '" date="' + encodeAttribute(date) +
        '" cvc="' + encodeAttribute(cvc) + '"/>';
};

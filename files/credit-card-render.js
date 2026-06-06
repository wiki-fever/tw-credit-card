!(function () {
    var __extends = (this && this.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            if (typeof b !== "function" && b !== null)
                throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var WidgetModule = require("$:/core/modules/widgets/widget.js");
    var Widget = WidgetModule.widget;
    var VALUE_STYLE = "font-size:14px;letter-spacing:0.5px;";
    var BUTTON_STYLE = "border:1px solid rgba(255,255,255,0.35);background:transparent;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px;";
    function repeatChar(char, count) {
        if (count <= 0) {
            return "";
        }
        return new Array(count + 1).join(char);
    }
    function maskCardNumber(input) {
        var digits = (input || "").replace(/\D/g, "");
        if (!digits) {
            return "•••• •••• •••• ••••";
        }
        if (digits.length <= 8) {
            return digits;
        }
        var first4 = digits.slice(0, 4);
        var last4 = digits.slice(-4);
        var middleLength = Math.max(0, digits.length - 8);
        var middleMasked = repeatChar("•", middleLength);
        var groupedMiddle = middleMasked.replace(/(.{4})/g, "$1 ").trim();
        return "".concat(first4, " ").concat(groupedMiddle, " ").concat(last4).replace(/\s+/g, " ").trim();
    }
    function normalizeDate(input) {
        if (!input) {
            return "MM/YY";
        }
        var digits = input.replace(/\D/g, "");
        if (digits.length >= 4) {
            return "".concat(digits.slice(0, 2), "/").concat(digits.slice(2, 4));
        }
        return input;
    }
    function createVisualGap() {
        var gap = document.createElement("span");
        gap.textContent = " ";
        gap.style.display = "inline-block";
        gap.style.width = "0.5em";
        gap.style.userSelect = "none";
        return gap;
    }
    function renderCardNumberValue(container, input, shown) {
        var _a;
        if (!shown) {
            container.textContent = maskCardNumber(input);
            return;
        }
        var digits = (input || "").replace(/\D/g, "");
        if (!digits) {
            container.textContent = "";
            return;
        }
        container.replaceChildren();
        (_a = digits.match(/.{1,4}/g)) === null || _a === void 0 ? void 0 : _a.forEach(function (group, index, groups) {
            var chunk = document.createElement("span");
            chunk.textContent = group;
            container.appendChild(chunk);
            if (index < groups.length - 1) {
                container.appendChild(createVisualGap());
            }
        });
    }
    function createButton(label, onClick, withMarginRight) {
        if (withMarginRight === void 0) { withMarginRight = false; }
        var button = document.createElement("button");
        button.type = "button";
        button.style.cssText = withMarginRight ? "".concat(BUTTON_STYLE, "margin-right:6px;") : BUTTON_STYLE;
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }
    function createSensitiveBlock(options) {
        var block = document.createElement("div");
        block.style.flex = "1";
        block.style.marginBottom = options.marginBottom || "10px";
        var valueNode = document.createElement("div");
        valueNode.style.cssText = options.valueStyle || VALUE_STYLE;
        if (options.setValue) {
            options.setValue(valueNode, false);
        }
        else {
            valueNode.textContent = options.hiddenText;
        }
        valueNode.style.marginBottom = "6px";
        var shown = false;
        var actions = document.createElement("div");
        var toggleButton = createButton("Show", function () {
            shown = !shown;
            if (options.setValue) {
                options.setValue(valueNode, shown);
            }
            else {
                valueNode.textContent = shown ? options.shownText : options.hiddenText;
            }
            toggleButton.textContent = shown ? "Hide" : "Show";
        }, true);
        var copyButton = createButton("Copy", function () {
            options.onCopy(options.copyValue || "");
        });
        var secondaryCopyButton = options.secondaryCopyLabel
            ? createButton(options.secondaryCopyLabel, function () {
                options.onCopy(options.secondaryCopyValue || "");
            }, true)
            : null;
        actions.appendChild(toggleButton);
        if (secondaryCopyButton) {
            actions.appendChild(secondaryCopyButton);
        }
        actions.appendChild(copyButton);
        block.appendChild(valueNode);
        block.appendChild(actions);
        return block;
    }
    var CreditCardRenderWidget = (function (_super) {
        __extends(CreditCardRenderWidget, _super);
        function CreditCardRenderWidget() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CreditCardRenderWidget.prototype.copyToClipboard = function (value) {
            this.dispatchEvent({ type: "tm-copy-to-clipboard", param: value || "" });
        };
        CreditCardRenderWidget.prototype.render = function (parent, nextSibling) {
            var _this = this;
            this.parentDomNode = parent;
            this.computeAttributes();
            var card = this.getAttribute("card", "");
            var date = this.getAttribute("date", "");
            var cvc = this.getAttribute("cvc", "");
            var root = document.createElement("div");
            root.style.display = "inline-block";
            root.style.width = "320px";
            root.style.maxWidth = "100%";
            root.style.aspectRatio = "1.586";
            root.style.padding = "14px 16px";
            root.style.borderRadius = "12px";
            root.style.background = "linear-gradient(135deg,#243b55 0%,#141e30 100%)";
            root.style.color = "#fff";
            root.style.boxSizing = "border-box";
            root.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
            root.style.display = "flex";
            root.style.flexDirection = "column";
            var chip = document.createElement("div");
            chip.style.width = "36px";
            chip.style.height = "28px";
            chip.style.borderRadius = "6px";
            chip.style.background = "linear-gradient(160deg,#d4af37,#f4e18a)";
            chip.style.marginBottom = "14px";
            root.appendChild(chip);
            var expText = normalizeDate(date);
            var cvcText = cvc || "";
            root.appendChild(createSensitiveBlock({
                hiddenText: maskCardNumber(card),
                shownText: card || "",
                copyValue: card || "",
                valueStyle: "".concat(VALUE_STYLE, "font-size:20px;letter-spacing:1px;"),
                setValue: function (valueNode, shown) { return renderCardNumberValue(valueNode, card, shown); },
                onCopy: function (value) { return _this.copyToClipboard(value); }
            }));
            var metaRow = document.createElement("div");
            metaRow.style.display = "flex";
            metaRow.style.gap = "12px";
            metaRow.style.marginBottom = "0";
            metaRow.appendChild(createSensitiveBlock({
                hiddenText: "EXP **/**",
                shownText: "EXP ".concat(expText),
                copyValue: expText.replace(/\//g, ""),
                secondaryCopyLabel: "Co/py",
                secondaryCopyValue: expText,
                onCopy: function (value) { return _this.copyToClipboard(value); }
            }));
            metaRow.firstChild.style.flex = "1.35";
            metaRow.appendChild(createSensitiveBlock({
                hiddenText: "CVC ***",
                shownText: "CVC ".concat(cvcText || "***"),
                copyValue: cvcText,
                onCopy: function (value) { return _this.copyToClipboard(value); }
            }));
            metaRow.lastChild.style.flex = "0.85";
            root.appendChild(metaRow);
            this.domNodes.push(root);
            parent.insertBefore(root, nextSibling);
        };
        CreditCardRenderWidget.prototype.refresh = function (changedTiddlers) {
            if (this.computeAttributes()) {
                this.refreshSelf();
                return true;
            }
            return false;
        };
        return CreditCardRenderWidget;
    }(Widget));
    exports["credit-card-render"] = CreditCardRenderWidget;
})();

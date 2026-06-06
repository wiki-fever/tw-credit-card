declare const $tw: any;
declare const require: any;
declare const exports: any;

const WidgetModule = require("$:/core/modules/widgets/widget.js");

type WidgetBase = {
    parentDomNode: any;
    domNodes: any[];
    computeAttributes(): boolean;
    getAttribute(name: string, defaultValue?: string): string;
    dispatchEvent(event: { type: string; param?: string }): void;
    refreshSelf(): void;
};

const Widget: new (...args: any[]) => WidgetBase = WidgetModule.widget;

const VALUE_STYLE = "font-size:14px;letter-spacing:0.5px;";
const BUTTON_STYLE = "border:1px solid rgba(255,255,255,0.35);background:transparent;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px;";

function repeatChar(char: string, count: number): string {
    if (count <= 0) {
        return "";
    }

    return new Array(count + 1).join(char);
}

function maskCardNumber(input: string): string {
    const digits = (input || "").replace(/\D/g, "");
    if (!digits) {
        return "•••• •••• •••• ••••";
    }

    if (digits.length <= 8) {
        return digits;
    }

    const first4 = digits.slice(0, 4);
    const last4 = digits.slice(-4);
    const middleLength = Math.max(0, digits.length - 8);
    const middleMasked = repeatChar("•", middleLength);
    const groupedMiddle = middleMasked.replace(/(.{4})/g, "$1 ").trim();
    return `${first4} ${groupedMiddle} ${last4}`.replace(/\s+/g, " ").trim();
}

function normalizeDate(input: string): string {
    if (!input) {
        return "MM/YY";
    }

    const digits = input.replace(/\D/g, "");
    if (digits.length >= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }

    return input;
}

function createVisualGap(): HTMLSpanElement {
    const gap = document.createElement("span");
    gap.textContent = " ";
    gap.style.display = "inline-block";
    gap.style.width = "0.5em";
    gap.style.userSelect = "none";
    return gap;
}

function renderCardNumberValue(container: HTMLDivElement, input: string, shown: boolean): void {
    if (!shown) {
        container.textContent = maskCardNumber(input);
        return;
    }

    const digits = (input || "").replace(/\D/g, "");
    if (!digits) {
        container.textContent = "";
        return;
    }

    container.replaceChildren();

    digits.match(/.{1,4}/g)?.forEach((group, index, groups) => {
        const chunk = document.createElement("span");
        chunk.textContent = group;
        container.appendChild(chunk);

        if (index < groups.length - 1) {
            container.appendChild(createVisualGap());
        }
    });
}

function createButton(label: string, onClick: () => void, withMarginRight = false): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = withMarginRight ? `${BUTTON_STYLE}margin-right:6px;` : BUTTON_STYLE;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

function createSensitiveBlock(options: {
    hiddenText: string;
    shownText: string;
    copyValue: string;
    secondaryCopyLabel?: string;
    secondaryCopyValue?: string;
    valueStyle?: string;
    marginBottom?: string;
    setValue?: (valueNode: HTMLDivElement, shown: boolean) => void;
    onCopy: (value: string) => void;
}): HTMLDivElement {
    const block = document.createElement("div");
    block.style.flex = "1";
    block.style.marginBottom = options.marginBottom || "10px";

    const valueNode = document.createElement("div");
    valueNode.style.cssText = options.valueStyle || VALUE_STYLE;
    if (options.setValue) {
        options.setValue(valueNode, false);
    } else {
        valueNode.textContent = options.hiddenText;
    }
    valueNode.style.marginBottom = "6px";

    let shown = false;
    const actions = document.createElement("div");
    const toggleButton = createButton(
        "Show",
        () => {
            shown = !shown;
            if (options.setValue) {
                options.setValue(valueNode, shown);
            } else {
                valueNode.textContent = shown ? options.shownText : options.hiddenText;
            }
            toggleButton.textContent = shown ? "Hide" : "Show";
        },
        true
    );
    const copyButton = createButton("Copy", () => {
        options.onCopy(options.copyValue || "");
    });
    const secondaryCopyButton = options.secondaryCopyLabel
        ? createButton(options.secondaryCopyLabel, () => {
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

class CreditCardRenderWidget extends Widget {
    copyToClipboard(value: string) {
        this.dispatchEvent({ type: "tm-copy-to-clipboard", param: value || "" });
    }

    render(parent: any, nextSibling: any) {
        this.parentDomNode = parent;
        this.computeAttributes();

        const card = this.getAttribute("card", "");
        const date = this.getAttribute("date", "");
        const cvc = this.getAttribute("cvc", "");

        const root = document.createElement("div");
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

        const chip = document.createElement("div");
        chip.style.width = "36px";
        chip.style.height = "28px";
        chip.style.borderRadius = "6px";
        chip.style.background = "linear-gradient(160deg,#d4af37,#f4e18a)";
        chip.style.marginBottom = "14px";
        root.appendChild(chip);

        const expText = normalizeDate(date);
        const cvcText = cvc || "";

        root.appendChild(
            createSensitiveBlock({
                hiddenText: maskCardNumber(card),
                shownText: card || "",
                copyValue: card || "",
                valueStyle: `${VALUE_STYLE}font-size:20px;letter-spacing:1px;`,
                setValue: (valueNode, shown) => renderCardNumberValue(valueNode, card, shown),
                onCopy: (value) => this.copyToClipboard(value)
            })
        );

        const metaRow = document.createElement("div");
        metaRow.style.display = "flex";
        metaRow.style.gap = "12px";
        metaRow.style.marginBottom = "0";

        metaRow.appendChild(
            createSensitiveBlock({
                hiddenText: "EXP **/**",
                shownText: `EXP ${expText}`,
                copyValue: expText.replace(/\//g, ""),
                secondaryCopyLabel: "Co/py",
                secondaryCopyValue: expText,
                onCopy: (value) => this.copyToClipboard(value)
            })
        );
        (metaRow.firstChild as HTMLDivElement).style.flex = "1.35";

        metaRow.appendChild(
            createSensitiveBlock({
                hiddenText: "CVC ***",
                shownText: `CVC ${cvcText || "***"}`,
                copyValue: cvcText,
                onCopy: (value) => this.copyToClipboard(value)
            })
        );
        (metaRow.lastChild as HTMLDivElement).style.flex = "0.85";

        root.appendChild(metaRow);

        this.domNodes.push(root);
        parent.insertBefore(root, nextSibling);
    }

    refresh(changedTiddlers: any) {
        if (this.computeAttributes()) {
            this.refreshSelf();
            return true;
        }
        return false;
    }
}

(exports as Record<string, typeof CreditCardRenderWidget>)["credit-card-render"] = CreditCardRenderWidget;

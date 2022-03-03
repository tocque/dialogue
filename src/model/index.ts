import { getLineById, Line, LineData, RootLine } from "./line";

export class Model {

    readonly root: Line;

    constructor(data: LineData[] = []) {
        this.root = new RootLine(this, data);
    }

    appendNewLine(lineId: number) {
        const line = getLineById(lineId);
        const parent = line.parent;
        if (!parent) throw Error(`line ${ lineId} haven't been append`);
        const newLine = Line.newLine();
        parent.insertAfter(newLine, line);
        newLine.focus();
    }

    deleteLine(lineId: number) {
        const line = getLineById(lineId);
        if (!line.isDeletable()) {
            throw new Error("尝试删除不可删除的节点");
        }
        const parent = line.parent;
        if (!parent) throw Error(`line ${ lineId} haven't been append`);
        const nextFocus = line.previousSibling() || parent;
        parent.removeChild(line);
        nextFocus.focus();
    }
}

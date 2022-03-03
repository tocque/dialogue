import * as fs from "fs"
import * as path from "path"
import { Dialog } from ".";
import { logTree } from "./print-lezer-tree";

let caseDir = path.dirname(__dirname);

const input = fs.readFileSync(path.join(caseDir, "input.txt"), "utf8");

const tree = Dialog().language.parser.parse(input);
logTree(tree, input);

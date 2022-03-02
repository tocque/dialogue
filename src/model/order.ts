
export interface Param {
    type: "string" | "number" | string[];
    required: boolean | string;
    tooltip: string;
}

export interface NamedParam {
    name: string;
    tooltip: string;
    params: Param[];
}

export type OrderChildDeclaration
    = boolean
    | OrderDeclaration
    | OrderDeclaration[]
    ;

export interface OrderDeclaration {
    name: string;
    params: Param[];
    namedParams: NamedParam[];
    body: string;
    children: OrderChildDeclaration;
}



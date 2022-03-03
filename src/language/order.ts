import { Constraint } from "./constraint";

export interface Param {
    constraint: Constraint;
    /**
     * 参数是否可选，值为二元组
     * 第一个值代表是否可选
     * 当可选时，第二个值代表默认值
     * 当强制需要时，第二个值代表初始值
     */
    optional: [ boolean, string? ];
    label?: string;
    description?: string;
}

export interface NamedParam {
    name: string;
    params: Param[];
    label?: string;
    description?: string;
}

/**
 * false - 没有子节点
 * true - 自由挂载子节点
 * 
 */
export type OrderChildDefinition
    = boolean
    | OrderDefinition
    | OrderDefinition[]
    ;

export interface OrderDefinition {
    name: string;
    params: Param[];
    namedParams: Record<string, NamedParam>;
    children: OrderChildDefinition;
}

const OrderRegistry = new Map<string, OrderDefinition>();

export class OrderManager {

    static register(definition: OrderDefinition) {
        if (Array.isArray(definition.children)) {

        }
        OrderRegistry.set(definition.name, definition);
    }

    static get(name: string) {
        return OrderRegistry.get(name);
    }

    static list() {
        return [ ...OrderRegistry.keys() ];
    }
}

export function defineOrder(
    name: string,
    { params = [], namedParams = {}, children = false }: Partial<OrderDefinition> = {}
): OrderDefinition {
    return {
        name,
        params,
        namedParams,
        children,
    }
}

type ParamConfig = [
    constraint: Constraint | [ constraint: Constraint, initValue?: string ],
    tooltip?: string | [ label?: string, description?: string ]
];

/**
 * 定义参数列表
 * 对于一组参数，总有
 *  - 不可选参数在可选参数之前 
 */
export function defineParamList(required: ParamConfig[] = [], optional: ParamConfig[] = []) {
    const paramCreator = (optional: boolean) => {
        return ([ _constraint, tooltip = [] ]: ParamConfig): Param => {
            const [ constraint, initValue ] = [ _constraint ].flat() as [ Constraint, string? ];
            const [ label, description ] = [ tooltip ].flat() as [ string?, string? ];
            return {
                constraint,
                optional: [ optional, initValue ] as [ boolean, string? ],
                label,
                description,
            }
        }
    };
    return [
        ...required.map(paramCreator(false)),
        ...optional.map(paramCreator(true)),
    ];
}

type NamedParamConfig = [
    params: Param[],
    tooltip?: string | [ label?: string, description?: string ]
];

export function defineNamedParams(configs: Record<string, NamedParamConfig>): Record<string, NamedParam> {
    return Object.fromEntries(
        Object.entries(configs).map(([ name, [ params, tooltip ]]): [ string, NamedParam ] => {
            const [ label, description ] = [ tooltip ].flat() as [ string?, string? ];
            return [ name, {
                name,
                params,
                label,
                description,
            } ]
        })
    )
}

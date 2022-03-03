/**
 * @module language/constraint 处理参数约束的模块
 */

export enum ConstraintType {
    Free,
    Enum,
    Judge,
}

interface ConstraintBase {
    /** 约束的类型 */
    type: ConstraintType;
    /** 约束的标签 */
    label?: string;
    /** 约束的token，会影响其高亮 */
    token?: string;
}

/**
 * 无约束
 */
export interface FreeConstraint {
    type: ConstraintType.Free;
};

/**
 * 枚举类型的约束 要求类型必须属于给定的枚举
 */
export interface EnumConstraint extends ConstraintBase {
    type: ConstraintType.Enum;
    enumSet: string[];
    label?: string;
    token?: string;
};

export type Result = [ boolean, string? ];
export type RawResult = boolean | Result;

/**
 * 判别函数，返回值为一个boolean值，或者一个[boolean, string]二元组, 包含是否接受，以及其错误原因(可选)
 */
export type Judger = (value: string) => Result;
export type RawJudger = (value: string) => RawResult;

/**
 * 判别函数类型的约束 要求token能被判别函数接受
 */
export interface JudgeConstraint extends ConstraintBase {
    type: ConstraintType.Judge;
    judger: Judger;
};

export type Constraint
    = FreeConstraint
    | EnumConstraint
    | JudgeConstraint
    ;

function defineEnumConstraint(enumSet: string[], label?: string): EnumConstraint {
    return { type: ConstraintType.Enum, enumSet, label }
}

function judgerWrapper(judger: RawJudger): Judger {
    return (value: string) => {
        const rawResult = judger(value);
        if (Array.isArray(rawResult)) return rawResult;
        return [ rawResult ];
    }
}

function defineJudgeConstraint(judger: RawJudger, label?: string): JudgeConstraint {
    return { type: ConstraintType.Judge, judger: judgerWrapper(judger), label }
}

export function defineConstraint(type: ConstraintType.Enum, enumSet: string[], label?: string): EnumConstraint
export function defineConstraint(type: ConstraintType.Judge, judger: Judger, label?: string): JudgeConstraint
export function defineConstraint(type: ConstraintType, value?: string[] | RegExp | RawJudger, label?: string): Constraint {
    switch (type) {
        case ConstraintType.Free: return { type };
        case ConstraintType.Enum:
            if (!Array.isArray(value)) throw Error("");
            return defineEnumConstraint(value, label);
        case ConstraintType.Judge:
            if (typeof value !== "function") throw Error("");
            return defineJudgeConstraint(value, label);
    }
}

defineConstraint.enum = defineEnumConstraint;
defineConstraint.judger = defineJudgeConstraint;

const DecPattern = /^-?[1-9][0-9]*$/;
const HexPattern = /^-?0[xX][0-9a-fA-F]+$/;
const BinaryPattern = /^-?0[bB][0-1]+$/;
const FloatPattern = /^-?[0-9]+[eE][\-+]?[0-9]+$/;
const FloatPattern2 = /^-?[0-9]*\.[0-9]+([eE][\-+]?[0-9]+)?$/;

const isInt = (value: string) => {
    if (value === "0") return true;
    if (DecPattern.test(value)) return true;
    if (BinaryPattern.test(value)) return true;
    if (HexPattern.test(value)) return true;
    return false;
}

const isNumber = (value: string) => {
    if (isInt(value)) return true;
    if (FloatPattern.test(value)) return true;
    if (FloatPattern2.test(value)) return true;
    return false;
}

export const constraintPreset = {
    Free: { type: ConstraintType.Free } as FreeConstraint,
    /**
     * 整数类型的参数限制
     * 支持2进制和16进制形式
     * 特别的，不允许前导零，因为这会混淆十进制和八进制
     */
    Int: defineJudgeConstraint(isInt, "整数"),
    /**
     * 带范围限制的整数
     * @param min 
     * @param max 
     * @param label 标签，默认为[min-max]
     */
    RangeInt: (min: number, max: number, label?: string) => (
        defineJudgeConstraint((value: string) => {
            if (!isInt(value)) return [ false, "不是整数" ];
            const num = Number.parseInt(value);
            if (num < min) return [ false, `小于${ min }` ];
            if (num > max) return [ false, `大于${ max }` ];
            return true;
        }, label ?? `[${ min } - ${ max }]`)
    ),
    NonnegativeInt: defineJudgeConstraint((value: string) => {
        if (!isInt(value)) return [ false, "不是整数" ];
        const num = Number.parseInt(value);
        if (num < 0) return [ false, `是负数` ];
        return true;
    }, `非负整数`),
    /**
     * 数字类型的参数限制
     * 在整数的基础上支持浮点数
     * 特别的，不允许前导零，因为这会混淆十进制和八进制
     */
    Number: defineJudgeConstraint(isNumber, "数字"),
    /**
     * 带范围限制的数字
     * @param min 
     * @param max 
     * @param label 标签，默认为[min-max]
     */
    RangeNumber: (min: number, max: number, label?: string) => (
        defineJudgeConstraint((value: string) => {
            if (!isNumber(value)) return [ false, "不是数字" ];
            const num = Number.parseInt(value);
            if (num < min) return [ false, `小于${ min }` ];
            if (num > max) return [ false, `大于${ max }` ];
            return true;
        }, label ?? `[${ min } - ${ max }]`)
    ),
    /**
     * 正则表达式类型的约束，要求参数值被指定的正则表达式匹配
     * @param pattern 正则表达式
     * @param label 标签，默认为正则表达式本身
     */
    RegExp: (pattern: RegExp, label?: string) => {
        defineJudgeConstraint((value: string) => {
            if (pattern.test(value)) return false;
            return true;
        }, label ?? pattern.toString());
    }
}

/**
 * 打印枚举
 */
function printEnum(enumSet: string[]) {
    return `[${ enumSet.join(",") }]`;
}

/**
 * 检查一个值是否符合某个约束
 */
export function checkConstraint(value: string, constraint: Constraint): Result {
    switch (constraint.type) {
        case ConstraintType.Free: return [ true ];
        case ConstraintType.Enum:
            const { enumSet, label } = constraint;
            const inSet = enumSet.includes(value);
            if (inSet) return [ true ];
            return [ false, `不属于${ label ?? printEnum(enumSet) }` ];
        case ConstraintType.Judge: return constraint.judger(value);
    }
}

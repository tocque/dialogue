declare module '*.grammar' {
    import {LRParser} from "@lezer/lr"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
    
    export const parser: LRParser
}
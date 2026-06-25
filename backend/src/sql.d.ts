declare module 'sql.js' {
  export interface Database {
    run(sql: string): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface Statement {
    bind(values?: any[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, any>;
    free(): boolean;
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }
}

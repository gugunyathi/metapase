declare module '@ag-grid-community/core' {
  export interface ColDef<TData = any> {
    field?: string;
    headerName?: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    flex?: number;
    sortable?: boolean;
    filter?: boolean | string;
    resizable?: boolean;
    pinned?: 'left' | 'right' | boolean;
    cellRenderer?: any;
    valueFormatter?: (params: ValueFormatterParams) => any;
    [key: string]: any;
  }
  export interface ValueFormatterParams<TData = any, TValue = any> {
    value: TValue;
    data: TData;
    node: any;
    colDef: ColDef<TData>;
  }
  export interface ICellRendererParams<TData = any, TValue = any> {
    value: TValue;
    data: TData;
    node: any;
    colDef: ColDef<TData>;
    api: any;
  }
  export class ModuleRegistry {
    static registerModules(modules: any[]): void;
  }
}

declare module '@ag-grid-community/react' {
  import React from 'react';
  export interface AgGridReactProps {
    rowData?: any[];
    columnDefs?: any[];
    modules?: any[];
    defaultColDef?: any;
    animateRows?: boolean;
    theme?: string;
    onGridReady?: (params: any) => void;
    [key: string]: any;
  }
  export class AgGridReact extends React.Component<AgGridReactProps> {}
}

declare module '@ag-grid-community/client-side-row-model' {
  export const ClientSideRowModelModule: any;
}

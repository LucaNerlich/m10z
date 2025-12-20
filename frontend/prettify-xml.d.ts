declare module 'prettify-xml' {
  export type PrettifyXmlOptions = {
    indent?: number;
    newline?: string;
  };

  export default function prettifyXml(xml: string, options?: PrettifyXmlOptions): string;
}



import { Html, Head, Main, NextScript } from "next/document";
import { inter, dmSerif } from "@/lib/fonts";

export default function Document() {
  return (
    <Html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <Head />
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

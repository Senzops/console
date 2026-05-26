import { Html, Head, Main, NextScript } from "next/document";
import { inter, dmSerif } from "@/lib/fonts";

const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('sys-theme');
    var d = document.documentElement;
    if (t) {
      d.setAttribute('data-theme', t);
      if (t === 'light' || t === 'latte') d.classList.remove('dark');
      else d.classList.add('dark');
    } else {
      d.classList.add('dark');
    }
  } catch(e) {
    d.classList.add('dark');
  }
})();
`;

export default function Document() {
  return (
    <Html lang="en" className={`${inter.variable} ${dmSerif.variable} dark`}>
      <Head />
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

'use client';

import Script from 'next/script';

const SMARTSUPP_KEY =
  process.env.NEXT_PUBLIC_SMARTSUPP_KEY ?? '1656be0664d1be99885b8baefcf5aac611da3789';

/** Brand turquoise — matches --turquoise / brand-turquoise */
const CHAT_COLOR = '#3da8a0';

export default function SmartsuppChat() {
  return (
    <>
      <Script id="smartsupp-live-chat" strategy="afterInteractive">
        {`
          var _smartsupp = _smartsupp || {};
          _smartsupp.key = '${SMARTSUPP_KEY}';
          _smartsupp.color = '${CHAT_COLOR}';
          _smartsupp.orientation = 'right';
          _smartsupp.offsetY = window.matchMedia('(max-width: 767px)').matches ? 88 : 24;
          _smartsupp.offsetX = 16;
          window.smartsupp||(function(d) {
            var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
            s=d.getElementsByTagName('script')[0];c=d.createElement('script');
            c.type='text/javascript';c.charset='utf-8';c.async=true;
            c.src='https://www.smartsuppchat.com/loader.js?';
            s.parentNode.insertBefore(c,s);
          })(document);
        `}
      </Script>
      <noscript>
        Powered by{' '}
        <a href="https://www.smartsupp.com" target="_blank" rel="noopener noreferrer">
          Smartsupp
        </a>
      </noscript>
    </>
  );
}
